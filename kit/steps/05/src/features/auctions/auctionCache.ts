/* eslint-disable @typescript-eslint/no-unused-vars -- squelette : supprimez cette ligne une fois le fichier écrit */
import type { AuctionState, BidEvent } from '@/shared/events'

/** Nombre d'offres gardées par enchère dans l'historique. */
export const HISTORY_LIMIT = 20

/**
 * TODO — Fonctions PURES qui disent comment un événement du serveur modifie le cache.
 * `useAuctionSocket` les passe à `queryClient.setQueryData(clé, (ancien) => applyX(ancien, événement))`.
 * Règle commune : ne jamais muter l'ancien tableau, et rendre le MÊME tableau quand rien ne change
 * (TanStack Query ne notifie pas si la référence est identique ; les autres enchères gardent la leur).
 */

/**
 * TODO — `auction:bid` : une offre acceptée.
 *  - met à jour `price`, `version` et `leader` (= `bid.bidder`) de l'enchère concernée ;
 *  - ignore l'offre si `bid.version <= version` connue (déjà vue, ou plus ancienne) ;
 *  - cache vide (`undefined`) ou enchère inconnue : rend `current` tel quel.
 */
export function applyBid(
  current: AuctionState[] | undefined,
  bid: BidEvent,
): AuctionState[] | undefined {
  throw new Error('À écrire')
}

/**
 * TODO — `auction:state` : l'état complet d'une enchère (réponse à un `join`, reset).
 *  - cache vide : `[state]` ; enchère inconnue : on l'ajoute à la fin ; sinon on la remplace ;
 *  - un état OUVERT dont la version est plus ancienne que celle qu'on connaît est ignoré (réponse en retard).
 */
export function applyState(
  current: AuctionState[] | undefined,
  state: AuctionState,
): AuctionState[] {
  throw new Error('À écrire')
}

/** TODO — `auction:closed` : la fermeture est définitive, elle remplace toujours l'état connu (ou l'ajoute). */
export function applyClosed(
  current: AuctionState[] | undefined,
  state: AuctionState,
): AuctionState[] {
  throw new Error('À écrire')
}

/**
 * TODO — Ajoute une offre EN TÊTE de l'historique (la plus récente en premier).
 * Pas de doublon (même `version` déjà présente : rendre le même tableau) ; au plus `HISTORY_LIMIT` offres.
 */
export function pushBid(history: BidEvent[] | undefined, bid: BidEvent): BidEvent[] {
  throw new Error('À écrire')
}
