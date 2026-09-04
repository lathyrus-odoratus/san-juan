import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TraderGoodsModal from '~~/app/components/game/TraderGoodsModal.vue'

describe('TraderGoodsModal', () => {
  it('shows current prices and emits selected goods', async () => {
    const wrapper = mount(TraderGoodsModal, {
      props: {
        factories: [
          { id: 'indigo_plant', title: 'Indigo Plant', meta: 'indigo' },
          { id: 'sugar_mill', title: 'Sugar Mill', meta: 'sugar' },
          { id: 'coffee_roaster', title: 'Coffee Roaster', disabled: true, disabledReason: '無貨物' }
        ],
        prices: { indigo: 1, sugar: 2 },
        isPrivileged: true
      }
    })

    expect(wrapper.text()).toContain('抽 1 張')
    expect(wrapper.text()).toContain('抽 2 張')

    await wrapper.findAll('.selector-card')[0]?.trigger('click')
    await wrapper.findAll('.selector-card')[1]?.trigger('click')
    await wrapper.findAll('.card-selector__actions button').at(-1)?.trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual(['indigo_plant', 'sugar_mill'])
  })
})
