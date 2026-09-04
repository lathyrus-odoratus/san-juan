import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppFooter from '~~/app/components/AppFooter.vue'
import packageInfo from '~~/package.json'

describe('AppFooter', () => {
  it('renders shared footer content with app version', () => {
    const wrapper = mount(AppFooter, {
      slots: {
        default: '<span>第 1 回合</span>'
      }
    })

    expect(wrapper.text()).toContain('第 1 回合')
    expect(wrapper.text()).toContain(`v${packageInfo.version}`)
  })
})
