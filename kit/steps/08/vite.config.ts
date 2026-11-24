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
    // Tests de TYPES (*.test-d.ts) : vérifiés par vue-tsc, jamais exécutés.
    typecheck: {
      enabled: true,
      checker: 'vue-tsc',
      include: ['src/**/*.test-d.ts'],
      tsconfig: './tsconfig.typetest.json',
    },
    setupFiles: ['src/test/setup.ts'],
    // `npm test -- --coverage` : rapport de couverture (V8). On ne mesure que le code de l'application.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test-d.ts', 'src/test/**', 'src/main.ts', 'src/shared/**'],
      reporter: ['text', 'html'],
    },
    // Vuetify embarque du CSS : Vitest doit le passer par Vite.
    server: { deps: { inline: ['vuetify'] } },
  },
})
