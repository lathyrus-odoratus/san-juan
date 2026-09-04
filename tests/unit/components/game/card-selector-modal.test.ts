import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CardSelectorModal from '~~/app/components/game/CardSelectorModal.vue'

const cards = [
  { id: 'a', title: 'Card A' },
  { id: 'b', title: 'Card B', disabled: true, disabledReason: '不可選' },
  { id: 'c', title: 'Card C' },
  { id: 'd', title: 'Card D' },
  { id: 'e', title: 'Card E' }
]

describe('CardSelectorModal', () => {
  it('paginates cards with stable page controls', async () => {
    const wrapper = mount(CardSelectorModal, {
      props: {
        title: '選擇卡片',
        cards,
        pageSize: 4
      }
    })

    expect(wrapper.text()).toContain('Card A')
    expect(wrapper.text()).not.toContain('Card E')

    await wrapper.get('[aria-label="下一頁"]').trigger('click')

    expect(wrapper.text()).toContain('Card E')
  })

  it('tracks selected cards and emits updates', async () => {
    const wrapper = mount(CardSelectorModal, {
      props: {
        title: '選擇卡片',
        cards,
        maxSelected: 2
      }
    })

    await wrapper.findAll('.selector-card')[0]?.trigger('click')
    await wrapper.findAll('.selector-card')[2]?.trigger('click')
    await wrapper.findAll('.card-selector__actions button').at(-1)?.trigger('click')

    expect(wrapper.emitted('update:selectedCardIds')?.at(-1)?.[0]).toEqual(['a', 'c'])
    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual(['a', 'c'])
  })

  it('keeps disabled cards visible but not selectable', async () => {
    const wrapper = mount(CardSelectorModal, {
      props: {
        title: '選擇卡片',
        cards,
        maxSelected: 1
      }
    })

    expect(wrapper.text()).toContain('不可選')
    await wrapper.findAll('.selector-card')[1]?.trigger('click')

    expect(wrapper.emitted('update:selectedCardIds')).toBeUndefined()
  })

  it('requires exact selection count when configured', async () => {
    const wrapper = mount(CardSelectorModal, {
      props: {
        title: '棄牌',
        cards,
        maxSelected: 2,
        minSelected: 2,
        requireExact: true
      }
    })

    const confirm = wrapper.findAll('.card-selector__actions button').at(-1)
    expect(confirm?.attributes('disabled')).toBeDefined()

    await wrapper.findAll('.selector-card')[0]?.trigger('click')
    expect(confirm?.attributes('disabled')).toBeDefined()

    await wrapper.findAll('.selector-card')[2]?.trigger('click')
    expect(confirm?.attributes('disabled')).toBeUndefined()
  })
})
