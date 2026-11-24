import { describe, it } from 'vitest'
// À écrire : le parcours « enchère -> outbid -> rollback », page + modale + cache + store + faux socket ensemble.
//
// Outils : `mountWithApp(AuctionsPage, { route: '/auctions', stubActions: false })` ; sur `mounted.socket` :
//   `simulateConnect()`, `serverEmit('auction:list', makeAuctionList())`, `serverEmit('auction:bid', makeBid({...}))`,
//   `emittedOf('auction:bid')`, `last('auction:bid').ack?.({ ok: false, reason: 'outbid', price, version })`, `.timeout?.()`,
//   `simulateDisconnect()`. La modale est téléportée : cherchez-la dans `document.body` (`document.body.querySelector`).
// Attendez avec `await flushPromises()` ou `await vi.waitFor(() => expect(...))` (la modale est chargée à la demande).
// Le serveur est joué par VOTRE test : l'offre de l'autre arrive AVANT le refus (le vrai serveur traite dans l'ordre).
describe('parcours enchère', () => {
  it.todo('l’offre part avec la version vue, et le prix monte avant la réponse du serveur')
  it.todo('offre acceptée : le prix reste et l’historique affiche l’offre confirmée')
  it.todo('refus « too-low » : rollback du prix, message d’erreur')
  it.todo('outbid : l’offre de l’autre arrive d’abord, le refus ne la fait pas reculer')
  it.todo('une surenchère après ma prise de tête est annoncée (aria-live)')
  it.todo('délai dépassé : retour à l’état d’avant, message')
  it.todo('perte de connexion, reconnexion : enchères rejointes à nouveau, prix rattrapé')
  it.todo('enchère terminée par le serveur : plus d’offre possible')
})
