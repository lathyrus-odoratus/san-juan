<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import GameActionLayer from '~~/app/components/game/GameActionLayer.vue'
import GameResultDialog from '~~/app/components/game/GameResultDialog.vue'
import GameTable from '~~/app/components/game/GameTable.vue'
import { useGame } from '~~/app/composables/useGame'
import { createDefaultSettings, PERSISTENCE_KEYS, usePersistence, type PlayerSettings } from '~~/app/composables/usePersistence'
import { describeTurn } from '~~/app/utils/gameView'

// Game table page: loads the server-authoritative game and routes player choices back to it.
const route = useRoute()
const router = useRouter()
const { player } = useAuth()
const persistence = usePersistence()

const gameId = computed(() => route.params.id as string)
const game = useGame(gameId)
const { snapshot, log, result, loadError, actionError, isLoading } = game
const viewerId = computed(() => player.value?.discordId ?? '')
const isLeaveConfirmOpen = ref(false)
const isSettingsOpen = ref(false)
const isResultOpen = ref(true)
const playerInfoMode = ref<'hover' | 'always'>('hover')
const buildingTextMode = ref<'compact' | 'detailed'>('detailed')

const guideEntries = computed(() => {
  if (!snapshot.value) {
    return []
  }

  // Newest first, so the latest move is always visible without scrolling.
  return [describeTurn(snapshot.value), ...log.value.slice(-12).reverse().map(entry => entry.message)]
})
const loadErrorMessage = computed(() => {
  switch (loadError.value) {
    case 'AUTH_ERROR':
      return '請先用 Discord 登入，才能進入牌局。'
    case 'GAME_ACCESS_DENIED':
      return '你不在這局遊戲中。'
    case 'GAME_NOT_FOUND':
      return '找不到這局遊戲。伺服器重新啟動後，進行中的牌局會消失，請回大廳重新開房。'
    case 'UNKNOWN':
      return '牌局載入失敗，請重新整理頁面。'
    default:
      return ''
  }
})

watch(() => snapshot.value?.phase, (phase) => {
  if (phase === 'GAME_END') {
    isResultOpen.value = true
  }
})

function requestLeaveGame(): void {
  isLeaveConfirmOpen.value = true
}

function cancelLeaveGame(): void {
  isLeaveConfirmOpen.value = false
}

async function confirmLeaveGame(): Promise<void> {
  const roomId = snapshot.value?.roomId || (typeof route.query.roomId === 'string' ? route.query.roomId : null)
  await router.push(roomId ? `/room/${roomId}` : '/lobby')
}

function toggleSettings(): void {
  isSettingsOpen.value = !isSettingsOpen.value
}

function setPlayerInfoMode(mode: 'hover' | 'always'): void {
  playerInfoMode.value = mode
  saveSettings()
}

function setBuildingTextMode(mode: 'compact' | 'detailed'): void {
  buildingTextMode.value = mode
  saveSettings()
}

function saveSettings(): void {
  persistence.save<PlayerSettings>(PERSISTENCE_KEYS.settings, {
    schemaVersion: 1,
    playerInfoMode: playerInfoMode.value,
    buildingTextMode: buildingTextMode.value
  })
}

onMounted(() => {
  const settings = persistence.load<PlayerSettings>(PERSISTENCE_KEYS.settings) ?? createDefaultSettings()
  playerInfoMode.value = settings.playerInfoMode
  buildingTextMode.value = settings.buildingTextMode
})
</script>

