import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GameActionLayer from '~~/app/components/game/GameActionLayer.vue'
import type { GameSnapshot, Role } from '~~/types/game'
import { createTableSnapshot, VIEWER_ID } from '../../fixtures/gameSnapshot'

function actionState(role: Role, actionPlayerId = VIEWER_ID): GameSnapshot {
  const snapshot = createTableSnapshot()
  snapshot.phase = 'ROUND_ACTION_RESOLUTION'
  snapshot.turnState.selectedRole = role
  snapshot.turnState.selectedRoles = [{ role, playerId: VIEWER_ID }]
  snapshot.turnState.actionPlayerId = actionPlayerId
  snapshot.turnState.activePlayerId = actionPlayerId
  return snapshot
}

function mountLayer(snapshot: GameSnapshot) {
  return mount(GameActionLayer, { props: { snapshot, viewerId: VIEWER_ID } })
}

async function clickButton(wrapper: ReturnType<typeof mountLayer>, text: string): Promise<void> {
  await wrapper.findAll('button').find(button => button.text() === text)?.trigger('click')
}

describe('GameActionLayer', () => {
  it('asks the active player to choose a role', () => {
    expect(mountLayer(createTableSnapshot()).text()).toContain('選擇你的職業')
  })

  it('shows nothing while another player is deciding', () => {
    const wrapper = mountLayer(actionState('Builder', 'alice'))

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('can hide the modal and bring it back', async () => {
    const wrapper = mountLayer(createTableSnapshot())

    await clickButton(wrapper, '隱藏')
    expect(wrapper.text()).not.toContain('選擇你的職業')

    await clickButton(wrapper, '輪到你：選擇職業')
    expect(wrapper.text()).toContain('選擇你的職業')
  })

  it('skips building when the builder gives up', async () => {
    const wrapper = mountLayer(actionState('Builder'))

    await clickButton(wrapper, '放棄')

    expect(wrapper.emitted('skip')).toHaveLength(1)
  })

  it('emits the building and its payment', async () => {
    const wrapper = mountLayer(actionState('Builder'))

    // Privileged builder: Smithy costs 1 - 1 = 0 cards.
    await wrapper.findAll('.selector-card').find(card => card.text().includes('Smithy'))?.trigger('click')
    await clickButton(wrapper, '確認')
    await clickButton(wrapper, '確認')

    expect(wrapper.emitted('build')).toEqual([['smithy', []]])
  })

  it('offers only empty factories to the producer', () => {
    const snapshot = actionState('Producer')
    const viewer = snapshot.players[0]!
    viewer.buildings = ['indigo_plant', 'indigo_plant']
    viewer.goods = { 'indigo_plant': 'statue', 'indigo_plant#2': null }

    const wrapper = mountLayer(snapshot)

    expect(wrapper.findAll('.selector-card')).toHaveLength(1)
  })

  it('sells the chosen goods by building slot', async () => {
    const snapshot = actionState('Trader')
    snapshot.turnState.priceCard = { indigo: 1, sugar: 2, tobacco: 2, coffee: 3, silver: 3 }
    const viewer = snapshot.players[0]!
    viewer.buildings = ['indigo_plant', 'indigo_plant']
    viewer.goods = { 'indigo_plant': null, 'indigo_plant#2': 'statue' }
    const wrapper = mountLayer(snapshot)

    await wrapper.get('.selector-card').trigger('click')
    await clickButton(wrapper, '送出')

    expect(wrapper.emitted('trade')).toEqual([[['indigo_plant#2']]])
  })

  it('keeps one councillor card and discards the rest from the top of the deck', async () => {
    const snapshot = actionState('Councillor')
    snapshot.deckState = ['tower', 'chapel', 'statue', 'hero', 'library', ...snapshot.deckState]
    const wrapper = mountLayer(snapshot)

    await wrapper.findAll('.councillor-card').find(card => card.text().includes('小教堂'))?.trigger('click')
    await clickButton(wrapper, '確認保留')

    expect(wrapper.emitted('council')).toEqual([[['chapel'], ['tower', 'statue', 'hero', 'library']]])
  })

  it('asks a player over the hand limit to discard', () => {
    const snapshot = createTableSnapshot()
    snapshot.phase = 'ROUND_END_CHECK'
    snapshot.turnState.actionPlayerId = VIEWER_ID
    snapshot.players[0]!.hand = Array.from({ length: 9 }, () => 'smithy')

    expect(mountLayer(snapshot).text()).toContain('需棄掉 2 張')
  })
})
