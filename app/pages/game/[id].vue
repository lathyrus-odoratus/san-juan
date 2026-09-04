<script setup lang="ts">
import { computed, ref } from 'vue'
import buildingsData from '~~/data/cards.buildings.json'
import type { GameSnapshot, PlayerState } from '~~/types/game'
import type { PlayerProfile } from '~~/types/player'

// Game table page — board layout, hand, roles, onboarding.
const route = useRoute()
const router = useRouter()

interface BuildingCard {
  id: string
  name: string
  category: 'production' | 'city'
  cost: number
  vp: number
}

interface BuildingsFile {
  cards: BuildingCard[]
}

const gameId = computed(() => route.params.id as string)
const isLeaveConfirmOpen = ref(false)
const isSettingsOpen = ref(false)
const playerInfoMode = ref<'hover' | 'always'>('hover')
const buildingTextMode = ref<'compact' | 'detailed'>('detailed')
const startedAt = Date.now()

const buildingCards = (buildingsData as BuildingsFile).cards
const buildingById = new Map(buildingCards.map(card => [card.id, card]))
const snapshot = computed<GameSnapshot>(() => createDemoSnapshot(gameId.value))
const players = computed(() => snapshot.value.players)
const ownPlayer = computed(() => players.value[0] ?? null)
const otherPlayers = computed(() => players.value.slice(1))
const topPlayer = computed(() => otherPlayers.value[1] ?? null)
const leftPlayer = computed(() => otherPlayers.value[0] ?? null)
const rightPlayer = computed(() => otherPlayers.value[2] ?? null)
const activePlayerName = computed(() => {
  const activePlayer = players.value.find(player => player.profile.discordId === snapshot.value.turnState.activePlayerId)
  return activePlayer?.profile.username ?? '等待玩家'
})
const guideEntries = computed(() => [
  `第 ${snapshot.value.turnState.round} 回合開始`,
  `${activePlayerName.value} 選擇職業`,
  '桌面已載入，等待玩家操作'
])

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

function toggleSettings(): void {
  isSettingsOpen.value = !isSettingsOpen.value
}

function setPlayerInfoMode(mode: 'hover' | 'always'): void {
  playerInfoMode.value = mode
}

function setBuildingTextMode(mode: 'compact' | 'detailed'): void {
  buildingTextMode.value = mode
}

function isGovernor(player: PlayerState | null): boolean {
  return player?.profile.discordId === snapshot.value.turnState.governorPlayerId
}

function isActivePlayer(player: PlayerState | null): boolean {
  return player?.profile.discordId === snapshot.value.turnState.activePlayerId
}

function getInitials(profile: PlayerProfile): string {
  return profile.username.slice(0, 2).toUpperCase()
}

function getBuildingName(cardId: string): string {
  return buildingById.get(cardId)?.name ?? cardId
}

function getBuildingDetail(cardId: string): string {
  const card = buildingById.get(cardId)
  if (!card) {
    return 'Unknown building'
  }

  return `${card.category} · cost ${card.cost} · VP ${card.vp}`
}

function getGoodsSummary(player: PlayerState): string {
  const goodsCount = Object.values(player.goods).filter(Boolean).length
  const productionCount = player.buildings.filter(cardId => buildingById.get(cardId)?.category === 'production').length
  return `${goodsCount}/${productionCount}`
}

function getElapsedTime(): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000)
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

