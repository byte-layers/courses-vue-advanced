<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import NotifyHost from '@/components/layout/NotifyHost.vue'
</script>

<template>
  <v-app>
    <AppHeader />
    <v-main>
      <v-container>
        <RouterView />
      </v-container>
    </v-main>
    <NotifyHost />
  </v-app>
</template>
