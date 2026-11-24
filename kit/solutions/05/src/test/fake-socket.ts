import type { AuctionSocket } from '@/features/auctions/auctionSocket'
import type { ClientToServerEvents, ServerToClientEvents } from '@/shared/events'

type Handler = (...args: never[]) => void

/** Un événement émis par l'application vers le « serveur », avec de quoi répondre à son `ack`. */
export interface EmittedEvent {
  event: keyof ClientToServerEvents
  args: unknown[]
  /** Répond comme le serveur le ferait (l'application reçoit `(null, résultat)`). */
  ack?: (result: unknown) => void
  /** Simule un délai dépassé : l'application reçoit `(Error)`. */
  timeout?: () => void
}

/**
 * Un FAUX socket pour les tests : il n'ouvre aucun port, garde la trace de ce que l'application
 * émet et laisse le test jouer le serveur (`serverEmit`, `simulateConnect`, `ack`...).
 * Il n'implémente que ce que l'application utilise ; `socket` est typé comme le vrai.
 */
export function createFakeSocket() {
  const listeners = new Map<string, Set<Handler>>()
  const emitted: EmittedEvent[] = []
  const state = { connected: false, connectCalls: 0, disconnectCalls: 0 }

  function fire(event: string, ...args: unknown[]) {
    for (const handler of [...(listeners.get(event) ?? [])]) (handler as (...a: unknown[]) => void)(...args)
  }

  function record(event: string, args: unknown[], viaTimeout: boolean) {
    const last = args[args.length - 1]
    const callback = typeof last === 'function' ? (last as (...a: unknown[]) => void) : undefined
    const entry: EmittedEvent = {
      event: event as keyof ClientToServerEvents,
      args: callback ? args.slice(0, -1) : args,
    }
    if (callback) {
      entry.ack = (result) => (viaTimeout ? callback(null, result) : callback(result))
      if (viaTimeout) entry.timeout = () => callback(new Error('operation has timed out'))
    }
    emitted.push(entry)
    return entry
  }

  const fake = {
    on(event: string, handler: Handler) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
      return fake
    },
    off(event: string, handler?: Handler) {
      if (handler) listeners.get(event)?.delete(handler)
      else listeners.delete(event)
      return fake
    },
    emit(event: string, ...args: unknown[]) {
      record(event, args, false)
      return true
    },
    timeout(_ms: number) {
      return { emit: (event: string, ...args: unknown[]) => void record(event, args, true) }
    },
    get connected() {
      return state.connected
    },
    connect() {
      state.connectCalls++
      return fake
    },
    disconnect() {
      state.disconnectCalls++
      if (state.connected) {
        state.connected = false
        fire('disconnect', 'io client disconnect')
      }
      return fake
    },
  }

  return {
    /** Le socket à donner à l'application (`useAuctionSocket({ socket })` ou `provide`). */
    socket: fake as unknown as AuctionSocket,
    /** Tout ce que l'application a émis, dans l'ordre. */
    emitted,
    get connectCalls() {
      return state.connectCalls
    },
    get disconnectCalls() {
      return state.disconnectCalls
    },
    /** Nombre d'écouteurs encore posés (0 après le démontage). */
    listenerCount(event?: string) {
      if (event) return listeners.get(event)?.size ?? 0
      return [...listeners.values()].reduce((sum, set) => sum + set.size, 0)
    },
    /** Le serveur envoie un événement à l'application. */
    serverEmit<E extends keyof ServerToClientEvents>(
      event: E,
      ...args: Parameters<ServerToClientEvents[E]>
    ) {
      fire(event, ...args)
    },
    /** Le socket vient de se connecter (aussi pour une RE-connexion). */
    simulateConnect() {
      state.connected = true
      fire('connect')
    },
    /** Le réseau tombe. */
    simulateDisconnect(reason = 'transport close') {
      state.connected = false
      fire('disconnect', reason)
    },
    simulateConnectError(message = 'xhr poll error') {
      fire('connect_error', new Error(message))
    },
    /** Les événements émis sous ce nom. */
    emittedOf(event: keyof ClientToServerEvents) {
      return emitted.filter((e) => e.event === event)
    },
    /** Le dernier événement émis sous ce nom (échoue si aucun). */
    last(event: keyof ClientToServerEvents): EmittedEvent {
      const found = emitted.filter((e) => e.event === event).at(-1)
      if (!found) throw new Error(`Aucun événement « ${event} » n'a été émis`)
      return found
    },
  }
}

export type FakeSocket = ReturnType<typeof createFakeSocket>
