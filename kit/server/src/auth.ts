// Faux comptes DummyJSON avec de vrais JWT HS256 signés localement :
// un apprenant peut décoder le jeton et lire `exp`. Le secret n'a aucune valeur.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'

const users: any[] = JSON.parse(readFileSync(new URL('../data/users.json', import.meta.url), 'utf8')).users

const ACCESS_SECRET = 'lab-vue-advanced-access'
const REFRESH_SECRET = 'lab-vue-advanced-refresh' // secret différent : un accessToken n'est pas un refreshToken
const REFRESH_TTL_SECONDS = 30 * 24 * 3600

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')

function sign(payload: object, secret: string) {
  const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`
  return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`
}

export type TokenCheck = { ok: true; payload: any } | { ok: false; reason: 'missing' | 'expired' | 'invalid' }

export function verify(token: string | undefined, secret: string): TokenCheck {
  if (!token) return { ok: false, reason: 'missing' }
  const [h, p, s] = token.split('.')
  if (!h || !p || !s) return { ok: false, reason: 'invalid' }
  const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest()
  const given = Buffer.from(s, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'invalid' }
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
  if (payload.exp * 1000 <= Date.now()) return { ok: false, reason: 'expired' }
  return { ok: true, payload }
}

const publicFields = (u: any) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  gender: u.gender,
  image: u.image,
})

function tokensFor(u: any, accessTtl: number) {
  const claims = publicFields(u)
  const iat = Math.floor(Date.now() / 1000)
  return {
    accessToken: sign({ ...claims, iat, exp: iat + accessTtl }, ACCESS_SECRET),
    refreshToken: sign({ ...claims, iat, exp: iat + REFRESH_TTL_SECONDS }, REFRESH_SECRET),
  }
}

/** Durée de l'accessToken : TOKEN_TTL_SECONDS s'il est fixé, sinon expiresInMins du corps, sinon 60 s. */
export function makeAuth(opts: { tokenTtlSeconds: number; ttlFromEnv: boolean }) {
  const ttl = (expiresInMins?: unknown) =>
    !opts.ttlFromEnv && typeof expiresInMins === 'number' && expiresInMins > 0 ? expiresInMins * 60 : opts.tokenTtlSeconds

  return {
    login(body: any) {
      if (!body?.username || !body?.password) return { status: 400, body: { message: 'Username and password required' } }
      const u = users.find((x) => x.username === body.username && x.password === body.password)
      if (!u) return { status: 400, body: { message: 'Invalid credentials' } }
      return { status: 200, body: { ...tokensFor(u, ttl(body.expiresInMins)), ...publicFields(u) } }
    },
    refresh(body: any) {
      const check = verify(body?.refreshToken, REFRESH_SECRET)
      if (!check.ok) return { status: 403, body: { message: 'Invalid refresh token' } }
      const u = users.find((x) => x.id === check.payload.id)
      if (!u) return { status: 403, body: { message: 'Invalid refresh token' } }
      return { status: 200, body: tokensFor(u, ttl(body.expiresInMins)) }
    },
    me(authorization: string | undefined) {
      const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
      const check = verify(token, ACCESS_SECRET)
      if (!check.ok) {
        const message = { missing: 'Access Token is required', expired: 'Token Expired!', invalid: 'Invalid/Expired Token!' }[check.reason]
        return { status: 401, body: { message } }
      }
      return { status: 200, body: users.find((x) => x.id === check.payload.id) }
    },
  }
}
