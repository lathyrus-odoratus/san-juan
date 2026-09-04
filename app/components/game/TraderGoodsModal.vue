<script setup lang="ts">
import { computed, ref } from 'vue'
import CardSelectorModal from './CardSelectorModal.vue'
import type { SelectableCard } from './CardSelectorModal.vue'

const props = defineProps<{
  factories: SelectableCard[]
  prices: Record<string, number>
  isPrivileged: boolean
}>()

const emit = defineEmits<{
  hide: []
  confirm: [buildingIds: string[]]
}>()

const selectedGoodsIds = ref<string[]>([])
const maxGoods = computed(() => props.isPrivileged ? 2 : 1)
const description = computed(() => props.isPrivileged ? '你可以賣 2 種貨物' : '你可以賣 1 種貨物')
const cards = computed<SelectableCard[]>(() => props.factories.map(factory => ({
  ...factory,
  meta: factory.meta && props.prices[factory.meta] ? `賣出後抽 ${props.prices[factory.meta]} 張` : factory.meta
})))
</script>

<template>
  <CardSelectorModal
    v-model:selected-card-ids="selectedGoodsIds"
    title="貿易商：選擇賣出的貨物"
    :description="description"
    :cards="cards"
    :max-selected="maxGoods"
    confirm-label="送出"
    @cancel="emit('hide')"
    @confirm="emit('confirm', $event)"
  />
</template>
