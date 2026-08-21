<script setup lang="ts">
// Room waiting page — player slots, ready/start, chat.

const { currentRoom, chatMessages, socketErrors, getRoom, leaveRoom, setReady, startRoom, kickPlayer, sendMessage } = useRoom()
const { player } = useAuth()

const route = useRoute()
const roomId = computed(() => route.params.id as string)

// SSR 先取一次房間資料，之後由 Socket.io 的 server:room_updated 接手更新
await useAsyncData(`room-${roomId.value}`, () => getRoom(roomId.value))

const errorMessage = ref('')
const chatInput = ref('')

const players = computed(() => currentRoom.value?.players ?? [])
const maxPlayers = computed(() => currentRoom.value?.maxPlayers ?? 4)
const emptySlotCount = computed(() => Math.max(maxPlayers.value - players.value.length, 0))
const me = computed(() => players.value.find(roomPlayer => roomPlayer.discordId === player.value?.discordId) ?? null)
const isHost = computed(() => me.value?.isHost === true)
const isReady = computed(() => me.value?.isReady === true)
const isRoomFull = computed(() => players.value.length === maxPlayers.value)
const isEveryoneReady = computed(() => players.value.length > 0 && players.value.every(roomPlayer => roomPlayer.isReady))
const canStart = computed(() => isHost.value && isRoomFull.value && isEveryoneReady.value)

// 房主開始遊戲後，房內所有人都會收到 status=playing 的房間更新，一起進桌面
watch(
  () => [currentRoom.value?.status, currentRoom.value?.gameId] as const,
  ([status, gameId]) => {
    if (status === 'playing' && gameId) {
      void navigateTo(`/game/${gameId}`)
    }
  },
  { immediate: true }
)

// 被踢出或房主關閉房間時，currentRoom 會被清空
watch(currentRoom, (room, previousRoom) => {
  if (previousRoom && !room) {
    void navigateTo('/lobby')
  }
})

watch(socketErrors, (errors) => {
  const latestError = errors.at(-1)
  if (latestError) {
    errorMessage.value = latestError.message
  }
})

function formatTime(sentAt: number): string {
  return new Date(sentAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'statusMessage' in error) {
    const { statusMessage } = error as { statusMessage?: string }
    if (statusMessage) {
      return `${fallback}（${statusMessage}）`
    }
  }
  return fallback
}

async function handleLeaveRoom(): Promise<void> {
  try {
    await leaveRoom()
    await navigateTo('/lobby')
  }
  catch (error) {
    errorMessage.value = resolveErrorMessage(error, '離開房間失敗')
  }
}

async function handleKickPlayer(playerId: string): Promise<void> {
  try {
    await kickPlayer(playerId)
  }
  catch (error) {
    errorMessage.value = resolveErrorMessage(error, '踢出玩家失敗')
  }
}

async function handleToggleReady(): Promise<void> {
  try {
    await setReady(!isReady.value)
  }
  catch (error) {
    errorMessage.value = resolveErrorMessage(error, '切換準備狀態失敗')
  }
}

async function handleStartRoom(): Promise<void> {
  try {
    await startRoom()
  }
  catch (error) {
    errorMessage.value = resolveErrorMessage(error, '開始遊戲失敗')
  }
}

function handleSendMessage(): void {
  const content = chatInput.value.trim()
  if (!content) {
    return
  }

  sendMessage(content)
  chatInput.value = ''
}
</script>

<template>
  <main class="container py-4">
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1>房間等待室</h1>
        <p>房間碼：{{ currentRoom?.roomCode ?? roomId }}</p>
        <p>狀態：{{ currentRoom?.status ?? '載入中' }}</p>
      </div>
      <button class="btn" @click="handleLeaveRoom">
        ← 離開房間
      </button>
    </header>

    <p v-if="errorMessage" role="alert">
      {{ errorMessage }}
    </p>

    <div class="flex flex-wrap gap-4 mt-4">
      <!-- 玩家格 -->
      <section class="flex-1">
        <h2>玩家（{{ players.length }}/{{ maxPlayers }}）</h2>
        <ul class="grid grid-cols-2 gap-3 mt-2">
          <li
            v-for="roomPlayer in players"
            :key="roomPlayer.discordId"
            class="list-none p-3 border"
          >
            <p>{{ roomPlayer.username }}</p>
            <p>{{ roomPlayer.isHost ? '房主' : '玩家' }}</p>
            <p>{{ roomPlayer.isReady ? '✓ 已準備' : '未準備' }}</p>
            <button
              v-if="isHost && !roomPlayer.isHost"
              class="btn"
              @click="handleKickPlayer(roomPlayer.discordId)"
            >
              踢出
            </button>
          </li>
          <li
            v-for="emptySlot in emptySlotCount"
            :key="`empty-${emptySlot}`"
            class="list-none p-3 border"
          >
            <p>（空位）</p>
            <p>等待加入</p>
          </li>
        </ul>

        <!-- 操作按鈕 -->
        <div class="flex gap-3 mt-4">
          <button class="btn" @click="handleToggleReady">
            {{ isReady ? '取消準備' : '準備' }}
          </button>
          <button
            v-if="isHost"
            class="btn"
            :disabled="!canStart"
            @click="handleStartRoom"
          >
            ▶ 開始遊戲
          </button>
        </div>
        <p v-if="isHost && !canStart">
          需 {{ maxPlayers }} 人到齊且全員準備才可開始。
        </p>
      </section>

      <!-- 聊天室 -->
      <section class="w-full md:w-80">
        <h2>💬 聊天室</h2>
        <ul class="mt-2 h-64 overflow-y-auto border p-2">
          <li
            v-for="message in chatMessages"
            :key="`${message.playerId}-${message.sentAt}`"
            class="list-none"
          >
            <span>[{{ formatTime(message.sentAt) }}]</span>
            <strong>{{ message.username }}</strong>：{{ message.content }}
          </li>
          <li v-if="chatMessages.length === 0" class="list-none">
            還沒有人說話
          </li>
        </ul>
        <form class="flex gap-2 mt-2" @submit.prevent="handleSendMessage">
          <input
            v-model="chatInput"
            type="text"
            maxlength="200"
            placeholder="輸入訊息…"
            class="flex-1 p-1"
          >
          <button class="btn" type="submit">
            送出
          </button>
        </form>
      </section>
    </div>
  </main>
</template>
