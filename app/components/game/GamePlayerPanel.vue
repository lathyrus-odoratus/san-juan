<script setup lang="ts">
import { computed } from 'vue'
import { getBuildingLabel, ROLE_NAMES_ZH } from '~~/app/utils/gameLabels'
import { getBuildingSlots } from '~~/app/utils/gameView'
import type { PlayerState, Role } from '~~/types/game'

// Opponent seat: identity, hand size, and buildings (with goods) — never the hand contents.
const props = defineProps<{
  player: PlayerState
  isGovernor: boolean
  isActive: boolean
  selectedRole: Role | null
  showDetails: boolean
}>()

const slots = computed(() => getBuildingSlots(props.player))
const goodsCount = computed(() => slots.value.filter(slot => slot.good).length)
const productionCount = computed(() => slots.value.filter(slot => slot.isProduction).length)
const initials = computed(() => props.player.profile.username.slice(0, 2).toUpperCase())
</script>

<template>
  <section class="player-panel" :class="{ 'player-panel--active': isActive }">
    <div class="player-panel__identity">
      <div class="player-panel__avatar">
        {{ initials }}
      </div>
      <div>
        <p class="player-panel__name">
          {{ player.profile.username }}
        </p>
        <p class="player-panel__status">
          <span v-if="isGovernor">Governor</span>
          <span v-if="isActive">Active</span>
          <span v-if="selectedRole">{{ ROLE_NAMES_ZH[selectedRole] }}</span>
        </p>
      </div>
    </div>
    <div class="player-panel__cards" aria-label="其他玩家手牌張數">
      <span class="card-back-stack" />
      <strong>{{ player.hand.length }}</strong>
    </div>
    <div class="player-panel__details" :class="{ 'player-panel__details--always': showDetails }">
      <span>Building {{ player.buildings.length }}</span>
      <span>Goods {{ goodsCount }}/{{ productionCount }}</span>
      <ul class="player-panel__buildings">
        <li
          v-for="slot in slots"
          :key="slot.slotKey"
          :class="{ 'player-panel__building--goods': slot.good }"
        >
          {{ getBuildingLabel(slot.cardId)?.nameZh ?? slot.cardId }}<template v-if="slot.good">
            ●
          </template>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.player-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #aeb8aa;
  border-radius: 8px;
  padding: 12px;
  background: rgb(251 251 246 / 94%);
  box-shadow: 0 12px 28px rgb(23 32 27 / 8%);
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

.player-panel__buildings {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.player-panel__buildings li {
  border: 1px solid #c4cdbf;
  border-radius: 4px;
  padding: 1px 6px;
  background: #eef3e8;
  font-size: 0.75rem;
}

.player-panel__building--goods {
  border-color: #8b4d2c;
}
</style>
