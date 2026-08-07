<script setup lang="ts">
// Room waiting page — player slots, ready/start, chat.
const route = useRoute()
const roomId = computed(() => route.params.id as string)
</script>

<template>
  <main>
    <h1>Room {{ roomId }}</h1>
    <p>玩家格（4 格，含房主標示）</p>
   <p>準備 / 開始遊戲按鈕</p>
   <p>聊天室（Socket.io `client:send_message` / `server:chat_message`）</p>
  </main>
</template>
