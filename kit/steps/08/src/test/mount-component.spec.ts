import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { VBtn } from 'vuetify/components'
import { useCartStore } from '@/features/cart/cartStore'
import { useAuthStore } from '@/features/auth/authStore'
import { useAuctionSocket } from '@/features/auctions/useAuctionSocket'
import { useNotify } from '@/plugins/notify'
import { createFakeSocket } from './fake-socket'
import { mountWithApp } from './mount-component'

let cleanup: (() => void) | undefined
afterEach(() => {
  cleanup?.()
  cleanup = undefined
  document.body.innerHTML = ''
})

const Empty = defineComponent({ render: () => h('p', 'vide') })

describe('mountWithApp (le helper de test que vous écrivez)', () => {
  it('rend le composant et tout ce qu’il faut pour l’inspecter', async () => {
    const mounted = await mountWithApp(Empty)
    cleanup = mounted.unmount
    expect(mounted.wrapper.text()).toBe('vide')
    expect(mounted.router).toBeDefined()
    expect(mounted.pinia).toBeDefined()
    expect(mounted.queryClient).toBeDefined()
    expect(mounted.socket.socket).toBeDefined()
    expect(mounted.unmount).toBeTypeOf('function')
  })

  it('Vuetify est installé : un v-btn se rend avec ses classes', async () => {
    const Button = defineComponent({ render: () => h(VBtn, null, () => 'Ok') })
    const mounted = await mountWithApp(Button)
    cleanup = mounted.unmount
    expect(mounted.wrapper.find('.v-btn').exists()).toBe(true)
  })

  it('le routeur est le vrai, en mémoire : la route de départ est respectée', async () => {
    const mounted = await mountWithApp(Empty, { route: '/about' })
    cleanup = mounted.unmount
    expect(mounted.router.currentRoute.value.name).toBe('about')
  })

  it('la vraie garde est branchée : /account sans session renvoie vers la connexion', async () => {
    const mounted = await mountWithApp(Empty)
    cleanup = mounted.unmount
    await mounted.router.push('/account')
    expect(mounted.router.currentRoute.value.fullPath).toBe('/login?redirect=/account')
  })

  it('actions des stores : espionnées ET sans effet par défaut ; avec stubActions: false elles agissent', async () => {
    const mug = { id: 1, title: 'Mug', price: 10, thumbnail: 'm.png' }

    const stubbed = await mountWithApp(Empty)
    const stubbedCart = useCartStore(stubbed.pinia)
    stubbedCart.add(mug)
    expect(stubbedCart.add).toHaveBeenCalledWith(mug) // espionnée...
    expect(stubbedCart.items).toEqual([]) // ... mais elle n'a rien fait
    stubbed.unmount()

    const real = await mountWithApp(Empty, { stubActions: false })
    cleanup = real.unmount
    const realCart = useCartStore(real.pinia)
    realCart.add(mug)
    expect(realCart.items).toHaveLength(1) // la vraie action a joué
  })

  it('initialState remplit les stores avant le premier rendu', async () => {
    const mounted = await mountWithApp(Empty, {
      initialState: {
        cart: { items: [{ id: 1, title: 'Mug', price: 10, thumbnail: 'm.png', quantity: 2 }] },
      },
    })
    cleanup = mounted.unmount
    const cart = useCartStore(mounted.pinia)
    expect(cart.totalItems).toBe(2)
    expect(useAuthStore(mounted.pinia).isAuthenticated).toBe(false)
  })

  it('le faux socket est fourni à l’application (provide) et on peut en passer un à soi', async () => {
    const mine = createFakeSocket()
    const Connected = defineComponent({
      setup() {
        useAuctionSocket()
        return () => h('p', 'connecté')
      },
    })
    const mounted = await mountWithApp(Connected, { socket: mine })
    cleanup = mounted.unmount
    expect(mounted.socket).toBe(mine)
    expect(mine.connectCalls).toBe(1)
  })

  it('le plugin de notifications et la directive v-countdown sont installés', async () => {
    let notifyApi: ReturnType<typeof useNotify> | undefined
    const Probe = defineComponent({
      setup() {
        notifyApi = useNotify()
        return () => h('p', 'sonde')
      },
    })
    const mounted = await mountWithApp(Probe)
    cleanup = mounted.unmount
    expect(notifyApi).toBe(mounted.notify.api)
    expect(mounted.wrapper.vm.$.appContext.directives.countdown).toBeDefined()
  })
})
