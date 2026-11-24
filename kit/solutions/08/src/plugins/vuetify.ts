import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { en, fr } from 'vuetify/locale'

// Les composants sont importés à la demande par vite-plugin-vuetify (autoImport).
// Les libellés internes de Vuetify (pagination, etc.) sont en français : c'est aussi ce que
// lisent les technologies d'assistance et les tests par rôle.
export default createVuetify({
  theme: { defaultTheme: 'light' },
  icons: { defaultSet: 'mdi' },
  locale: { locale: 'fr', fallback: 'en', messages: { fr, en } },
})
