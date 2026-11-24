<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HttpError } from '@/api/http'
import { useAuthStore } from '../authStore'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Compte de démonstration publié par DummyJSON.
const username = ref('emilys')
const password = ref('emilyspass')
const error = ref<string | null>(null)
const submitting = ref(false)

/** On ne redirige que vers une adresse interne (pas de //autre-site). */
function target(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/products'
}

async function submit() {
  submitting.value = true
  error.value = null
  try {
    await auth.login(username.value, password.value)
    await router.push(target())
  } catch (e) {
    error.value =
      e instanceof HttpError && e.status === 400
        ? 'Identifiants invalides.'
        : 'Connexion impossible, réessayez.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section data-testid="login-page">
    <h1>Connexion</h1>
    <p>Compte de démonstration DummyJSON : <code>emilys</code> / <code>emilyspass</code>.</p>
    <v-form class="login-form" data-testid="login-form" @submit.prevent="submit">
      <v-text-field
        v-model="username"
        label="Identifiant"
        autocomplete="username"
        data-testid="login-username"
      />
      <v-text-field
        v-model="password"
        label="Mot de passe"
        type="password"
        autocomplete="current-password"
        data-testid="login-password"
      />
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4" data-testid="login-error">
        {{ error }}
      </v-alert>
      <v-btn type="submit" color="primary" :loading="submitting" data-testid="login-submit">
        Se connecter
      </v-btn>
    </v-form>
  </section>
</template>

<style scoped>
.login-form {
  max-width: 420px;
}
</style>
