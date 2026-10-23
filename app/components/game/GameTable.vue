<script setup lang="ts">
import { computed } from 'vue'
import GamePlayerPanel from './GamePlayerPanel.vue'
import { getBuildingLabel, GOOD_NAMES_ZH, ROLE_NAMES_ZH } from '~~/app/utils/gameLabels'
import { describeTurn, formatPriceCard, getBuildingSlots, getSeatOrder } from '~~/app/utils/gameView'
import type { GameSnapshot, PlayerState, Role } from '~~/types/game'

// Board layout: opponents clockwise from the viewer (left, top, right), viewer at the bottom.
const props = defineProps<{
  snapshot: GameSnapshot
  viewerId: string
  guideEntries: string[]
  playerInfoMode: 'hover' | 'always'
  buildingTextMode: 'compact' | 'detailed'
}>()

const seats = computed(() => getSeatOrder(props.snapshot, props.viewerId))
const ownPlayer = computed(() => seats.value[0] ?? null)
const leftPlayer = computed(() => seats.value[1] ?? null)
const topPlayer = computed(() => seats.value[2] ?? null)
const rightPlayer = computed(() => seats.value[3] ?? null)
const ownSlots = computed(() => ownPlayer.value ? getBuildingSlots(ownPlayer.value) : [])
const turnDescription = computed(() => describeTurn(props.snapshot))
const roleByPlayerId = computed(() => new Map<string, Role>(
  props.snapshot.turnState.selectedRoles.map(selected => [selected.playerId, selected.role])
))
const opponents = computed(() => [
  { player: leftPlayer.value, area: 'left', label: '左側玩家區' },
  { player: topPlayer.value, area: 'top', label: '上方玩家區' },
  { player: rightPlayer.value, area: 'right', label: '右側玩家區' }
].filter((seat): seat is { player: PlayerState; area: string; label: string } => seat.player !== null))

function isGovernor(player: PlayerState): boolean {
  return player.profile.discordId === props.snapshot.turnState.governorPlayerId
}

function isActive(player: PlayerState): boolean {
  const { phase, turnState } = props.snapshot
  const activeId = phase === 'ROUND_ROLE_SELECTION' ? turnState.activePlayerId : turnState.actionPlayerId
  return player.profile.discordId === activeId
}

function getCardDetail(cardId: string): string {
  const card = getBuildingLabel(cardId)
  if (!card) {
    return ''
  }

  const good = card.goodType ? ` · ${GOOD_NAMES_ZH[card.goodType]}` : ''
  return `${card.category === 'production' ? '生產' : '城市'} · cost ${card.cost} · VP ${card.vp}${good}`
}
</script>

<template>
  <section class="game-table" aria-label="遊戲桌面">
    <GamePlayerPanel
      v-for="seat in opponents"
      :key="seat.player.profile.discordId"
      :class="`game-table__seat--${seat.area}`"
      :aria-label="seat.label"
      :player="seat.player"
      :is-governor="isGovernor(seat.player)"
      :is-active="isActive(seat.player)"
      :selected-role="roleByPlayerId.get(seat.player.profile.discordId) ?? null"
      :show-details="playerInfoMode === 'always'"
    />

    <section class="center-zone" aria-label="中央公共區">
      <div class="center-zone__pile">
        <span>Deck</span>
        <strong>{{ snapshot.deckState.length }}</strong>
      </div>
      <div class="center-zone__pile">
        <span>Price Card</span>
        <strong class="center-zone__price">{{ formatPriceCard(snapshot.turnState.priceCard) }}</strong>
      </div>
      <div class="center-zone__pile">
        <span>Discard</span>
        <strong>{{ snapshot.discardState.length }}</strong>
      </div>
      <div class="center-zone__phase">
        <span>第 {{ snapshot.turnState.round }} 回合</span>
        <strong>{{ turnDescription }}</strong>
        <ul v-if="snapshot.turnState.selectedRoles.length > 0" class="center-zone__roles">
          <li v-for="selected in snapshot.turnState.selectedRoles" :key="selected.role">
            {{ ROLE_NAMES_ZH[selected.role] }}：{{ snapshot.players.find(player => player.profile.discordId === selected.playerId)?.profile.username }}
          </li>
        </ul>
      </div>
    </section>

    <aside class="guide-panel" aria-label="遊戲指引">
      <h2>遊戲指引</h2>
      <ol>
        <li v-for="(entry, index) in guideEntries" :key="`${index}-${entry}`">
          {{ entry }}
        </li>
      </ol>
    </aside>

    <section
      v-if="ownPlayer"
      class="self-panel"
      :class="{ 'self-panel--active': isActive(ownPlayer) }"
      aria-label="自己的玩家區"
    >
      <div class="self-panel__identity">
        <p class="self-panel__name">
          {{ ownPlayer.profile.username }}
        </p>
        <p class="self-panel__status">
          <span v-if="isGovernor(ownPlayer)">Governor</span>
          <span v-if="isActive(ownPlayer)">Active</span>
          <span v-if="roleByPlayerId.get(ownPlayer.profile.discordId)">{{ ROLE_NAMES_ZH[roleByPlayerId.get(ownPlayer.profile.discordId)!] }}</span>
          <span>手牌 {{ ownPlayer.hand.length }}</span>
          <span>建築 {{ ownPlayer.buildings.length }}/12</span>
        </p>
      </div>

      <div class="building-row" aria-label="自己的建築">
        <article
          v-for="slot in ownSlots"
          :key="slot.slotKey"
          class="building-card"
          :class="{ 'building-card--goods': slot.good }"
        >
          <strong>{{ getBuildingLabel(slot.cardId)?.nameZh ?? slot.cardId }}</strong>
          <span v-if="buildingTextMode === 'detailed'">{{ getCardDetail(slot.cardId) }}</span>
          <em v-if="slot.good">有貨物</em>
        </article>
      </div>

      <div class="hand-row" aria-label="自己的手牌">
        <article
          v-for="(cardId, index) in ownPlayer.hand"
          :key="`${cardId}-${index}`"
          class="hand-card"
        >
          <strong>{{ getBuildingLabel(cardId)?.nameZh ?? cardId }}</strong>
          <small>{{ getBuildingLabel(cardId)?.name }}</small>
          <span v-if="buildingTextMode === 'detailed'">{{ getCardDetail(cardId) }}</span>
        </article>
      </div>
    </section>

    <AppFooter class="game-table__footer">
      <span>第 {{ snapshot.turnState.round }} 回合</span>
    </AppFooter>
  </section>
