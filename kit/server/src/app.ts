// Assemble tout : serveur HTTP (API de repli + contrôle) et socket.io (enchères).
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/events.ts'
import { AuctionEngine } from './auctions.ts'
import { makeAuth } from './auth.ts'
import { Bots } from './bots.ts'
import { readConfig, type Config } from './config.ts'
import { cartsAdd, productsRoute, products } from './dummyjson.ts'

type Reply = { status: number; body: unknown }

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

export async function startServer(overrides: Partial<Config> = {}) {
  const cfg = { ...readConfig(), ...overrides }
  const auth = makeAuth({ tokenTtlSeconds: cfg.tokenTtlSeconds, ttlFromEnv: process.env.TOKEN_TTL_SECONDS !== undefined || 'tokenTtlSeconds' in overrides })

  const httpServer = createServer((req, res) => {
    handle(req, res).catch((err) => send(res, { status: err instanceof SyntaxError ? 400 : 500, body: { message: String(err.message) } }))
  })

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: cfg.corsOrigins },
  })

  // --- Gel (« stall ») : POST /control/stall. Pendant le gel le serveur ne traite plus les événements
  // entrants des sockets et ne diffuse plus rien : tout est mis en file, puis rejoué dans l'ordre à la fin.
  // La boucle d'événements n'est PAS bloquée : les ping/pong de socket.io (couche engine) continuent.
  let stalledUntil = 0
  let stallTimer: NodeJS.Timeout | undefined
  const queue: Array<() => void> = []
  const isStalled = () => Date.now() < stalledUntil
  /** Exécute `fn` tout de suite, ou à la fin du gel s'il y en a un (ordre d'arrivée conservé). */
  const defer = (fn: () => void) => {
    if (stallTimer) queue.push(fn)
    else fn()
  }
  function endStall() {
    stallTimer = undefined
    stalledUntil = 0
    while (queue.length > 0 && !stallTimer) queue.shift()!() // si un handler relance un gel, on s'arrête
  }
  function stall(ms: number) {
    if (stallTimer) clearTimeout(stallTimer)
    stalledUntil = Date.now() + ms
    stallTimer = setTimeout(endStall, ms)
    return stalledUntil
  }

  // Le moteur appelle ces écouteurs ; on diffuse à la room de l'enchère.
  const room = (productId: number) => `auction:${productId}`
  const engine = new AuctionEngine(products, { durationSeconds: cfg.auctionDurationSeconds, step: cfg.bidStep }, {
    onBid: (bid) => defer(() => io.to(room(bid.productId)).emit('auction:bid', bid)),
    onClosed: (state) => defer(() => io.to(room(state.productId)).emit('auction:closed', state)),
  })
  const bots = new Bots(engine, cfg)

  io.on('connection', (socket) => {
    // À la connexion : l'heure du serveur (pour le décalage d'horloge) et la liste des enchères.
    socket.emit('server:time', Date.now())
    socket.emit('auction:list', engine.list())

    socket.on('auction:join', (productId, ack) =>
      defer(() => {
        const state = engine.auctions.get(productId) ?? null
        if (state) {
          socket.join(room(productId))
          socket.emit('auction:state', { ...state })
        }
        if (typeof ack === 'function') ack(state ? { ...state } : null)
      }),
    )
    socket.on('auction:leave', (productId) => defer(() => void socket.leave(room(productId))))
    socket.on('auction:bid', (payload, ack) =>
      defer(() => {
        const result = engine.bid(payload)
        if (typeof ack === 'function') ack(result)
      }),
    )
  })

  // L'horloge du serveur, toutes les 5 s à tous les clients connectés.
  const clock = setInterval(() => {
    if (!isStalled()) io.emit('server:time', Date.now())
  }, cfg.timeIntervalMs).unref()

  /** Remet les enchères à zéro et prévient tout le monde. */
  function reset(durationSeconds?: number) {
    engine.reset(durationSeconds)
    bots.stop()
    bots.restart()
    defer(() => {
      io.emit('auction:list', engine.list())
      for (const a of engine.list()) io.to(room(a.productId)).emit('auction:state', { ...a })
    })
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const origin = req.headers.origin
    if (origin && (cfg.corsOrigins.includes(origin) || cfg.corsOrigins.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    }
    if (req.method === 'OPTIONS') return void res.writeHead(204).end()

    const path = url.pathname
    const method = req.method
    const body = method === 'POST' ? await readJson(req) : {}
    const base = `http://${req.headers.host ?? `localhost:${cfg.port}`}`

    // --- API locale de repli (même forme que dummyjson.com)
    if (path.startsWith('/api/products') && method === 'GET') {
      return send(res, productsRoute(path.slice('/api/products'.length), url.searchParams, base))
    }
    if (path === '/api/auth/login' && method === 'POST') return send(res, auth.login(body))
    if (path === '/api/auth/refresh' && method === 'POST') return send(res, auth.refresh(body))
    if (path === '/api/auth/me' && method === 'GET') return send(res, auth.me(req.headers.authorization))
    if (path === '/api/carts/add' && method === 'POST') return send(res, cartsAdd(body))

    // --- Contrôle pour les démos et les tests
    if (path === '/health') return send(res, { status: 200, body: { status: 'ok', serverNow: Date.now(), uptime: process.uptime() } })
    if (path === '/control/state' && method === 'GET') {
      return send(res, {
        status: 200,
        body: { serverNow: Date.now(), clients: io.engine.clientsCount, bots: cfg.botsEnabled, botRate: cfg.botRate, auctions: engine.list() },
      })
    }
    if (path === '/control/bot-bid' && method === 'POST') {
      const { bidder, ack } = bots.bidNow(Number(body.productId), body.amount)
      return send(res, { status: ack.ok ? 200 : 409, body: { bidder, ack } })
    }
    if (path === '/control/close' && method === 'POST') {
      engine.close(Number(body.productId))
      return send(res, { status: 200, body: { auction: engine.auctions.get(Number(body.productId)) ?? null } })
    }
    if (path === '/control/reset' && method === 'POST') {
      reset(typeof body.durationSeconds === 'number' ? body.durationSeconds : undefined)
      return send(res, { status: 200, body: { ok: true, auctions: engine.list() } })
    }
    if (path === '/control/stall' && method === 'POST') {
      const asked = Number(body.ms)
      const ms = Number.isFinite(asked) && asked > 0 ? Math.min(asked, 30_000) : 8000
      return send(res, { status: 200, body: { stalledUntil: stall(ms) } })
    }
    if (path === '/control/drop-connection' && method === 'POST') {
      const n = io.engine.clientsCount
      if (body.hard) {
        io.disconnectSockets(true) // déconnexion « volontaire » du serveur : le client ne se reconnecte PAS seul
      } else {
        // Coupe le transport comme une panne réseau : socket.io-client se reconnecte tout seul.
        for (const s of io.sockets.sockets.values()) s.conn.close()
      }
      return send(res, { status: 200, body: { dropped: n, hard: !!body.hard } })
    }
    send(res, { status: 404, body: { message: 'Not found' } })
  }

  bots.start()
  await new Promise<void>((resolve) => httpServer.listen(cfg.port, resolve))
  const address = httpServer.address()
  const port = typeof address === 'object' && address ? address.port : cfg.port

  return {
    port,
    url: `http://localhost:${port}`,
    engine,
    io,
    async close() {
      clearInterval(clock)
      if (stallTimer) clearTimeout(stallTimer)
      queue.length = 0
      bots.stop()
      engine.reset() // annule les timers de fermeture
      await io.close()
      httpServer.closeAllConnections?.()
    },
  }
}

function send(res: ServerResponse, reply: Reply) {
  res.writeHead(reply.status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(reply.body))
}
