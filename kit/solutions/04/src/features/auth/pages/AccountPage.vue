<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { http } from '@/api/http'
import { useAuthStore } from '../authStore'

interface Me {
  firstName: string
  lastName: string
  email: string
}

const auth = useAuthStore()
const me = ref<Me | null>(null)
const error = ref<string | null>(null)

async function load() {
  error.value = null
  try {
    me.value = await http.get<Me>('/auth/me') // Bearer ajouté par le client ; 401 -> renouvellement
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

// Démonstration : le jeton devient invalide, le rechargement déclenche un renouvellement discret.
async function expireThenReload() {
  auth.expireAccessToken()
  await load()
}

onMounted(load)
</script>

<template>
  <section data-testid="account-page">
    <h1>Mon compte</h1>
    <v-alert v-if="error" type="error" variant="tonal" data-testid="account-error">{{
      error
    }}</v-alert>
    <p v-else-if="me" data-testid="account-name">
      {{ me.firstName }} {{ me.lastName }} ({{ me.email }})
    </p>
    <div class="d-flex ga-2 mt-4">
      <v-btn variant="outlined" data-testid="account-reload" @click="load"
        >Recharger le profil</v-btn
      >
      <v-btn variant="outlined" data-testid="account-expire-token" @click="expireThenReload">
        Expirer le jeton (démo)
      </v-btn>
    </div>
  </section>
</template>
