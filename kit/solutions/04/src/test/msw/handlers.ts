import { delay, http, HttpResponse } from 'msw'
import { API_URL } from '@/api/config'
import { catalog, categories } from '../fixtures'

/** Pagination à la DummyJSON : { products, total, skip, limit }. */
export function paginate(products: typeof catalog, url: URL) {
  const limit = Number(url.searchParams.get('limit') ?? 30)
  const skip = Number(url.searchParams.get('skip') ?? 0)
  return { products: products.slice(skip, skip + limit), total: products.length, skip, limit }
}

/**
 * Les handlers par défaut : un faux DummyJSON en mémoire.
 * Un test les adapte avec `server.use(...)` (ex. une réponse 500 ou une réponse lente).
 */
export const handlers = [
  http.get(`${API_URL}/products/search`, ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    return HttpResponse.json(
      paginate(
        catalog.filter((p) => p.title.toLowerCase().includes(q)),
        url,
      ),
    )
  }),
  http.get(`${API_URL}/products/categories`, () => HttpResponse.json(categories)),
  http.get(`${API_URL}/products/category/:slug`, ({ request, params }) =>
    HttpResponse.json(
      paginate(
        catalog.filter((p) => p.category === params.slug),
        new URL(request.url),
      ),
    ),
  ),
  http.get(`${API_URL}/products/:id`, ({ params }) => {
    const product = catalog.find((p) => p.id === Number(params.id))
    return product
      ? HttpResponse.json(product)
      : HttpResponse.json({ message: 'not found' }, { status: 404 })
  }),
  http.get(`${API_URL}/products`, ({ request }) =>
    HttpResponse.json(paginate(catalog, new URL(request.url))),
  ),
  // DummyJSON ne persiste rien : il renvoie un panier fictif.
  http.post(`${API_URL}/carts/add`, async ({ request }) => {
    const body = (await request.json()) as {
      userId: number
      products: { id: number; quantity: number }[]
    }
    await delay(20)
    return HttpResponse.json({
      id: 51,
      userId: body.userId,
      total: 0,
      discountedTotal: 0,
      totalProducts: body.products.length,
      totalQuantity: body.products.reduce((sum, p) => sum + p.quantity, 0),
      products: body.products.map((p) => ({
        ...p,
        title: 'x',
        price: 1,
        total: 1,
        discountPercentage: 0,
        discountedTotal: 1,
        thumbnail: '',
      })),
    })
  }),
]
