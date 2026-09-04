<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface SelectableCard {
  id: string
  title: string
  subtitle?: string
  meta?: string
  disabled?: boolean
  disabledReason?: string
}

const props = withDefaults(defineProps<{
  title: string
  description?: string
  cards: SelectableCard[]
  selectedCardIds?: string[]
  minSelected?: number
  maxSelected?: number
  pageSize?: number
  confirmLabel?: string
  cancelLabel?: string
  allowCancel?: boolean
  requireExact?: boolean
}>(), {
  description: '',
  selectedCardIds: () => [],
  minSelected: 0,
  maxSelected: 1,
  pageSize: 4,
  confirmLabel: '確認',
  cancelLabel: '隱藏',
  allowCancel: true,
  requireExact: false
})

const emit = defineEmits<{
  cancel: []
  confirm: [cardIds: string[]]
  'update:selectedCardIds': [cardIds: string[]]
}>()

const pageIndex = ref(0)
const selectedIds = ref<string[]>([...props.selectedCardIds])

const pageCount = computed(() => Math.max(Math.ceil(props.cards.length / props.pageSize), 1))
const visibleCards = computed(() => {
  const start = pageIndex.value * props.pageSize
  return props.cards.slice(start, start + props.pageSize)
})
const selectedCount = computed(() => selectedIds.value.length)
const canConfirm = computed(() => {
  if (props.requireExact) {
    return selectedCount.value === props.maxSelected
  }

  return selectedCount.value >= props.minSelected && selectedCount.value <= props.maxSelected
})

watch(
  () => props.selectedCardIds,
  value => {
    selectedIds.value = [...value]
  }
)

function isSelected(cardId: string): boolean {
  return selectedIds.value.includes(cardId)
}

function toggleCard(card: SelectableCard): void {
  if (card.disabled) {
    return
  }

  if (isSelected(card.id)) {
    updateSelected(selectedIds.value.filter(cardId => cardId !== card.id))
    return
  }

  if (props.maxSelected === 1) {
    updateSelected([card.id])
    return
  }

  if (selectedIds.value.length >= props.maxSelected) {
    return
  }

  updateSelected([...selectedIds.value, card.id])
}

function updateSelected(cardIds: string[]): void {
  selectedIds.value = cardIds
  emit('update:selectedCardIds', cardIds)
}

function goPrevious(): void {
  pageIndex.value = Math.max(pageIndex.value - 1, 0)
}

function goNext(): void {
  pageIndex.value = Math.min(pageIndex.value + 1, pageCount.value - 1)
}

function confirmSelection(): void {
  if (!canConfirm.value) {
    return
  }

  emit('confirm', selectedIds.value)
}
</script>

<template>
  <section
    class="card-selector"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="`${title}-title`"
  >
    <header class="card-selector__header">
      <div>
        <h2 :id="`${title}-title`">
          {{ title }}
        </h2>
        <p v-if="description">
          {{ description }}
        </p>
      </div>
      <span>{{ selectedCount }} / {{ maxSelected }}</span>
    </header>

    <div class="card-selector__body">
      <button
        class="card-selector__page-button"
        type="button"
        aria-label="上一頁"
        :disabled="pageIndex === 0"
        @click="goPrevious"
      >
        ‹
      </button>

      <div class="card-selector__cards">
        <button
          v-for="card in visibleCards"
          :key="card.id"
          class="selector-card"
          type="button"
          :class="{
            'selector-card--selected': isSelected(card.id),
            'selector-card--disabled': card.disabled
          }"
          :disabled="card.disabled"
          @click="toggleCard(card)"
        >
          <strong>{{ card.title }}</strong>
          <span v-if="card.subtitle">{{ card.subtitle }}</span>
          <small>{{ card.disabled ? card.disabledReason : card.meta }}</small>
        </button>
      </div>

      <button
        class="card-selector__page-button"
        type="button"
        aria-label="下一頁"
        :disabled="pageIndex >= pageCount - 1"
        @click="goNext"
      >
        ›
      </button>
    </div>

    <footer class="card-selector__actions">
      <button
        v-if="allowCancel"
        type="button"
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        :disabled="!canConfirm"
        @click="confirmSelection"
      >
        {{ confirmLabel }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.card-selector {
  width: min(100%, 760px);
  border: 1px solid #8b9a8f;
  border-radius: 8px;
  padding: 22px;
  background: #fbfbf6;
  color: #17201b;
  box-shadow: 0 24px 80px rgb(23 32 27 / 28%);
}

.card-selector__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.card-selector__header h2,
.card-selector__header p {
  margin: 0;
}

.card-selector__header p {
  margin-top: 4px;
  color: #526253;
}

.card-selector__body {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  gap: 12px;
  margin-top: 22px;
}

.card-selector__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.selector-card {
  display: flex;
  min-height: 154px;
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

.selector-card--selected {
  border-color: #c9783f;
  box-shadow: 0 0 0 3px rgb(201 120 63 / 22%);
}

.selector-card--disabled {
  background: #d7d9d1;
  color: #69726a;
  cursor: not-allowed;
}

.selector-card span,
.selector-card small {
  color: #526253;
}

.card-selector__page-button,
.card-selector__actions button {
  border: 1px solid #8b9a8f;
  border-radius: 6px;
  background: #fbfbf6;
  color: #17201b;
  cursor: pointer;
}

.card-selector__page-button:disabled,
.card-selector__actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.card-selector__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.card-selector__actions button {
  min-height: 40px;
  padding: 8px 16px;
}

@media (max-width: 720px) {
  .card-selector__body {
    grid-template-columns: 32px 1fr 32px;
  }

  .card-selector__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
