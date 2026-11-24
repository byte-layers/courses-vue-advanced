import { onBeforeMount, onBeforeUpdate } from 'vue'

// Compteur de RENDUS, pour MESURER avant d'optimiser. Un « rendu » = une exécution de la fonction de rendu
// du composant (le premier à l'affichage, puis un à chaque mise à jour). Les compteurs sont dans une Map
// ordinaire, PAS dans un état réactif : compter ne doit pas provoquer de rendu.
const counts = new Map<string, number>()

function bump(name: string) {
  counts.set(name, (counts.get(name) ?? 0) + 1)
}

/** À appeler dans `setup()` : compte les rendus de ce composant sous `name`. Sans effet en production. */
export function useRenderCount(name: string) {
  if (!import.meta.env.DEV) return
  onBeforeMount(() => bump(name)) // rendu initial
  onBeforeUpdate(() => bump(name)) // chaque rendu suivant
}

/** { BidRow: 134, AuctionCard: 12, ... } */
export function getRenderCounts(): Record<string, number> {
  return Object.fromEntries(counts)
}

export function resetRenderCounts() {
  counts.clear()
}

// Dans la console du navigateur : `__renderCounts()` puis `__resetRenderCounts()` pour un nouveau relevé.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  Object.assign(window, { __renderCounts: getRenderCounts, __resetRenderCounts: resetRenderCounts })
}
