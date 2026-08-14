<script setup lang="ts">
import { er } from 'vue-router/dist/index-BN0B0y8a.js';

// Room waiting page — player slots, ready/start, chat.

const { currentRoom, getRoom, leaveRoom, setReady, startRoom, kickPlayer, sendMessage } = useRoom();

const route = useRoute()
const roomId = computed(() => route.params.id as string)
// 有待釐清這句在幹嘛
await useAsyncData(`room-${roomId.value}`, () => getRoom(roomId.value))

async function handleLeaveRoom() {
  try {
    await leaveRoom()

    await navigateTo(`/lobby`)
  } catch (error) {
    console.error('離開失敗，你被困在這裡了哈哈哈', error)
  }
}

async function handleKickPlayer(playerId: string){
  try{
    await kickPlayer(playerId)
  }catch(error){
    console.error('踢出失敗，你怎麼這樣呀',error)
  }
}

async function handleReady(){
  try{

    await setReady()

  }catch(error){
    console.error('準備失敗，多吃點飯再來',error)
  }
}

</script>

<template>
  <main>
    <h1>Room {{ roomId }}</h1>

    <!-- 玩家卡片 -->
    <ul class="flex justify-between items-center">
      <li class="list-none p-3 border " v-for="player in currentRoom?.players" :key="player.discordId">
        <p>暱稱:{{player.username}}</p>
        <p>準備狀態:{{player.isReady}}</p>
        <p v-if="player.isHost">房主</p>
        <button class="btn" @click="handleKickPlayer(player.discordId)">踢出此玩家</button>
      </li>
    </ul>

    <!-- 操作按鈕 -->
    <ul class="flex justify-between">
      <li>
        <button class="btn" @click="handleReady()">準備</button>
      </li>
      <li>
        <button class="btn">開始(僅限房主)</button>
      </li>
      <li>
        <button class="btn" @click="handleLeaveRoom">離開房間</button>
      </li>
    </ul>

<!-- 聊天室 -->
    <h2>對話</h2>
    <p>A:...</p>
    <p>B:....</p>
    <form action="">
      <input type="text">
      <button>送出對話</button>
    </form>


  </main>
</template>
