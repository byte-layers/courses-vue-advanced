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
          <!--
            KeepAlive : le catalogue garde son état (recherche, catégorie, page) quand on va voir les enchères
            et qu'on revient. `include` désigne les composants par leur NOM (celui du fichier, ici ProductListPage).
          -->
          <RouterView v-slot="{ Component }">
            <KeepAlive include="ProductListPage">
              <component :is="Component" />
            </KeepAlive>
          </RouterView>
        </ErrorBoundary>
      </v-container>
    </v-main>
    <NotifyHost />
    <!-- Cible des modales (Teleport) : DANS v-app, pour garder le thème Vuetify. -->
    <div id="modals" />
  </v-app>
</template>
