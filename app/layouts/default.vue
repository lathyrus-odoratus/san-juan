<script setup lang="ts">
// Default layout wrapper for all pages.
</script>

<template>
  <div class="layout">
    <AppHeader></AppHeader>
    <main class="container">
      <slot />
    </main>
  </div>
</template>
