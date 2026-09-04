<script setup lang="ts">
import { computed, ref } from 'vue'
import CardSelectorModal from './CardSelectorModal.vue'
import type { SelectableCard } from './CardSelectorModal.vue'

const props = defineProps<{
  cards: SelectableCard[]
  handLimit: number
}>()

const emit = defineEmits<{
  confirm: [cardIds: string[]]
}>()

const selectedCardIds = ref<string[]>([])
const discardCount = computed(() => Math.max(props.cards.length - props.handLimit, 0))
const description = computed(() => `目前 ${props.cards.length} 張 / 上限 ${props.handLimit} 張，需棄掉 ${discardCount.value} 張`)
</script>

<template>
  <CardSelectorModal
    v-model:selected-card-ids="selectedCardIds"
    title="手牌超過上限，請棄牌"
    :description="description"
    :cards="cards"
    :max-selected="discardCount"
    :min-selected="discardCount"
    :allow-cancel="false"
    require-exact
    confirm-label="確認棄牌"
    @confirm="emit('confirm', $event)"
  />
</template>
