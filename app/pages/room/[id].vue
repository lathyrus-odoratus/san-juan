<script setup lang="ts">
// Room waiting page — player slots, ready/start, chat.
const route = useRoute()
const roomId = computed(() => route.params.id as string)
</script>

<template>
  <main>
    <h1>Room {{ roomId }}</h1>
  </main>
</template>
