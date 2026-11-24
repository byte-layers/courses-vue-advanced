<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getRenderCounts, resetRenderCounts } from '@/lib/render-stats'

// Panneau de développement : relit les compteurs deux fois par seconde (on ne les rend pas réactifs).
const counts = ref<Record<string, number>>({})
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  const read = () => (counts.value = getRenderCounts())
  read()
  timer = setInterval(read, 500)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="render-stats text-caption" data-testid="render-count">
    <strong>Rendus (dev)</strong>
    <span v-for="(count, name) in counts" :key="name" :data-testid="`render-count-${name}`">
      {{ name }} : {{ count }}
    </span>
    <v-btn size="x-small" variant="text" data-testid="render-count-reset" @click="resetRenderCounts">
      remettre à zéro
    </v-btn>
  </div>
</template>

<style scoped>
.render-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 4px 8px;
  border: 1px dashed currentcolor;
  opacity: 0.8;
}
</style>
