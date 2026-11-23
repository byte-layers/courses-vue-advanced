// Regénère les instantanés de data/ depuis le vrai DummyJSON.
// - products.json : tous les produits (https://dummyjson.com/products?limit=0)
// - users.json    : les 10 premiers comptes (pour /api/auth/login et /api/auth/me)
import { writeFileSync } from 'node:fs'

async function save(url, file) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`DummyJSON a répondu ${res.status} pour ${url}`)
  const data = await res.json()
  writeFileSync(new URL(`../data/${file}`, import.meta.url), JSON.stringify(data, null, 1) + '\n')
  return data
}

const products = await save('https://dummyjson.com/products?limit=0', 'products.json')
console.log(`${products.products.length} produits enregistrés`)
const users = await save('https://dummyjson.com/users?limit=10', 'users.json')
console.log(`${users.users.length} comptes enregistrés`)
