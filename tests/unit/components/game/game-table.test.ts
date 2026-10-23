import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GameTable from '~~/app/components/game/GameTable.vue'
import packageInfo from '~~/package.json'
import { createTableSnapshot, VIEWER_ID } from '../../fixtures/gameSnapshot'

function mountTable(viewerId = VIEWER_ID, snapshot = createTableSnapshot()) {
  return mount(GameTable, {
    props: {
      snapshot,
      viewerId,
      guideEntries: ['輪到 You 選擇職業'],
      playerInfoMode: 'hover',
      buildingTextMode: 'detailed'
    }
  })
}

describe('GameTable', () => {
  it('renders the main table zones and footer version', () => {
    const wrapper = mountTable()

    expect(wrapper.get('[aria-label="中央公共區"]').text()).toContain('Deck')
    expect(wrapper.get('[aria-label="中央公共區"]').text()).toContain('Price Card')
    expect(wrapper.get('[aria-label="中央公共區"]').text()).toContain('Discard')
    expect(wrapper.get('[aria-label="遊戲指引"]').text()).toContain('輪到 You 選擇職業')
    expect(wrapper.text()).toContain(`v${packageInfo.version}`)
  })

  it('seats the viewer at the bottom and opponents clockwise', () => {
    const wrapper = mountTable('bob')

    expect(wrapper.get('[aria-label="自己的玩家區"]').text()).toContain('Bob')
    expect(wrapper.get('[aria-label="左側玩家區"]').text()).toContain('Carol')
    expect(wrapper.get('[aria-label="上方玩家區"]').text()).toContain('You')
    expect(wrapper.get('[aria-label="右側玩家區"]').text()).toContain('Alice')
  })

  it('marks the governor who is choosing a role as active', () => {
    const selfPanel = mountTable().get('[aria-label="自己的玩家區"]')

    expect(selfPanel.text()).toContain('Governor')
    expect(selfPanel.text()).toContain('Active')
  })

  it('shows card names only in the viewer hand', () => {
    const wrapper = mountTable()

    expect(wrapper.get('[aria-label="自己的手牌"]').text()).toContain('Smithy')
    for (const label of ['上方玩家區', '左側玩家區', '右側玩家區']) {
      expect(wrapper.get(`[aria-label="${label}"]`).text()).not.toContain('Smithy')
    }
  })

  it('marks each production building that holds goods', () => {
    const snapshot = createTableSnapshot()
    const viewer = snapshot.players[0]!
    viewer.buildings = ['indigo_plant', 'indigo_plant']
    viewer.goods = { 'indigo_plant': null, 'indigo_plant#2': 'statue' }

    const buildings = mountTable(VIEWER_ID, snapshot).get('[aria-label="自己的建築"]').findAll('.building-card')

    expect(buildings.map(building => building.classes('building-card--goods'))).toEqual([false, true])
  })

  it('shows the revealed price card during the trader phase', () => {
    const snapshot = createTableSnapshot()
    snapshot.turnState.priceCard = { indigo: 1, sugar: 2, tobacco: 2, coffee: 3, silver: 3 }

    expect(mountTable(VIEWER_ID, snapshot).get('[aria-label="中央公共區"]').text()).toContain('咖啡 3')
  })
})
