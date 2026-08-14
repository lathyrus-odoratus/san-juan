<script setup lang="ts">
const { isLoggedIn, player, logout } = useAuth();
</script>

<template>
  <header class="container flex justify-between items-center p-2">
    <p class="text-2xl">聖胡安</p>
    <nav class="flex gap-2 justify-between items-center">
      <p v-if="isLoggedIn">歡迎 {{ player?.username }}</p>
      <button v-if="isLoggedIn" class="btn" @click="logout()">登出</button>
      <NuxtLink v-if="!isLoggedIn" to="/login" class="btn">登入</NuxtLink>
    </nav>
  </header>
</template>