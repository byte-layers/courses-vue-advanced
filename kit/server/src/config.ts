// Configuration lue dans les variables d'environnement (voir README.md).
// Les tests passent leur propre objet `env` pour ne rien dépendre du shell.
import { SOCKET_PORT } from '../../shared/events.ts'

export interface Config {
  port: number
  corsOrigins: string[]
  /** Durée d'une enchère, en secondes (réinitialisée à chaque reset). */
  auctionDurationSeconds: number
  /** Mise minimale au-dessus du prix courant, en euros. */
  bidStep: number
  botsEnabled: boolean
  /** Une surenchère de bot toutes les N ms (mode normal). */
  botIntervalMs: number
  /** > 0 : mode « ticker rapide », N mises à jour par seconde sur une enchère. */
  botRate: number
  botSeed: number
  /** Durée de vie de l'accessToken, en secondes. */
  tokenTtlSeconds: number
  /** Intervalle d'envoi de server:time, en ms. */
  timeIntervalMs: number
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback
}

export function readConfig(env: Record<string, string | undefined> = process.env): Config {
  return {
    port: num(env.SOCKET_PORT, SOCKET_PORT),
    corsOrigins: (env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()),
    auctionDurationSeconds: num(env.AUCTION_DURATION_SECONDS, 8 * 3600),
    bidStep: num(env.BID_STEP, 5),
    botsEnabled: (env.BOTS ?? 'on') !== 'off',
    botIntervalMs: num(env.BOT_INTERVAL_MS, 4000),
    botRate: num(env.BOT_RATE, 0),
    botSeed: num(env.BOT_SEED, 42),
    tokenTtlSeconds: num(env.TOKEN_TTL_SECONDS, 60),
    timeIntervalMs: num(env.TIME_INTERVAL_MS, 5000),
  }
}
