// Point d'entrée : npm start.
import { startServer } from './app.ts'

const server = await startServer()
console.log(`Serveur du lab sur http://localhost:${server.port}`)
console.log(`  socket.io      http://localhost:${server.port}`)
console.log(`  API de repli   http://localhost:${server.port}/api/products`)
console.log(`  contrôle       http://localhost:${server.port}/control/state`)
console.log(`  ${server.engine.list().length} enchères ouvertes, bots ${process.env.BOTS === 'off' ? 'désactivés' : 'actifs'}${process.env.BOT_RATE ? `, ticker rapide ${process.env.BOT_RATE}/s` : ''}`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await server.close()
    process.exit(0)
  })
}
