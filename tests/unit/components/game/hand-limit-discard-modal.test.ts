import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HandLimitDiscardModal from '~~/app/components/game/HandLimitDiscardModal.vue'

describe('HandLimitDiscardModal', () => {
  it('does not provide cancel and requires selecting the excess hand cards', async () => {
    const wrapper = mount(HandLimitDiscardModal, {
      props: {
        handLimit: 2,
        cards: [
          { id: 'a', title: 'Card A' },
          { id: 'b', title: 'Card B' },
          { id: 'c', title: 'Card C' },
          { id: 'd', title: 'Card D' }
        ]
      }
    })

    expect(wrapper.text()).toContain('需棄掉 2 張')
    expect(wrapper.text()).not.toContain('隱藏')

    const confirm = wrapper.findAll('.card-selector__actions button').at(-1)
    expect(confirm?.attributes('disabled')).toBeDefined()

    await wrapper.findAll('.selector-card')[0]?.trigger('click')
    await wrapper.findAll('.selector-card')[1]?.trigger('click')
    await confirm?.trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual(['a', 'b'])
  })
})
