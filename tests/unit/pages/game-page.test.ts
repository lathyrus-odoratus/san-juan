import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import GamePage from '~~/app/pages/game/[id].vue'
import type { GameLoadError } from '~~/app/composables/useGame'
import type { GameLogEntry, GameResult, GameSnapshot } from '~~/types/game'
import { createTableSnapshot, VIEWER_ID } from '../fixtures/gameSnapshot'

const push = vi.fn()
const route = {
  params: { id: 'game-123' },
  query: {} as Record<string, string>
}

vi.mock('#app/composables/router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push })
}))

vi.mock('~~/app/composables/useAuth', () => ({
  useAuth: () => ({ player: ref({ discordId: VIEWER_ID, username: 'You', avatar: null }) })
}))

const game = {
  snapshot: ref<GameSnapshot | null>(null),
  log: ref<GameLogEntry[]>([]),
  result: ref<GameResult | null>(null),
  loadError: ref<GameLoadError | null>(null),
  actionError: ref<string | null>(null),
  isLoading: ref(false),
  reload: vi.fn(),
  selectRole: vi.fn(),
  skipAction: vi.fn(),
  build: vi.fn(),
  produce: vi.fn(),
  trade: vi.fn(),
  council: vi.fn(),
  discard: vi.fn()
}

vi.mock('~~/app/composables/useGame', () => ({
  useGame: () => game
}))

async function clickButton(wrapper: ReturnType<typeof mount>, text: string): Promise<void> {
  await wrapper.findAll('button').find(button => button.text() === text)?.trigger('click')
}

describe('game page', () => {
  beforeEach(() => {
    push.mockReset()
    route.query = {}
    game.snapshot.value = createTableSnapshot()
    game.log.value = []
    game.result.value = null
    game.loadError.value = null
    game.actionError.value = null
    game.isLoading.value = false
    game.selectRole.mockReset()
  })

  it('shows a confirmation dialog before leaving the game', async () => {
    const wrapper = mount(GamePage)

    expect(wrapper.text()).not.toContain('確認離開遊戲？')
    await clickButton(wrapper, '離開遊戲')

    expect(wrapper.text()).toContain('確認離開遊戲？')
  })

  it('stays on the game page when canceling leave', async () => {
    const wrapper = mount(GamePage)

    await clickButton(wrapper, '離開遊戲')
    await clickButton(wrapper, '取消')

    expect(wrapper.text()).not.toContain('確認離開遊戲？')
    expect(push).not.toHaveBeenCalled()
  })

  it('returns to the game room when confirming leave', async () => {
    const wrapper = mount(GamePage)

    await clickButton(wrapper, '離開遊戲')
    await clickButton(wrapper, '確認離開')

    expect(push).toHaveBeenCalledWith('/room/room-123')
  })

  it('returns to lobby when the game could not be loaded', async () => {
    game.snapshot.value = null
    game.loadError.value = 'GAME_NOT_FOUND'
    const wrapper = mount(GamePage)

    await clickButton(wrapper, '離開遊戲')
    await clickButton(wrapper, '確認離開')

    expect(push).toHaveBeenCalledWith('/lobby')
  })

  it('explains a missing game and links back to the lobby', () => {
    game.snapshot.value = null
    game.loadError.value = 'GAME_NOT_FOUND'
    const wrapper = mount(GamePage)

    expect(wrapper.get('[aria-label="牌局載入失敗"]').text()).toContain('找不到這局遊戲')
    expect(wrapper.find('[aria-label="遊戲桌面"]').exists()).toBe(false)
  })

  it('offers Discord login when the session is missing', () => {
    game.snapshot.value = null
    game.loadError.value = 'AUTH_ERROR'
    const wrapper = mount(GamePage)

    expect(wrapper.get('[aria-label="牌局載入失敗"]').text()).toContain('Discord 登入')
  })

  it('sends the chosen role to the server', async () => {
    const wrapper = mount(GamePage)

    await wrapper.findAll('.role-card').find(button => button.text().includes('Producer'))?.trigger('click')
    await clickButton(wrapper, '確定')

    expect(game.selectRole).toHaveBeenCalledWith('Producer')
  })

  it('shows the latest log entry first in the guide', () => {
    game.log.value = [
      { id: '1', gameId: 'game-123', type: 'SELECT_ROLE', message: 'Alice 選擇了建築師', createdAt: 1 },
      { id: '2', gameId: 'game-123', type: 'SKIP_ACTION', message: 'Bob 跳過', createdAt: 2 }
    ]
    const wrapper = mount(GamePage)
    const entries = wrapper.get('[aria-label="遊戲指引"]').findAll('li').map(item => item.text())

    expect(entries).toEqual(['輪到 You 選擇職業', 'Bob 跳過', 'Alice 選擇了建築師'])
  })

  it('shows server errors to the player', () => {
    game.actionError.value = '現在不能這樣做，可能還沒輪到你，或選擇不符合規則。'
    const wrapper = mount(GamePage)

    expect(wrapper.get('[role="alert"]').text()).toContain('現在不能這樣做')
  })

  it('toggles settings modes from the drawer', async () => {
    const wrapper = mount(GamePage)

    await wrapper.get('[aria-label="開啟操作面板"]').trigger('click')
    const buttons = wrapper.findAll('.segmented-control button')
    await buttons.find(button => button.text() === 'always')?.trigger('click')
    await buttons.find(button => button.text() === 'compact')?.trigger('click')

    expect(wrapper.findAll('.player-panel__details--always').length).toBe(3)
    expect(wrapper.get('[aria-label="自己的手牌"]').text()).not.toContain('cost')
  })

  it('shows the final ranking when the game is over', () => {
    game.snapshot.value = { ...createTableSnapshot(), phase: 'GAME_END' }
    game.result.value = {
      gameId: 'game-123',
      isGameOver: true,
      winner: 'alice',
      players: [
        { playerId: 'you', username: 'You', score: 18, isWinner: false },
        { playerId: 'alice', username: 'Alice', score: 24, isWinner: true }
      ]
    }
    const wrapper = mount(GamePage)

    expect(wrapper.text()).toContain('勝者：Alice')
    expect(wrapper.text()).toContain('24 VP')
  })
})
