<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import NotifyHost from '@/components/layout/NotifyHost.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'

const route = useRoute()
</script>

<template>
  <v-app>
    <AppHeader />
    <v-main>
      <v-container>
        <!-- Une page qui plante n'emporte pas l'en-tête : la frontière se réarme à chaque changement de route. -->
        <ErrorBoundary :reset-key="route.fullPath">
          <RouterView />
        </ErrorBoundary>
      </v-container>
    </v-main>
    <NotifyHost />
    <!-- Cible des modales (Teleport) : DANS v-app, pour garder le thème Vuetify. -->
    <div id="modals" />
  </v-app>
</template>
