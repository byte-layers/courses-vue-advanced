import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { createNotify } from './plugins/notify'
import { vCountdown } from './directives/countdown'
import { useAuthStore } from './features/auth/authStore'

const app = createApp(App)
const pinia = createPinia()
const notify = createNotify()

app.use(pinia).use(vuetify).use(notify).use(router)
app.directive('countdown', vCountdown)

// Session perdue (renouvellement impossible) : on prévient et on renvoie vers la connexion.
useAuthStore(pinia).onSessionExpired(() => {
  notify.api.notify('Session expirée, reconnectez-vous.', 'error')
  void router.push({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
})

app.mount('#app')
