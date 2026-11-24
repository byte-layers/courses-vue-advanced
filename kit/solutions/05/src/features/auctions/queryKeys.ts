/** Clés du cache pour les enchères : la liste des enchères, et l'historique des offres de chacune. */
export const auctionKeys = {
  all: ['auctions'] as const,
  list: () => [...auctionKeys.all, 'list'] as const,
  bids: (productId: number) => [...auctionKeys.all, 'bids', productId] as const,
}
