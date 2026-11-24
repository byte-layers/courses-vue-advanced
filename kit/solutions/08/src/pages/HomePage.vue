<script setup lang="ts">
import { ref } from 'vue'

// Vente flash fictive : se termine 10 minutes après l'ouverture de la page.
const flashEndsAt = ref(Date.now() + 10 * 60 * 1000)
</script>

<template>
  <section data-testid="home-page">
    <h1>Bienvenue dans la boutique</h1>
    <p>Un catalogue branché sur DummyJSON, un panier, et bientôt des enchères en direct.</p>
    <p>
      Vente flash, fin dans
      <strong v-countdown="{ endsAt: flashEndsAt }" data-testid="home-flash-countdown" />
    </p>
    <v-btn color="primary" to="/products" data-testid="home-cta">Voir le catalogue</v-btn>
  </section>
</template>
