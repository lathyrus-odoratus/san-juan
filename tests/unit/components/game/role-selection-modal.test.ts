import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RoleSelectionModal from '~~/app/components/game/RoleSelectionModal.vue'

describe('RoleSelectionModal', () => {
  it('shows selected role owner and disables that role', () => {
    const wrapper = mount(RoleSelectionModal, {
      props: {
        selectedRoles: [{ role: 'Builder', playerId: 'p1' }],
        playerNamesById: { p1: 'Alice' }
      }
    })

    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.findAll('.role-card').find(button => button.text().includes('Builder'))?.attributes('disabled')).toBeDefined()
  })

  it('emits selected role when confirming an available role', async () => {
    const wrapper = mount(RoleSelectionModal, {
      props: {
        selectedRoles: [{ role: 'Builder', playerId: 'p1' }],
        playerNamesById: { p1: 'Alice' }
      }
    })

    await wrapper.findAll('.role-card').find(button => button.text().includes('Producer'))?.trigger('click')
    await wrapper.findAll('footer button').at(-1)?.trigger('click')

    expect(wrapper.emitted('confirm')?.[0]?.[0]).toBe('Producer')
  })
})