function createDemoSnapshot(id: string): GameSnapshot {
  const profiles: PlayerProfile[] = [
    { discordId: 'player-you', username: 'You', avatar: null },
    { discordId: 'player-left', username: 'Alice', avatar: null },
    { discordId: 'player-top', username: 'Bob', avatar: null },
    { discordId: 'player-right', username: 'Carol', avatar: null }
  ]
  const hands = [
    ['smithy', 'market_stand', 'sugar_mill', 'builder'],
    ['card_back', 'card_back', 'card_back', 'card_back'],
    ['card_back', 'card_back', 'card_back'],
    ['card_back', 'card_back', 'card_back', 'card_back', 'card_back']
  ]

  return {
    schemaVersion: 1,
    gameId: id,
    roomId: typeof route.query.roomId === 'string' ? route.query.roomId : 'demo-room',
    hostPlayerId: profiles[0]?.discordId ?? '',
    players: profiles.map((profile, index) => ({
      profile,
      hand: hands[index] ?? [],
      buildings: ['indigo_plant'],
      goods: { indigo_plant: null }
    })),
    deckState: Array.from({ length: 120 }, (_, index) => `deck-${index}`),
    discardState: [],
    turnState: {
      round: 1,
      governorPlayerId: profiles[0]?.discordId ?? '',
      activePlayerId: profiles[0]?.discordId ?? '',
      actionPlayerId: null,
      selectedRole: null,
      selectedRoles: [],
      completedPlayerIds: []
    },
    phase: 'ROUND_ROLE_SELECTION',
    winner: null,
    updatedAt: startedAt
  }
}
</script>