<template>
  <main class="game-table-page">
    <header class="game-table-page__header">
      <div>
        <p class="game-table-page__eyebrow">
          San Juan Online
        </p>
        <h1>聖胡安</h1>
      </div>

      <button
        class="game-table-page__leave-button"
        type="button"
        @click="requestLeaveGame"
      >
        離開遊戲
      </button>
    </header>

    <p v-if="isLoading" class="game-table-page__notice">
      載入牌局中…
    </p>

    <section v-else-if="loadError" class="game-table-page__notice" aria-label="牌局載入失敗">
      <p>{{ loadErrorMessage }}</p>
      <p class="game-table-page__notice-actions">
        <a v-if="loadError === 'AUTH_ERROR'" href="/api/auth/discord/login">Discord 登入</a>
        <a href="/lobby">回到大廳</a>
      </p>
    </section>

    <template v-else-if="snapshot">
      <GameTable
        :snapshot="snapshot"
        :viewer-id="viewerId"
        :guide-entries="guideEntries"
        :player-info-mode="playerInfoMode"
        :building-text-mode="buildingTextMode"
      />

      <GameActionLayer
        :snapshot="snapshot"
        :viewer-id="viewerId"
        @select-role="game.selectRole"
        @skip="game.skipAction"
        @build="game.build"
        @produce="game.produce"
        @trade="game.trade"
        @council="game.council"
        @discard="game.discard"
      />

      <GameResultDialog
        v-if="result && result.isGameOver && isResultOpen"
        :result="result"
        @close="isResultOpen = false"
        @leave="router.push('/lobby')"
      />
    </template>

    <p v-if="actionError" class="game-table-page__toast" role="alert">
      {{ actionError }}
    </p>

    <button
      class="settings-trigger"
      type="button"
      aria-label="開啟操作面板"
      @click="toggleSettings"
    >
      i
    </button>

    <aside
      v-if="isSettingsOpen"
      class="settings-drawer"
      aria-label="操作與設定"
    >
      <header class="settings-drawer__header">
        <h2>操作與設定</h2>
        <button type="button" aria-label="關閉操作面板" @click="toggleSettings">
          ×
        </button>
      </header>

      <section>
        <h3>玩家資訊</h3>
        <div class="segmented-control">
          <button
            type="button"
            :aria-pressed="playerInfoMode === 'hover'"
            @click="setPlayerInfoMode('hover')"
          >
            hover
          </button>
          <button
            type="button"
            :aria-pressed="playerInfoMode === 'always'"
            @click="setPlayerInfoMode('always')"
          >
            always
          </button>
        </div>
      </section>

      <section>
        <h3>建築說明</h3>
        <div class="segmented-control">
          <button
            type="button"
            :aria-pressed="buildingTextMode === 'compact'"
            @click="setBuildingTextMode('compact')"
          >
            compact
          </button>
          <button
            type="button"
            :aria-pressed="buildingTextMode === 'detailed'"
            @click="setBuildingTextMode('detailed')"
          >
            detailed
          </button>
        </div>
      </section>

      <button class="settings-drawer__secondary" type="button">
        再次開啟導覽
      </button>
    </aside>

    <div
      v-if="isLeaveConfirmOpen"
      class="game-table-page__dialog-backdrop"
      role="presentation"
    >
      <section
        class="game-table-page__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-game-title"
      >
        <h2 id="leave-game-title">
          確認離開遊戲？
        </h2>
        <p>牌局會保留在伺服器上，之後可以從房間回到遊戲繼續。</p>
        <div class="game-table-page__dialog-actions">
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
.game-table-page {
  min-height: 100vh;
  padding: 20px;
  background:
    linear-gradient(90deg, rgb(245 247 250 / 82%) 1px, transparent 1px),
    linear-gradient(rgb(245 247 250 / 82%) 1px, transparent 1px),
    #eff3ee;
  background-size: 28px 28px;
  color: #17201b;
  font-family: Inter, "Noto Sans TC", system-ui, sans-serif;
}

.game-table-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1440px;
  margin: 0 auto 14px;
}

.game-table-page__eyebrow {
  margin: 0 0 4px;
  color: #6e5f48;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.game-table-page__header h1 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.5rem, 2vw, 2.1rem);
  font-weight: 700;
}

.game-table-page__leave-button,
.game-table-page__dialog-actions button,
.settings-drawer button {
  min-height: 40px;
  border: 1px solid #8b9a8f;
  border-radius: 6px;
  padding: 8px 14px;
  background: #fbfbf6;
  color: #17201b;
  cursor: pointer;
}

.game-table-page__leave-button:hover,
.game-table-page__dialog-actions button:hover,
.settings-drawer button:hover {
  background: #e5eadf;
}

.game-table-page__notice {
  max-width: 640px;
  margin: 48px auto;
  border: 1px solid #aeb8aa;
  border-radius: 8px;
  padding: 20px 24px;
  background: #fbfbf6;
}

.game-table-page__notice p {
  margin: 0;
}

.game-table-page__notice-actions {
  display: flex;
  gap: 16px;
  margin-top: 12px !important;
}

.game-table-page__notice a {
  color: #8b4d2c;
  font-weight: 700;
}

.game-table-page__toast {
  position: fixed;
  top: 18px;
  left: 50%;
  z-index: 50;
  max-width: min(90vw, 520px);
  margin: 0;
  border: 1px solid #b3362b;
  border-radius: 6px;
  padding: 10px 16px;
  background: #fff4f2;
  color: #8a2a21;
  font-weight: 700;
  transform: translateX(-50%);
  box-shadow: 0 10px 24px rgb(23 32 27 / 18%);
}

.settings-trigger {
  position: fixed;
  right: 18px;
  bottom: 18px;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid #263b2c;
  border-radius: 50%;
  background: #263b2c;
  color: #fbfbf6;
  cursor: pointer;
  font: 800 1.2rem Georgia, "Times New Roman", serif;
}

.settings-drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 25;
  display: grid;
  width: min(100%, 340px);
  height: 100vh;
  align-content: start;
  gap: 22px;
  border-left: 1px solid #aeb8aa;
  padding: 22px;
  background: #fbfbf6;
  box-shadow: -18px 0 40px rgb(23 32 27 / 16%);
}

.settings-drawer h2,
.settings-drawer h3 {
  margin: 0;
  font-size: 1rem;
}

.settings-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.segmented-control {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-top: 10px;
}

.segmented-control button[aria-pressed="true"] {
  border-color: #263b2c;
  background: #263b2c;
  color: #fbfbf6;
}

.settings-drawer__secondary {
  width: 100%;
}

.game-table-page__dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(15 23 42 / 60%);
}

.game-table-page__dialog {
  width: min(100%, 420px);
  border-radius: 8px;
  padding: 24px;
  background: #ffffff;
  box-shadow: 0 20px 60px rgb(15 23 42 / 25%);
}

.game-table-page__dialog h2,
.game-table-page__dialog p {
  margin-top: 0;
}

.game-table-page__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 860px) {
  .game-table-page {
    padding: 12px;
  }

  .game-table-page__header {
    align-items: flex-start;
  }
}
</style>
