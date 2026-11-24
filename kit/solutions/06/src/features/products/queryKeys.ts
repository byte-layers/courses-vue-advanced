/** Fabrique de clés : toutes les clés du catalogue au même endroit, de la plus large à la plus fine. */
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: { page: number; pageSize: number; search: string; category: string | null }) =>
    [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
}
