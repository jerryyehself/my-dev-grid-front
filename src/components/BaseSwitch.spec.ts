import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseSwitch from './BaseSwitch.vue'

describe('BaseSwitch', () => {
  it('是 role="switch"，aria-checked 跟著 v-model', async () => {
    const wrapper = mount(BaseSwitch, {
      props: { label: '間接關聯', modelValue: false, 'onUpdate:modelValue': (v: boolean) => wrapper.setProps({ modelValue: v }) },
    })
    const button = wrapper.get('button')
    expect(button.attributes('role')).toBe('switch')
    expect(button.attributes('aria-checked')).toBe('false')
    expect(button.text()).toContain('間接關聯')

    await button.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(button.attributes('aria-checked')).toBe('true')
  })
})