<template>
  <main class="game-table-page">
    <header class="game-table-page__header">
      <div>
        <p class="game-table-page__eyebrow">
          San Juan Online
        </p>
        <h1>Game {{ gameId }}</h1>
      </div>

      <button
        class="game-table-page__leave-button"
        type="button"
        @click="requestLeaveGame"
      >
        離開遊戲
      </button>
    </header>

    <section class="game-table" aria-label="遊戲桌面">
      <section
        v-if="topPlayer"
        class="player-panel player-panel--top"
        :class="{ 'player-panel--active': isActivePlayer(topPlayer) }"
        aria-label="上方玩家區"
      >
        <div class="player-panel__identity">
          <div class="player-panel__avatar">
            {{ getInitials(topPlayer.profile) }}
          </div>
          <div>
            <p class="player-panel__name">
              {{ topPlayer.profile.username }}
            </p>
            <p class="player-panel__status">
              <span v-if="isGovernor(topPlayer)">Governor</span>
              <span v-if="isActivePlayer(topPlayer)">Active</span>
            </p>
          </div>
        </div>
        <div class="player-panel__cards" aria-label="其他玩家手牌張數">
          <span class="card-back-stack" />
          <strong>{{ topPlayer.hand.length }}</strong>
        </div>
        <div class="player-panel__details" :class="{ 'player-panel__details--always': playerInfoMode === 'always' }">
          <span>Building {{ topPlayer.buildings.length }}</span>
          <span>Goods {{ getGoodsSummary(topPlayer) }}</span>
        </div>
      </section>

      <section
        v-if="leftPlayer"
        class="player-panel player-panel--left"
        :class="{ 'player-panel--active': isActivePlayer(leftPlayer) }"
        aria-label="左側玩家區"
      >
        <div class="player-panel__identity">
          <div class="player-panel__avatar">
            {{ getInitials(leftPlayer.profile) }}
          </div>
          <div>
            <p class="player-panel__name">
              {{ leftPlayer.profile.username }}
            </p>
            <p class="player-panel__status">
              <span v-if="isGovernor(leftPlayer)">Governor</span>
              <span v-if="isActivePlayer(leftPlayer)">Active</span>
            </p>
          </div>
        </div>
        <div class="player-panel__cards" aria-label="其他玩家手牌張數">
          <span class="card-back-stack" />
          <strong>{{ leftPlayer.hand.length }}</strong>
        </div>
        <div class="player-panel__details" :class="{ 'player-panel__details--always': playerInfoMode === 'always' }">
          <span>Building {{ leftPlayer.buildings.length }}</span>
          <span>Goods {{ getGoodsSummary(leftPlayer) }}</span>
        </div>
      </section>

      <section class="center-zone" aria-label="中央公共區">
        <div class="center-zone__pile">
          <span>Deck</span>
          <strong>{{ snapshot.deckState.length }}</strong>
        </div>
        <div class="center-zone__pile">
          <span>Price Card</span>
          <strong>未翻開</strong>
        </div>
        <div class="center-zone__pile">
          <span>Discard</span>
          <strong>{{ snapshot.discardState.length }}</strong>
        </div>
        <div class="center-zone__phase">
          <span>{{ snapshot.phase }}</span>
          <strong>輪到 {{ activePlayerName }}</strong>
        </div>
      </section>

      <section
        v-if="rightPlayer"
        class="player-panel player-panel--right"
        :class="{ 'player-panel--active': isActivePlayer(rightPlayer) }"
        aria-label="右側玩家區"
      >
        <div class="player-panel__identity">
          <div class="player-panel__avatar">
            {{ getInitials(rightPlayer.profile) }}
          </div>
          <div>
            <p class="player-panel__name">
              {{ rightPlayer.profile.username }}
            </p>
            <p class="player-panel__status">
              <span v-if="isGovernor(rightPlayer)">Governor</span>
              <span v-if="isActivePlayer(rightPlayer)">Active</span>
            </p>
          </div>
        </div>
        <div class="player-panel__cards" aria-label="其他玩家手牌張數">
          <span class="card-back-stack" />
          <strong>{{ rightPlayer.hand.length }}</strong>
        </div>
        <div class="player-panel__details" :class="{ 'player-panel__details--always': playerInfoMode === 'always' }">
          <span>Building {{ rightPlayer.buildings.length }}</span>
          <span>Goods {{ getGoodsSummary(rightPlayer) }}</span>
        </div>
      </section>

      <aside class="guide-panel" aria-label="遊戲指引">
        <h2>遊戲指引</h2>
        <ol>
          <li v-for="entry in guideEntries" :key="entry">
            {{ entry }}
          </li>
        </ol>
      </aside>

      <section
        v-if="ownPlayer"
        class="player-panel player-panel--self"
        :class="{ 'player-panel--active': isActivePlayer(ownPlayer) }"
        aria-label="自己的玩家區"
      >
        <div class="player-panel__identity">
          <div class="player-panel__avatar">
            {{ getInitials(ownPlayer.profile) }}
          </div>
          <div>
            <p class="player-panel__name">
              {{ ownPlayer.profile.username }}
            </p>
            <p class="player-panel__status">
              <span v-if="isGovernor(ownPlayer)">Governor</span>
              <span v-if="isActivePlayer(ownPlayer)">Active</span>
            </p>
          </div>
        </div>

        <div class="building-row" aria-label="自己的建築">
          <article v-for="cardId in ownPlayer.buildings" :key="cardId" class="building-card">
            <strong>{{ getBuildingName(cardId) }}</strong>
            <span v-if="buildingTextMode === 'detailed'">{{ getBuildingDetail(cardId) }}</span>
          </article>
        </div>

        <div class="hand-row" aria-label="自己的手牌">
          <button
            v-for="(cardId, index) in ownPlayer.hand"
            :key="`${cardId}-${index}`"
            class="hand-card"
            type="button"
          >
            <strong>{{ getBuildingName(cardId) }}</strong>
            <span v-if="buildingTextMode === 'detailed'">{{ getBuildingDetail(cardId) }}</span>
          </button>
        </div>
      </section>

      <AppFooter class="game-table__footer">
        <span>第 {{ snapshot.turnState.round }} 回合</span>
        <span>遊戲時間 {{ getElapsedTime() }}</span>
      </AppFooter>
    </section>

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
        <p>目前對局資料會保留，之後可以回到遊戲繼續。</p>
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
.settings-drawer button,
.hand-card {
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
.settings-drawer button:hover,
.hand-card:hover {
  background: #e5eadf;
}

.game-table {
  display: grid;
  grid-template-areas:
    "top top top"
    "left center right"
    "guide self self"
    "footer footer footer";
  grid-template-columns: minmax(190px, 240px) minmax(420px, 1fr) minmax(190px, 240px);
  grid-template-rows: minmax(112px, auto) minmax(360px, 1fr) minmax(190px, auto) 40px;
  gap: 12px;
  max-width: 1440px;
  min-height: calc(100vh - 112px);
  margin: 0 auto;
}

.player-panel,
.center-zone,
.guide-panel,
.game-table__footer {
  border: 1px solid #aeb8aa;
  border-radius: 8px;
  background: rgb(251 251 246 / 94%);
  box-shadow: 0 12px 28px rgb(23 32 27 / 8%);
}

.player-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.player-panel--top {
  grid-area: top;
}

.player-panel--left {
  grid-area: left;
}

.player-panel--right {
  grid-area: right;
}

.player-panel--self {
  grid-area: self;
}

.player-panel--active {
  border-color: #c9783f;
  box-shadow: 0 0 0 3px rgb(201 120 63 / 18%), 0 12px 28px rgb(23 32 27 / 8%);
}

.player-panel__identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-panel__avatar {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 2px solid #263b2c;
  border-radius: 50%;
  background: #d7a449;
  color: #17201b;
  font-weight: 800;
}

.player-panel__name,
.player-panel__status {
  margin: 0;
}

.player-panel__name {
  font-weight: 800;
}

.player-panel__status {
  display: flex;
  min-height: 20px;
  flex-wrap: wrap;
  gap: 6px;
  color: #8b4d2c;
  font-size: 0.78rem;
  font-weight: 700;
}

.player-panel__cards {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-back-stack {
  position: relative;
  width: 46px;
  height: 34px;
}

.card-back-stack::before,
.card-back-stack::after {
  position: absolute;
  inset: 0;
  border: 1px solid #315f74;
  border-radius: 5px;
  background: #2f7891;
  content: "";
}

.card-back-stack::before {
  transform: rotate(-8deg) translateX(-5px);
}

.card-back-stack::after {
  transform: rotate(7deg) translateX(5px);
}

.player-panel__details {
  display: none;
  gap: 8px;
  flex-wrap: wrap;
  color: #4f5f52;
  font-size: 0.85rem;
}

.player-panel:hover .player-panel__details,
.player-panel__details--always {
  display: flex;
}

.center-zone {
  grid-area: center;
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  grid-template-rows: 1fr auto;
  gap: 12px;
  padding: 16px;
  background:
    radial-gradient(circle at center, rgb(40 79 58 / 18%), transparent 58%),
    #dce8d6;
}

.center-zone__pile,
.center-zone__phase {
  display: grid;
  min-height: 150px;
  place-items: center;
  border: 1px solid #80937d;
  border-radius: 8px;
  background: rgb(251 251 246 / 82%);
  text-align: center;
}

.center-zone__pile span,
.center-zone__phase span {
  color: #526253;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
}

.center-zone__pile strong {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.8rem, 4vw, 4rem);
}

.center-zone__phase {
  grid-column: 1 / -1;
  min-height: 86px;
  align-content: center;
  gap: 8px;
}

.center-zone__phase strong {
  font-size: 1.1rem;
}

.guide-panel {
  grid-area: guide;
  padding: 12px;
}

.guide-panel h2,
.settings-drawer h2,
.settings-drawer h3 {
  margin: 0;
  font-size: 1rem;
}

.guide-panel ol {
  margin: 12px 0 0;
  padding-left: 20px;
  color: #405044;
}

.building-row,
.hand-row {
  display: flex;
  min-height: 66px;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.building-card,
.hand-card {
  display: flex;
  width: 136px;
  min-width: 136px;
  flex-direction: column;
  justify-content: space-between;
  text-align: left;
}

.building-card {
  border: 1px solid #8b9a8f;
  border-radius: 6px;
  padding: 8px;
  background: #eef3e8;
}

.building-card span,
.hand-card span {
  color: #647163;
  font-size: 0.72rem;
}

.game-table__footer {
  grid-area: footer;
  padding: 0 12px;
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

  .game-table {
    grid-template-areas:
      "top"
      "left"
      "right"
      "center"
      "guide"
      "self"
      "footer";
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .center-zone {
    grid-template-columns: 1fr;
  }

  .center-zone__phase {
    grid-column: auto;
  }

  .game-table__footer {
    min-height: 56px;
    flex-wrap: wrap;
  }
}
</style>
