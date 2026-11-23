// Imite les routes DummyJSON utilisées par l'application, à partir de data/products.json.
import { readFileSync } from 'node:fs'

export const products: any[] = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf8')).products

type Result = { status: number; body: unknown }

const notFound = (id: string): Result => ({ status: 404, body: { message: `Product with id '${id}' not found` } })

/** `select=title,price` : ne garde que ces champs (+ id, comme DummyJSON). */
function pick(p: any, select: string | null) {
  if (!select) return p
  const out: any = { id: p.id }
  for (const k of select.split(',')) if (k in p) out[k] = p[k]
  return out
}

/** limit / skip / select / sortBy / order appliqués à une liste de produits. */
function page(list: any[], q: URLSearchParams): Result {
  const sortBy = q.get('sortBy')
  let rows = [...list]
  if (sortBy) {
    const dir = q.get('order') === 'desc' ? -1 : 1
    rows.sort((a, b) => {
      const x = a[sortBy]
      const y = b[sortBy]
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir
    })
  }
  const total = rows.length
  const skip = parseInt(q.get('skip') ?? '0', 10)
  const limit = parseInt(q.get('limit') ?? '30', 10)
  // Mêmes refus que DummyJSON pour un limit/skip négatif ou illisible.
  for (const [name, v] of [['limit', limit], ['skip', skip]] as const) {
    if (Number.isNaN(v) || v < 0) return { status: 400, body: { message: `Invalid '${name}' - should be a positive number` } }
  }
  rows = rows.slice(skip, limit === 0 ? undefined : skip + limit)
  return { status: 200, body: { products: rows.map((p) => pick(p, q.get('select'))), total, skip, limit: rows.length } }
}

const categories = [...new Set(products.map((p) => p.category))].sort()
const titleCase = (slug: string) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

/** `path` est ce qui suit /api/products (ex. "", "/search", "/42"). `base` sert aux url des catégories. */
export function productsRoute(path: string, q: URLSearchParams, base: string): Result {
  if (path === '' || path === '/') return page(products, q)
  if (path === '/search') {
    const needle = (q.get('q') ?? '').toLowerCase()
    // DummyJSON cherche dans le titre et la description seulement.
    const hit = (p: any) => [p.title, p.description].some((v) => String(v).toLowerCase().includes(needle))
    return page(products.filter(hit), q)
  }
  if (path === '/categories') {
    return { status: 200, body: categories.map((slug) => ({ slug, name: titleCase(slug), url: `${base}/api/products/category/${slug}` })) }
  }
  if (path === '/category-list') return { status: 200, body: categories }
  if (path.startsWith('/category/')) return page(products.filter((p) => p.category === path.slice(10)), q)
  const id = path.slice(1)
  const p = products.find((x) => String(x.id) === id)
  return p ? { status: 200, body: pick(p, q.get('select')) } : notFound(id)
}

/** POST /carts/add : réponse simulée, rien n'est enregistré (comme DummyJSON). */
export function cartsAdd(body: any): Result {
  if (!body?.userId) return { status: 400, body: { message: 'User id is required' } }
  if (!Array.isArray(body.products) || body.products.length === 0) return { status: 400, body: { message: 'products can not be empty' } }
  const lines = []
  for (const item of body.products) {
    const p = products.find((x) => x.id === item.id)
    if (!p) return notFound(String(item.id))
    const quantity = Number(item.quantity) || 1
    const total = Math.round(p.price * quantity * 100) / 100
    lines.push({
      id: p.id,
      title: p.title,
      price: p.price,
      quantity,
      total,
      discountPercentage: p.discountPercentage,
      discountedPrice: Math.round(total * (1 - p.discountPercentage / 100)),
      thumbnail: p.thumbnail,
    })
  }
  return {
    status: 201,
    body: {
      id: 209,
      products: lines,
      total: lines.reduce((s, l) => s + l.total, 0),
      discountedTotal: lines.reduce((s, l) => s + l.discountedPrice, 0),
      userId: body.userId,
      totalProducts: lines.length,
      totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    },
  }
}
