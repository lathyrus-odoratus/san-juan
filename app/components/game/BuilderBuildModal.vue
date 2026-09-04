<script setup lang="ts">
import { computed, ref } from 'vue'
import buildingsData from '~~/data/cards.buildings.json'
import CardSelectorModal from './CardSelectorModal.vue'
import type { SelectableCard } from './CardSelectorModal.vue'

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

const props = defineProps<{
  handCardIds: string[]
  builtCityCardIds: string[]
  isPrivileged: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: [payload: { cardId: string; payment: string[] }]
}>()

const selectedBuildCardId = ref<string | null>(null)
const selectedPaymentIds = ref<string[]>([])
const buildingById = new Map((buildingsData as BuildingsFile).cards.map(card => [card.id, card]))
const selectedBuildBaseCardId = computed(() => selectedBuildCardId.value?.split(':')[0] ?? null)
const adjustedCost = computed(() => {
  if (!selectedBuildBaseCardId.value) {
    return 0
  }

  const card = buildingById.get(selectedBuildBaseCardId.value)
  return Math.max((card?.cost ?? 0) - (props.isPrivileged ? 1 : 0), 0)
})
const buildCards = computed<SelectableCard[]>(() => props.handCardIds.map((cardId, index) => {
  const card = buildingById.get(cardId)
  const duplicateCity = card?.category === 'city' && props.builtCityCardIds.includes(cardId)
  const cost = Math.max((card?.cost ?? 0) - (props.isPrivileged ? 1 : 0), 0)
  const cannotPay = props.handCardIds.length - 1 < cost

  return {
    id: `${cardId}:${index}`,
    title: card?.name ?? cardId,
    subtitle: card ? `${card.category} · cost ${cost} · VP ${card.vp}` : undefined,
    meta: cardId,
    disabled: duplicateCity || cannotPay,
    disabledReason: duplicateCity ? '已有此城市建築' : '手牌不夠支付'
  }
}))
const paymentCards = computed<SelectableCard[]>(() => props.handCardIds
  .map((cardId, index) => ({ cardId, selectorId: `${cardId}:${index}` }))
  .filter(card => card.selectorId !== selectedBuildCardId.value)
  .map(card => ({
    id: card.selectorId,
    title: buildingById.get(card.cardId)?.name ?? card.cardId,
    meta: card.cardId
  })))
const isSelectingPayment = computed(() => selectedBuildCardId.value !== null)

function selectBuildCard(cardIds: string[]): void {
  selectedBuildCardId.value = cardIds[0] ?? null
  selectedPaymentIds.value = []
}

function confirmPayment(cardIds: string[]): void {
  if (!selectedBuildCardId.value) {
    return
  }

  const cardId = selectedBuildBaseCardId.value
  if (!cardId) {
    return
  }

  emit('confirm', {
    cardId,
    payment: cardIds.map(selectorId => selectorId.split(':')[0]).filter(Boolean)
  })
}
</script>

<template>
  <CardSelectorModal
    v-if="!isSelectingPayment"
    title="建築師：選擇要建造的建築"
    description="選擇 1 張要建造的手牌，或放棄本次建造。"
    :cards="buildCards"
    :max-selected="1"
    confirm-label="確認"
    cancel-label="放棄"
    @cancel="emit('cancel')"
    @confirm="selectBuildCard"
  />
  <CardSelectorModal
    v-else
    v-model:selected-card-ids="selectedPaymentIds"
    :title="`建築師：你必須支付 ${adjustedCost} 張手牌`"
    description="選擇用於支付的手牌。"
    :cards="paymentCards"
    :max-selected="adjustedCost"
    :min-selected="adjustedCost"
    require-exact
    confirm-label="確認"
    cancel-label="放棄"
    @cancel="emit('cancel')"
    @confirm="confirmPayment"
  />
</template>
