<script setup lang="ts">
// Game table page — board layout, hand, roles, onboarding.
const route = useRoute()
const gameId = computed(() => route.params.id as string)
</script>

<template>
  <main>
    <h1>Game {{ gameId }}</h1>
  </main>
</template>
