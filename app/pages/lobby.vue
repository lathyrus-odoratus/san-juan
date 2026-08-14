<script setup lang="ts">
import { useRoom } from '../composables/useRoom';
import type { RoomVisibility } from '~~/types/room'

const { rooms, fetchRooms, createRoom, joinRoom } = useRoom();

await useAsyncData('lobby-rooms', () => fetchRooms())

async function handleCreateRoom(visibility:RoomVisibility) {
  try {
    const room = await createRoom(visibility)
    // 建立成功後跳轉至房間等待室
    await navigateTo(`/room/${room.roomId}`)
  } catch (error) {
    console.error('建立房間失敗：', error)
  }
}

async function handleJoinRoom(code:string) {
  try {
    const room = await joinRoom(code);
    await navigateTo(`/room/${room.roomId}`)
  } catch (error) {
    console.error('加入房間失敗：', error)
  }
}
</script>

<template>
  <main>
    <h1>Lobby</h1>
    <h2>公開房間列表</h2>
    <ul v-if="rooms.length > 0">
      <li v-for="room in rooms" :key="room.roomId">
        <span>房間代碼：{{ room.roomCode }}</span>
        <span> ({{ room.players.length }}/{{ room.maxPlayers }}) </span>
        <span>狀態：{{ room.status }}</span>
        <button class="btn" @click="handleJoinRoom(room.roomCode)">加入房間</button>
      </li>
    </ul>
    <p v-else>目前沒有公開房間</p>
    <button class="btn" @click="handleCreateRoom('private')">建立私人房間</button>
    <button class="btn" @click="handleCreateRoom('public')">建立公開房間</button>
  </main>
</template>
