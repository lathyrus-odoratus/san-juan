import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GamePage from '~~/app/pages/game/[id].vue'
import packageInfo from '~~/package.json'

const push = vi.fn()
const route = {
  params: { id: 'game-123' },
  query: {} as Record<string, string>
}

vi.mock('#app/composables/router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push })
}))

describe('game page leave flow', () => {
  beforeEach(() => {
    push.mockReset()
    route.query = {}
  })

  it('shows a confirmation dialog before leaving the game', async () => {
    const wrapper = mount(GamePage)

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await wrapper.get('button').trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('確認離開遊戲？')
  })

  it('stays on the game page when canceling leave', async () => {
    const wrapper = mount(GamePage)

    await wrapper.get('button').trigger('click')
    await wrapper.get('[role="dialog"] button').trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(push).not.toHaveBeenCalled()
  })

  it('returns to lobby when confirming leave without roomId', async () => {
    const wrapper = mount(GamePage)

    await wrapper.get('button').trigger('click')
    await wrapper.findAll('[role="dialog"] button')[1]?.trigger('click')

    expect(push).toHaveBeenCalledWith('/lobby')
  })

  it('returns to the room when confirming leave with roomId query', async () => {
    route.query = { roomId: 'room-123' }
    const wrapper = mount(GamePage)

    await wrapper.get('button').trigger('click')
    await wrapper.findAll('[role="dialog"] button')[1]?.trigger('click')

    expect(push).toHaveBeenCalledWith('/room/room-123')
  })
})

describe('game table shell', () => {
  beforeEach(() => {
    push.mockReset()
    route.query = {}
  })

  it('renders the main table zones and footer version', () => {
    const wrapper = mount(GamePage)

    expect(wrapper.get('[aria-label="遊戲桌面"]').exists()).toBe(true)
    expect(wrapper.get('[aria-label="中央公共區"]').text()).toContain('Deck')
    expect(wrapper.get('[aria-label="中央公共區"]').text()).toContain('Price Card')
    expect(wrapper.get('[aria-label="中央公共區"]').text()).toContain('Discard')
    expect(wrapper.get('[aria-label="遊戲指引"]').text()).toContain('桌面已載入')
    expect(wrapper.text()).toContain(`v${packageInfo.version}`)
  })

  it('renders Governor and active player status', () => {
    const wrapper = mount(GamePage)
    const selfPanel = wrapper.get('[aria-label="自己的玩家區"]')

    expect(selfPanel.text()).toContain('Governor')
    expect(selfPanel.text()).toContain('Active')
  })

  it('shows full card names only in the self hand area', () => {
    const wrapper = mount(GamePage)

    expect(wrapper.get('[aria-label="自己的手牌"]').text()).toContain('Smithy')
    expect(wrapper.get('[aria-label="上方玩家區"]').text()).not.toContain('card_back')
    expect(wrapper.get('[aria-label="左側玩家區"]').text()).not.toContain('card_back')
    expect(wrapper.get('[aria-label="右側玩家區"]').text()).not.toContain('card_back')
  })

  it('toggles settings modes from the drawer', async () => {
    const wrapper = mount(GamePage)

    await wrapper.get('[aria-label="開啟操作面板"]').trigger('click')
    expect(wrapper.get('[aria-label="操作與設定"]').exists()).toBe(true)

    const buttons = wrapper.findAll('.segmented-control button')
    await buttons.find(button => button.text() === 'always')?.trigger('click')
    await buttons.find(button => button.text() === 'compact')?.trigger('click')

    expect(wrapper.findAll('.player-panel__details--always').length).toBeGreaterThan(0)
    expect(wrapper.get('[aria-label="自己的手牌"]').text()).not.toContain('cost')
  })
})
