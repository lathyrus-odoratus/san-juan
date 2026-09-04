<script setup lang="ts">
import { computed, ref } from 'vue'
import CardSelectorModal from './CardSelectorModal.vue'
import ResultConfirmDialog from './ResultConfirmDialog.vue'
import type { SelectableCard } from './CardSelectorModal.vue'

const props = defineProps<{
  factories: SelectableCard[]
  isPrivileged: boolean
}>()

const emit = defineEmits<{
  hide: []
  confirm: [buildingIds: string[]]
}>()

const selectedFactoryIds = ref<string[]>([])
const isConfirmOpen = ref(false)
const maxFactories = computed(() => props.isPrivileged ? 2 : 1)
const description = computed(() => props.isPrivileged ? '你可以生產 2 個貨物' : '你可以生產 1 個貨物')
const confirmMessage = computed(() => {
  if (props.isPrivileged && selectedFactoryIds.value.length === 1) {
    return '你還可以再選 1 個工廠，也可以維持目前選擇送出。'
  }

  return selectedFactoryIds.value.length === 0 ? '你選擇不生產貨物。' : `你將生產 ${selectedFactoryIds.value.length} 個貨物。`
})

function requestConfirm(cardIds: string[]): void {
  selectedFactoryIds.value = cardIds
  isConfirmOpen.value = true
}

function confirmProduce(): void {
  isConfirmOpen.value = false
  emit('confirm', selectedFactoryIds.value)
}
</script>

<template>
  <ResultConfirmDialog
    v-if="isConfirmOpen"
    title="確認生產"
    :message="confirmMessage"
    @confirm="confirmProduce"
  />
  <CardSelectorModal
    v-else
    v-model:selected-card-ids="selectedFactoryIds"
    title="製造商：選擇工廠生產貨物"
    :description="description"
    :cards="factories"
    :max-selected="maxFactories"
    confirm-label="送出"
    @cancel="emit('hide')"
    @confirm="requestConfirm"
  />
</template>
