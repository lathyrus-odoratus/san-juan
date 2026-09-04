import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProducerFactoryModal from '~~/app/components/game/ProducerFactoryModal.vue'

const factories = [
  { id: 'indigo_plant', title: 'Indigo Plant' },
  { id: 'sugar_mill', title: 'Sugar Mill' },
  { id: 'coffee_roaster', title: 'Coffee Roaster', disabled: true, disabledReason: '已有貨物' }
]

describe('ProducerFactoryModal', () => {
  it('limits normal players to one factory', async () => {
    const wrapper = mount(ProducerFactoryModal, {
      props: {
        factories,
        isPrivileged: false
      }
    })

    await wrapper.findAll('.selector-card')[0]?.trigger('click')
    await wrapper.findAll('.selector-card')[1]?.trigger('click')

    expect(wrapper.text()).toContain('1 / 1')
  })

  it('allows privileged players to confirm two factories after result confirmation', async () => {
    const wrapper = mount(ProducerFactoryModal, {
      props: {
        factories,
        isPrivileged: true
      }
    })

    await wrapper.findAll('.selector-card')[0]?.trigger('click')
    await wrapper.findAll('.selector-card')[1]?.trigger('click')
    await wrapper.findAll('.card-selector__actions button').at(-1)?.trigger('click')
    await wrapper.find('section[role="dialog"] footer button').trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual(['indigo_plant', 'sugar_mill'])
  })
})
