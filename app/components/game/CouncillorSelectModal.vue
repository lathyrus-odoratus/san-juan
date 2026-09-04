<script setup lang="ts">
import { ref } from 'vue'
import type { SelectableCard } from './CardSelectorModal.vue'

defineProps<{
  cards: SelectableCard[]
  isPrivileged: boolean
}>()

const emit = defineEmits<{
  hide: []
  confirm: [keptCardId: string]
}>()

const selectedCardId = ref<string | null>(null)

function selectCard(card: SelectableCard): void {
  if (!card.disabled) {
    selectedCardId.value = card.id
  }
}

function confirmCard(): void {
  if (selectedCardId.value) {
    emit('confirm', selectedCardId.value)
  }
}
</script>

<template>
  <section class="councillor-modal" role="dialog" aria-modal="true" aria-labelledby="councillor-title">
    <header>
      <h2 id="councillor-title">
        議員：選擇保留的手牌
      </h2>
      <p>{{ isPrivileged ? '特權：抽到 5 張，選 1 張保留，其餘棄掉' : '抽到 2 張，選 1 張保留，其餘棄掉' }}</p>
    </header>

    <div class="councillor-modal__cards">
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        class="councillor-card"
        :class="{ 'councillor-card--selected': selectedCardId === card.id }"
        :disabled="card.disabled"
        @click="selectCard(card)"
      >
        <strong>{{ card.title }}</strong>
        <span v-if="card.subtitle">{{ card.subtitle }}</span>
      </button>
    </div>

    <p>未選的牌將棄掉</p>

    <footer>
      <button type="button" @click="emit('hide')">
        隱藏
      </button>
      <button type="button" :disabled="!selectedCardId" @click="confirmCard">
        確認保留
      </button>
    </footer>
  </section>
</template>

<style scoped>
.councillor-modal {
  width: min(100%, 820px);
  border: 1px solid #8b9a8f;
  border-radius: 8px;
  padding: 24px;
  background: #fbfbf6;
  color: #17201b;
  box-shadow: 0 24px 80px rgb(23 32 27 / 28%);
}

.councillor-modal h2,
.councillor-modal p {
  margin-top: 0;
}

.councillor-modal__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 10px;
  margin: 20px 0;
}

.councillor-card {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid #9cab99;
  border-radius: 8px;
  padding: 12px;
  background: #eef3e8;
  color: #17201b;
  text-align: left;
  cursor: pointer;
}

.councillor-card--selected {
  border-color: #c9783f;
  box-shadow: 0 0 0 3px rgb(201 120 63 / 22%);
}

.councillor-modal footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.councillor-modal footer button {
  min-height: 40px;
  border: 1px solid #8b9a8f;
  border-radius: 6px;
  padding: 8px 16px;
  background: #fbfbf6;
  color: #17201b;
  cursor: pointer;
}

.councillor-modal footer button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