</template>

<style scoped>
.game-table {
  display: grid;
  grid-template-areas:
    "top top top"
    "left center right"
    "guide self self"
    "footer footer footer";
  grid-template-columns: minmax(190px, 240px) minmax(420px, 1fr) minmax(190px, 240px);
  grid-template-rows: minmax(112px, auto) minmax(300px, 1fr) minmax(190px, auto) 40px;
  gap: 12px;
  max-width: 1440px;
  min-height: calc(100vh - 112px);
  margin: 0 auto;
}

.game-table__seat--top {
  grid-area: top;
}

.game-table__seat--left {
  grid-area: left;
}

.game-table__seat--right {
  grid-area: right;
}

.center-zone,
.guide-panel,
.self-panel,
.game-table__footer {
  border: 1px solid #aeb8aa;
  border-radius: 8px;
  background: rgb(251 251 246 / 94%);
  box-shadow: 0 12px 28px rgb(23 32 27 / 8%);
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
  min-height: 130px;
  place-items: center;
  border: 1px solid #80937d;
  border-radius: 8px;
  padding: 8px;
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
  font-size: clamp(1.8rem, 4vw, 3.4rem);
}

.center-zone__pile .center-zone__price {
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.5;
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

.center-zone__roles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  color: #405044;
  font-size: 0.85rem;
  list-style: none;
}

.guide-panel {
  grid-area: guide;
  overflow-y: auto;
  max-height: 320px;
  padding: 12px;
}

.guide-panel h2 {
  margin: 0;
  font-size: 1rem;
}

.guide-panel ol {
  margin: 12px 0 0;
  padding-left: 20px;
  color: #405044;
  font-size: 0.9rem;
}

.self-panel {
  grid-area: self;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.self-panel--active {
  border-color: #c9783f;
  box-shadow: 0 0 0 3px rgb(201 120 63 / 18%), 0 12px 28px rgb(23 32 27 / 8%);
}

.self-panel__name,
.self-panel__status {
  margin: 0;
}

.self-panel__name {
  font-weight: 800;
}

.self-panel__status {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #8b4d2c;
  font-size: 0.8rem;
  font-weight: 700;
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
  gap: 2px;
  border: 1px solid #8b9a8f;
  border-radius: 6px;
  padding: 8px;
  text-align: left;
}

.building-card {
  background: #eef3e8;
}

.building-card--goods {
  border-color: #8b4d2c;
  box-shadow: inset 0 0 0 2px rgb(139 77 44 / 25%);
}

.building-card em {
  color: #8b4d2c;
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 700;
}

.hand-card {
  background: #fbfbf6;
}

.building-card span,
.hand-card span,
.hand-card small {
  color: #647163;
  font-size: 0.72rem;
}

.game-table__footer {
  grid-area: footer;
  padding: 0 12px;
}

@media (max-width: 860px) {
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
