import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BuilderBuildModal from '~~/app/components/game/BuilderBuildModal.vue'

describe('BuilderBuildModal', () => {
  it('disables duplicate city buildings and unaffordable cards', () => {
    const wrapper = mount(BuilderBuildModal, {
      props: {
        handCardIds: ['smithy', 'city_hall'],
        builtCityCardIds: ['smithy'],
        isPrivileged: false
      }
    })

    expect(wrapper.findAll('.selector-card').find(button => button.text().includes('Smithy'))?.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('.selector-card').find(button => button.text().includes('City Hall'))?.attributes('disabled')).toBeDefined()
  })

  it('moves to payment step and emits build payload after exact payment', async () => {
    const wrapper = mount(BuilderBuildModal, {
      props: {
        handCardIds: ['smithy', 'market_stand', 'sugar_mill'],
        builtCityCardIds: [],
        isPrivileged: true
      }
    })

    await wrapper.findAll('.selector-card').find(button => button.text().includes('Sugar Mill'))?.trigger('click')
    await wrapper.findAll('.card-selector__actions button').at(-1)?.trigger('click')

    expect(wrapper.text()).toContain('你必須支付 1 張手牌')

    await wrapper.findAll('.selector-card')[0]?.trigger('click')
    await wrapper.findAll('.card-selector__actions button').at(-1)?.trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual({
      cardId: 'sugar_mill',
      payment: ['smithy']
    })
  })
})
