import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CouncillorSelectModal from '~~/app/components/game/CouncillorSelectModal.vue'

describe('CouncillorSelectModal', () => {
  it('keeps all drawn cards visible and emits exactly one kept card', async () => {
    const wrapper = mount(CouncillorSelectModal, {
      props: {
        cards: [
          { id: 'a', title: 'Card A' },
          { id: 'b', title: 'Card B' },
          { id: 'c', title: 'Card C' },
          { id: 'd', title: 'Card D' },
          { id: 'e', title: 'Card E' }
        ],
        isPrivileged: true
      }
    })

    expect(wrapper.text()).toContain('Card E')
    await wrapper.findAll('.councillor-card')[1]?.trigger('click')
    await wrapper.findAll('footer button').at(-1)?.trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toBe('b')
  })
})
