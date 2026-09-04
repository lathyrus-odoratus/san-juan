<script setup lang="ts">
// Game table page — board layout, hand, roles, onboarding.
const route = useRoute()
const router = useRouter()
const gameId = computed(() => route.params.id as string)
const isLeaveConfirmOpen = ref(false)

function requestLeaveGame(): void {
  isLeaveConfirmOpen.value = true
}

function cancelLeaveGame(): void {
  isLeaveConfirmOpen.value = false
}

async function confirmLeaveGame(): Promise<void> {
  const roomId = typeof route.query.roomId === 'string' ? route.query.roomId : null
  await router.push(roomId ? `/room/${roomId}` : '/lobby')
}
</script>

<template>
  <main class="game-page">
    <header class="game-page__header">
      <div>
        <p class="game-page__eyebrow">
          San Juan Online
        </p>
        <h1>Game {{ gameId }}</h1>
      </div>

      <button
        class="game-page__leave-button"
        type="button"
        @click="requestLeaveGame"
      >
        離開遊戲
      </button>
    </header>

    <section class="game-page__placeholder" aria-label="遊戲桌面">
      <p>遊戲流程初始化中</p>
    </section>

    <div
      v-if="isLeaveConfirmOpen"
      class="game-page__dialog-backdrop"
      role="presentation"
    >
      <section
        class="game-page__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-game-title"
      >
        <h2 id="leave-game-title">
          確認離開遊戲？
        </h2>
        <p>目前對局資料會保留，之後可以回到遊戲繼續。</p>
        <div class="game-page__dialog-actions">
          <button type="button" @click="cancelLeaveGame">
            取消
          </button>
          <button type="button" @click="confirmLeaveGame">
            確認離開
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.game-page {
  min-height: 100vh;
  padding: 24px;
  background: #f8fafc;
  color: #111827;
}

.game-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.game-page__eyebrow {
  margin: 0 0 4px;
  color: #475569;
  font-size: 0.875rem;
}

.game-page__leave-button,
.game-page__dialog-actions button {
  min-height: 40px;
  border: 1px solid #94a3b8;
  border-radius: 6px;
  padding: 8px 14px;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
}

.game-page__leave-button:hover,
.game-page__dialog-actions button:hover {
  background: #e2e8f0;
}

.game-page__placeholder {
  display: grid;
  min-height: 360px;
  place-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
}

.game-page__dialog-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(15 23 42 / 60%);
}

.game-page__dialog {
  width: min(100%, 420px);
  border-radius: 8px;
  padding: 24px;
  background: #ffffff;
  box-shadow: 0 20px 60px rgb(15 23 42 / 25%);
}

.game-page__dialog h2,
.game-page__dialog p {
  margin-top: 0;
}

.game-page__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
