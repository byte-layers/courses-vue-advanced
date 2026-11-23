// Tests du serveur avec un vrai client socket.io-client (serveur lancé en mémoire, port libre).
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { io as connect, type Socket } from 'socket.io-client'
import type { AuctionState, BidAck, BidEvent, ClientToServerEvents, ServerToClientEvents } from '../../shared/events.ts'
import { startServer } from '../src/app.ts'

type Client = Socket<ServerToClientEvents, ClientToServerEvents>
// WebSocket seul : le transport « polling » garde un minuteur de 30 s côté serveur qui retarde l'arrêt des tests.
const opts = { transports: ['websocket' as const], reconnectionDelay: 50, reconnectionDelayMax: 100 }
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

let server: Awaited<ReturnType<typeof startServer>>
const clients: Client[] = []

/** Attend le prochain événement `name` sur un socket. */
function next<T>(socket: Client | Socket, name: string, ms = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout en attendant ${name}`)), ms)
    socket.once(name, (value: T) => {
      clearTimeout(timer)
      resolve(value)
    })
  })
}

async function client(): Promise<Client> {
  const s: Client = connect(server.url, opts)
  clients.push(s)
  await next(s, 'connect')
  return s
}

const bid = (s: Client, productId: number, amount: number, bidder: string, expectedVersion?: number) =>
  new Promise<BidAck>((resolve) => s.emit('auction:bid', { productId, amount, bidder, expectedVersion }, resolve))
const join = (s: Client, productId: number) =>
  new Promise<AuctionState | null>((resolve) => s.emit('auction:join', productId, resolve))
const post = (path: string, body: object = {}) =>
  fetch(server.url + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const IPHONE = 123 // prix de départ 450, pas 5

before(async () => {
  server = await startServer({ port: 0, botsEnabled: false, tokenTtlSeconds: 2, timeIntervalMs: 200, auctionDurationSeconds: 3600 })
})
after(async () => {
  clients.forEach((c) => c.disconnect())
  await server.close()
})

describe('enchères', () => {
  it('envoie server:time et auction:list à la connexion', async () => {
    const s: Client = connect(server.url, opts)
    clients.push(s)
    const [time, list] = await Promise.all([next<number>(s, 'server:time'), next<AuctionState[]>(s, 'auction:list')])
    assert.ok(Math.abs(time - Date.now()) < 2000)
    assert.equal(list.length, 5)
    assert.ok(list.every((a) => a.status === 'open' && a.version === 0 && a.leader === null && a.endsAt > Date.now()))
  })

  it('renvoie server:time toutes les 200 ms (réglé pour le test)', async () => {
    const s = await client()
    await next(s, 'server:time')
    await next(s, 'server:time')
  })

  it('accepte une enchère valide et la diffuse à la room', async () => {
    await post('/control/reset')
    const a = await client()
    const b = await client()
    await join(a, IPHONE)
    await join(b, IPHONE)
    const seen = next<BidEvent>(b, 'auction:bid')
    const ack = await bid(a, IPHONE, 500, 'alice')
    assert.deepEqual(ack, { ok: true, price: 500, version: 1 })
    const event = await seen
    assert.equal(event.bidder, 'alice')
    assert.equal(event.price, 500)
    assert.equal(event.version, 1)
  })

  it('refuse too-low : prix égal, inférieur ou sous le pas minimum', async () => {
    const s = await client()
    for (const amount of [500, 10, 502]) {
      const ack = await bid(s, IPHONE, amount, 'bob')
      assert.equal(ack.ok, false)
      assert.equal((ack as any).reason, 'too-low')
      assert.equal(ack.price, 500) // le refus renvoie le prix courant
      assert.equal(ack.version, 1)
    }
    assert.deepEqual(await bid(s, IPHONE, 505, 'bob'), { ok: true, price: 505, version: 2 })
  })

  it('refuse unknown-auction', async () => {
    const s = await client()
    const ack = await bid(s, 99999, 10, 'bob')
    assert.equal((ack as any).reason, 'unknown-auction')
  })

  it('deux clients : le second, avec une version périmée, reçoit outbid', async () => {
    await post('/control/reset')
    const a = await client()
    const b = await client()
    const stateA = await join(a, IPHONE)
    const stateB = await join(b, IPHONE)
    assert.equal(stateA?.version, 0)
    assert.equal(stateB?.version, 0)
    assert.equal((await bid(a, IPHONE, 460, 'alice', 0)).ok, true)
    const late = await bid(b, IPHONE, 470, 'bruno', 0) // bruno n'a pas vu l'offre d'alice
    assert.deepEqual(late, { ok: false, reason: 'outbid', price: 460, version: 1 })
    assert.equal((await bid(b, IPHONE, 470, 'bruno', 1)).ok, true) // avec la bonne version, ça passe
  })

  it('ferme à endsAt : auction:closed diffusé, puis closed en réponse', async () => {
    await post('/control/reset', { durationSeconds: 0.3 })
    const s = await client()
    const before = await join(s, IPHONE)
    assert.equal(before?.status, 'open')
    const closed = await next<AuctionState>(s, 'auction:closed')
    assert.equal(closed.status, 'closed')
    assert.equal(closed.productId, IPHONE)
    const ack = await bid(s, IPHONE, 9999, 'alice')
    assert.equal((ack as any).reason, 'closed')
  })

  it('reset : remet prix, version et statut à zéro et prévient les clients', async () => {
    const s = await client()
    await post('/control/reset') // retour à la durée longue
    await join(s, IPHONE)
    await bid(s, IPHONE, 480, 'alice')
    const list = next<AuctionState[]>(s, 'auction:list')
    const res = await post('/control/reset')
    assert.equal(res.status, 200)
    const after = (await list).find((a) => a.productId === IPHONE)!
    assert.deepEqual([after.price, after.version, after.leader, after.status], [450, 0, null, 'open'])
    assert.equal((await bid(s, IPHONE, 455, 'alice')).ok, true) // de nouveau ouverte
  })

  it('close à la main : /control/close', async () => {
    await post('/control/reset')
    const s = await client()
    await join(s, 78)
    const closed = next<AuctionState>(s, 'auction:closed')
    await post('/control/close', { productId: 78 })
    assert.equal((await closed).status, 'closed')
  })
})

describe('reconnexion', () => {
  it('drop-connection coupe le transport : le client se reconnecte seul et peut rejoindre', async () => {
    await post('/control/reset')
    const s = await client()
    await join(s, IPHONE)
    const reason = next<string>(s, 'disconnect')
    const res = await (await post('/control/drop-connection')).json()
    assert.ok(res.dropped >= 1)
    assert.equal(await reason, 'transport close')
    await next(s, 'connect') // reconnexion automatique
    const state = await join(s, IPHONE)
    assert.equal(state?.productId, IPHONE)
    assert.equal((await bid(s, IPHONE, 460, 'alice')).ok, true)
  })

  it('drop-connection {hard:true} : déconnexion volontaire, pas de reconnexion automatique', async () => {
    const s = await client()
    const reason = next<string>(s, 'disconnect')
    await post('/control/drop-connection', { hard: true })
    assert.equal(await reason, 'io server disconnect')
    await wait(400)
    assert.equal(s.connected, false)
    s.connect()
    await next(s, 'connect')
  })
})

describe('API locale de repli', () => {
  const get = (path: string, headers: Record<string, string> = {}) => fetch(server.url + path, { headers })

  it('GET /api/products : pagination, select, tri', async () => {
    const res = await get('/api/products?limit=3&skip=2&select=title,price&sortBy=price&order=desc')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.deepEqual(Object.keys(body), ['products', 'total', 'skip', 'limit'])
    assert.equal(body.total, 194)
    assert.equal(body.products.length, 3)
    assert.deepEqual(Object.keys(body.products[0]), ['id', 'title', 'price'])
    assert.ok(body.products[0].price >= body.products[1].price)
  })

  it('search, catégories, détail, 404', async () => {
    assert.equal((await (await get('/api/products/search?q=phone')).json()).total, 23)
    assert.equal((await (await get('/api/products/categories')).json())[0].slug, 'beauty')
    assert.equal((await (await get('/api/products/category/beauty')).json()).total, 5)
    assert.equal((await (await get('/api/products/1')).json()).title, 'Essence Mascara Lash Princess')
    const nf = await get('/api/products/9999')
    assert.equal(nf.status, 404)
    assert.deepEqual(await nf.json(), { message: "Product with id '9999' not found" })
  })

  it('POST /api/carts/add : réponse simulée, rien de persistant', async () => {
    const res = await post('/api/carts/add', { userId: 1, products: [{ id: 144, quantity: 4 }] })
    assert.equal(res.status, 201)
    const cart = await res.json()
    assert.equal(cart.totalQuantity, 4)
    assert.equal(cart.products[0].total, 179.96)
  })

  it('login → me → expiration (401) → refresh → me', async () => {
    const bad = await post('/api/auth/login', { username: 'emilys', password: 'nope' })
    assert.equal(bad.status, 400)

    const login = await (await post('/api/auth/login', { username: 'emilys', password: 'emilyspass' })).json()
    assert.deepEqual(Object.keys(login), ['accessToken', 'refreshToken', 'id', 'username', 'email', 'firstName', 'lastName', 'gender', 'image'])

    const noToken = await get('/api/auth/me')
    assert.equal(noToken.status, 401)
    assert.deepEqual(await noToken.json(), { message: 'Access Token is required' })

    const ok = await get('/api/auth/me', { Authorization: `Bearer ${login.accessToken}` })
    assert.equal(ok.status, 200)
    assert.equal((await ok.json()).username, 'emilys')

    await wait(2300) // TOKEN_TTL_SECONDS = 2 dans ce test
    const expired = await get('/api/auth/me', { Authorization: `Bearer ${login.accessToken}` })
    assert.equal(expired.status, 401)
    assert.deepEqual(await expired.json(), { message: 'Token Expired!' })

    assert.equal((await post('/api/auth/refresh', { refreshToken: login.accessToken })).status, 403) // pas un refreshToken
    const refreshed = await (await post('/api/auth/refresh', { refreshToken: login.refreshToken })).json()
    assert.deepEqual(Object.keys(refreshed), ['accessToken', 'refreshToken'])
    const again = await get('/api/auth/me', { Authorization: `Bearer ${refreshed.accessToken}` })
    assert.equal(again.status, 200)
  })

  it('GET /health et /control/state', async () => {
    assert.equal((await (await get('/health')).json()).status, 'ok')
    const state = await (await get('/control/state')).json()
    assert.equal(state.auctions.length, 5)
  })
})

describe('bots', () => {
  it('bot-bid : un bot enchérit tout de suite et le client le voit', async () => {
    await post('/control/reset')
    const s = await client()
    await join(s, IPHONE)
    const seen = next<BidEvent>(s, 'auction:bid')
    const res = await post('/control/bot-bid', { productId: IPHONE })
    assert.equal(res.status, 200)
    const event = await seen
    assert.match(event.bidder, /-bot$/)
    assert.ok(event.price > 450)
    // avec un montant précis
    const exact = await (await post('/control/bot-bid', { productId: IPHONE, amount: 700 })).json()
    assert.deepEqual(exact.ack, { ok: true, price: 700, version: 2 })
  })

  it('déterministes : même graine, mêmes enchérisseurs et mêmes montants', async () => {
    const run = async () => {
      const srv = await startServer({ port: 0, botsEnabled: false, botSeed: 7 })
      const out = []
      for (let i = 0; i < 6; i++) {
        const r = await fetch(srv.url + '/control/bot-bid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: IPHONE }) })
        out.push(await r.json())
      }
      await srv.close()
      return out
    }
    const a = await run()
    const b = await run()
    assert.deepEqual(a, b)
    assert.ok(new Set(a.map((x) => x.bidder)).size > 1)
  })

  it('mode normal : les bots surenchérissent seuls', async () => {
    const srv = await startServer({ port: 0, botsEnabled: true, botIntervalMs: 30 })
    await wait(400)
    const state = await (await fetch(srv.url + '/control/state')).json()
    assert.ok(state.auctions.some((a: AuctionState) => a.version > 3), 'des enchères ont avancé')
    await srv.close()
  })

  it('ticker rapide : BOT_RATE=20 donne environ 20 mises par seconde', async () => {
    const srv = await startServer({ port: 0, botsEnabled: true, botIntervalMs: 60_000, botRate: 20 })
    const s: Client = connect(srv.url, opts)
    clients.push(s)
    await next(s, 'connect')
    const first = await new Promise<AuctionState | null>((r) => s.emit('auction:join', 123, r))
    let count = 0
    s.on('auction:bid', () => count++)
    await wait(1000)
    assert.ok(count >= 12 && count <= 25, `mises reçues en 1 s : ${count}`)
    const last = (await (await fetch(srv.url + '/control/state')).json()).auctions[0]
    assert.ok(last.price > first!.price && last.price < first!.price + 1) // des centimes, pas des euros
    s.disconnect()
    await srv.close()
  })

  it('BOTS=off : personne ne mise', async () => {
    const srv = await startServer({ port: 0, botsEnabled: false, botIntervalMs: 10 })
    await wait(200)
    const state = await (await fetch(srv.url + '/control/state')).json()
    assert.ok(state.auctions.every((a: AuctionState) => a.version === 0))
    await srv.close()
  })
})
