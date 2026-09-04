import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GamePage from '~~/app/pages/game/[id].vue'

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
