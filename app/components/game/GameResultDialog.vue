<script setup lang="ts">
import { computed } from 'vue'
import type { GameResult } from '~~/types/game'

const props = defineProps<{
  result: GameResult
}>()

const emit = defineEmits<{
  close: []
  leave: []
}>()

const ranking = computed(() => [...props.result.players].sort((left, right) => right.score - left.score))
const winnerName = computed(() => props.result.players.find(player => player.isWinner)?.username ?? '無')
</script>

<template>
  <div class="result-layer" role="presentation">
    <section class="result-card" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
      <h2 id="game-result-title">
        遊戲結束
      </h2>
      <p>勝者：<strong>{{ winnerName }}</strong></p>
      <ol class="result-card__ranking">
        <li v-for="player in ranking" :key="player.playerId" :class="{ 'result-card__winner': player.isWinner }">
          <span>{{ player.username }}</span>
          <strong>{{ player.score }} VP</strong>
        </li>
      </ol>
      <p class="result-card__note">
        平手時以手牌數＋工廠上的貨物數決勝。
      </p>
      <footer>
        <button type="button" @click="emit('close')">
          看牌桌
        </button>
        <button type="button" @click="emit('leave')">
          回到大廳
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.result-layer {
  position: fixed;
  inset: 0;
  z-index: 35;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(23 32 27 / 52%);
}

.result-card {
  display: grid;
  width: min(100%, 420px);
  gap: 12px;
  border-radius: 8px;
  padding: 24px;
  background: #fbfbf6;
  box-shadow: 0 20px 60px rgb(15 23 42 / 25%);
}

.result-card h2,
.result-card p {
  margin: 0;
}

.result-card__ranking {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 22px;
}

.result-card__ranking li span {
  display: inline-block;
  min-width: 10em;
}

.result-card__winner {
  color: #8b4d2c;
  font-weight: 800;
}

.result-card__note {
  color: #647163;
  font-size: 0.8rem;
}

.result-card footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.result-card button {
  min-height: 40px;
  border: 1px solid #8b9a8f;
  border-radius: 6px;
  padding: 8px 14px;
  background: #fbfbf6;
  cursor: pointer;
}
</style>
