import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    // Les tests visent toujours DummyJSON, même si .env.local pointe vers le serveur local.
    env: { VITE_API_URL: 'https://dummyjson.com' },
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test/setup.ts'],
    // Vuetify embarque du CSS : Vitest doit le passer par Vite.
    server: { deps: { inline: ['vuetify'] } },
  },
})
