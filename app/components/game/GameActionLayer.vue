<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BuilderBuildModal from './BuilderBuildModal.vue'
import CouncillorSelectModal from './CouncillorSelectModal.vue'
import HandLimitDiscardModal from './HandLimitDiscardModal.vue'
import ProducerFactoryModal from './ProducerFactoryModal.vue'
import RoleSelectionModal from './RoleSelectionModal.vue'
import TraderGoodsModal from './TraderGoodsModal.vue'
import type { SelectableCard } from './CardSelectorModal.vue'
import { getBuildingLabel, GOOD_NAMES_ZH } from '~~/app/utils/gameLabels'
import { findPlayer, getBuildingSlots, getGamePrompt, getPromptKey } from '~~/app/utils/gameView'
import type { GameSnapshot, Role } from '~~/types/game'

// Opens the modal for whatever the server is waiting on from the viewer.
const props = defineProps<{
  snapshot: GameSnapshot
  viewerId: string
}>()

const emit = defineEmits<{
  'select-role': [role: Role]
  'skip': []
  'build': [cardId: string, payment: string[]]
  'produce': [buildingIds: string[]]
  'trade': [buildingIds: string[]]
  'council': [keptCardIds: string[], discardedCardIds: string[]]
  'discard': [cardIds: string[]]
}>()

const PROMPT_LABELS: Record<string, string> = {
  select_role: '選擇職業',
  build: '建築',
  produce: '生產貨物',
  trade: '賣貨物',
  council: '議員選牌',
  discard: '棄牌'
}

const isHidden = ref(false)
const prompt = computed(() => getGamePrompt(props.snapshot, props.viewerId))
const promptKey = computed(() => getPromptKey(props.snapshot))
const isActionable = computed(() => prompt.value.type in PROMPT_LABELS)
const viewer = computed(() => findPlayer(props.snapshot, props.viewerId))
const slots = computed(() => viewer.value ? getBuildingSlots(viewer.value) : [])
const playerNamesById = computed(() => Object.fromEntries(
  props.snapshot.players.map(player => [player.profile.discordId, player.profile.username])
))

// A new decision always reopens the modal, even if the previous one was hidden.
watch(promptKey, () => {
  isHidden.value = false
})

const emptyFactories = computed<SelectableCard[]>(() => slots.value
  .filter(slot => slot.isProduction && !slot.good)
  .map(slot => ({
    id: slot.slotKey,
    title: getBuildingLabel(slot.cardId)?.nameZh ?? slot.cardId,
    subtitle: slot.goodType ? `生產${GOOD_NAMES_ZH[slot.goodType]}` : undefined
  })))
const loadedFactories = computed<SelectableCard[]>(() => slots.value
  .filter(slot => slot.isProduction && slot.good)
  .map(slot => ({
    id: slot.slotKey,
    title: getBuildingLabel(slot.cardId)?.nameZh ?? slot.cardId,
    subtitle: slot.goodType ? GOOD_NAMES_ZH[slot.goodType] : undefined,
    meta: slot.goodType ?? undefined
  })))
const prices = computed<Record<string, number>>(() => ({ ...(props.snapshot.turnState.priceCard ?? {}) }))
const councilCards = computed<SelectableCard[]>(() => {
  const drawCount = prompt.value.type === 'council' ? prompt.value.drawCount : 0
  return props.snapshot.deckState.slice(0, drawCount).map((cardId, index) => toSelectableCard(cardId, index))
})
const handCards = computed<SelectableCard[]>(() => (viewer.value?.hand ?? []).map((cardId, index) => toSelectableCard(cardId, index)))

function toSelectableCard(cardId: string, index: number): SelectableCard {
  const card = getBuildingLabel(cardId)
  return {
    id: `${cardId}:${index}`,
    title: card?.nameZh ?? cardId,
    subtitle: card ? `${card.name} · cost ${card.cost} · VP ${card.vp}` : undefined
  }
}

function toCardId(selectorId: string): string {
  return selectorId.split(':')[0] ?? selectorId
}

function confirmCouncil(keptSelectorId: string): void {
  const kept = [toCardId(keptSelectorId)]
  const discarded = councilCards.value.filter(card => card.id !== keptSelectorId).map(card => toCardId(card.id))
  emit('council', kept, discarded)
}
</script>

<template>
  <div
    v-if="isActionable && !isHidden"
    class="action-layer"
    role="presentation"
  >
    <RoleSelectionModal
      v-if="prompt.type === 'select_role'"
      :key="promptKey"
      :selected-roles="snapshot.turnState.selectedRoles"
      :player-names-by-id="playerNamesById"
      @hide="isHidden = true"
      @confirm="emit('select-role', $event)"
    />
    <BuilderBuildModal
      v-else-if="prompt.type === 'build'"
      :key="promptKey"
      :hand-card-ids="viewer?.hand ?? []"
      :built-city-card-ids="viewer?.buildings ?? []"
      :is-privileged="prompt.isPrivileged"
      @cancel="emit('skip')"
      @confirm="emit('build', $event.cardId, $event.payment)"
    />
    <ProducerFactoryModal
      v-else-if="prompt.type === 'produce'"
      :key="promptKey"
      :factories="emptyFactories"
      :is-privileged="prompt.isPrivileged"
      @hide="isHidden = true"
      @confirm="emit('produce', $event)"
    />
    <TraderGoodsModal
      v-else-if="prompt.type === 'trade'"
      :key="promptKey"
      :factories="loadedFactories"
      :prices="prices"
      :is-privileged="prompt.isPrivileged"
      @hide="isHidden = true"
      @confirm="emit('trade', $event)"
    />
    <CouncillorSelectModal
      v-else-if="prompt.type === 'council'"
      :key="promptKey"
      :cards="councilCards"
      :is-privileged="prompt.isPrivileged"
      @hide="isHidden = true"
      @confirm="confirmCouncil"
    />
    <HandLimitDiscardModal
      v-else-if="prompt.type === 'discard'"
      :key="promptKey"
      :cards="handCards"
      :hand-limit="prompt.handLimit"
      @confirm="emit('discard', $event.map(toCardId))"
    />
  </div>

  <button
    v-else-if="isActionable"
    class="action-layer__resume"
    type="button"
    @click="isHidden = false"
  >
    輪到你：{{ PROMPT_LABELS[prompt.type] }}
  </button>
</template>

<style scoped>
.action-layer {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 24px;
  background: rgb(23 32 27 / 52%);
}

.action-layer__resume {
  position: fixed;
  bottom: 18px;
  left: 50%;
  z-index: 20;
  border: 1px solid #8b4d2c;
  border-radius: 999px;
  padding: 10px 20px;
  background: #c9783f;
  color: #fbfbf6;
  font-weight: 800;
  cursor: pointer;
  transform: translateX(-50%);
  box-shadow: 0 10px 24px rgb(23 32 27 / 22%);
}
</style>
