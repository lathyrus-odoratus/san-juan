<script setup lang="ts">
import { computed } from 'vue'
import packageInfo from '~~/package.json'

const appVersion = computed(() => `v${packageInfo.version ?? '0.0.0-dev'}`)
</script>

<template>
  <footer class="app-footer">
    <slot />
    <span class="app-footer__version">{{ appVersion }}</span>
  </footer>
</template>

<style scoped>
.app-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: #526253;
  font-size: 0.82rem;
  font-weight: 700;
}

.app-footer__version {
  white-space: nowrap;
}
</style>
