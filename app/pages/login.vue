<script setup lang="ts">
// Login page — Discord OAuth2 entry point.
import { useAuth } from '../composables/useAuth';

const {login } = useAuth();


</script>

<template>
  <main>
    <h1>Login</h1>
    <button @click="login()" class="btn">Discord 登入</button>
  </main>
</template>
