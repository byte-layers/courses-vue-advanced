import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import vuetify from '@/plugins/vuetify'
import ProductGrid from './ProductGrid.vue'

interface Tag {
  id: number
  label: string
}
const tags: Tag[] = [
  { id: 1, label: 'Un' },
  { id: 2, label: 'Deux' },
  { id: 3, label: 'Trois' },
]

const mountGrid = (items: Tag[], slots = {}) =>
  mount(ProductGrid, {
    props: { items },
    slots: { item: `<template #item="{ item }">{{ item.label }}</template>`, ...slots },
    global: { plugins: [vuetify] },
  })

describe('ProductGrid', () => {
  it('affiche une cellule par élément, remplie par le slot « item »', () => {
    const wrapper = mountGrid(tags)
    const cells = wrapper.findAll('[data-testid="product-grid-cell"]')
    expect(cells.map((c) => c.text())).toEqual(['Un', 'Deux', 'Trois'])
  })

  it('le slot « item » reçoit l’élément ET son index', () => {
    const wrapper = mountGrid(tags, {
      item: `<template #item="{ item, index }">{{ index }}:{{ item.id }}</template>`,
    })
    expect(wrapper.findAll('[data-testid="product-grid-cell"]').map((c) => c.text())).toEqual([
      '0:1',
      '1:2',
      '2:3',
    ])
  })

  it('liste vide : le slot « empty », ou un texte par défaut', () => {
    expect(mountGrid([]).find('[data-testid="product-grid-empty"]').text()).toBe('Rien à afficher.')
    const custom = mountGrid([], { empty: '<template #empty>Aucun tag</template>' })
    expect(custom.find('[data-testid="product-grid-empty"]').text()).toBe('Aucun tag')
    expect(custom.findAll('[data-testid="product-grid-cell"]')).toHaveLength(0)
  })

  it('le slot « header » reçoit le nombre d’éléments', () => {
    const wrapper = mountGrid(tags, {
      header: '<template #header="{ count }"><h2>{{ count }} tags</h2></template>',
    })
    expect(wrapper.find('h2').text()).toBe('3 tags')
  })

  it('les cellules sont clées par `id` : réordonner déplace les éléments, ne les recrée pas', async () => {
    const wrapper = mountGrid(tags)
    const before = wrapper.findAll('[data-testid="product-grid-cell"]').map((c) => c.element)
    await wrapper.setProps({ items: [tags[2]!, tags[0]!, tags[1]!] })
    const after = wrapper.findAll('[data-testid="product-grid-cell"]').map((c) => c.element)
    expect(after).toEqual([before[2], before[0], before[1]])
  })

  it('les attributs passés au composant arrivent sur sa racine (data-testid, class)', () => {
    const wrapper = mount(ProductGrid, {
      props: { items: tags },
      attrs: { 'data-testid': 'product-list', class: 'opacity-60' },
      slots: { item: `<template #item="{ item }">{{ item.label }}</template>` },
      global: { plugins: [vuetify] },
    })
    expect(wrapper.attributes('data-testid')).toBe('product-list')
    expect(wrapper.classes()).toContain('opacity-60')
  })
})
