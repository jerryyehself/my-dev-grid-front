import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseInput from './BaseInput.vue'

describe('BaseInput', () => {
  it('它應該將輸入的文字以字串送出', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } })

    await wrapper.get('input').setValue('新的標題')

    expect(wrapper.emitted('update:modelValue')).toEqual([['新的標題']])
  })

  it('它應該預設使用 text 輸入類型', () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } })

    expect(wrapper.get('input').attributes('type')).toBe('text')
  })

  it.each(['password', 'email'] as const)('它應該套用傳入的 %s 輸入類型', (type) => {
    const wrapper = mount(BaseInput, { props: { modelValue: '', type } })

    expect(wrapper.get('input').attributes('type')).toBe(type)
  })

  it('它應該依 disabled 決定 input 的停用狀態', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } })
    const input = wrapper.get('input')

    expect(input.element.disabled).toBe(false)
    await wrapper.setProps({ disabled: true })
    expect(input.attributes()).toHaveProperty('disabled')
    expect(input.element.disabled).toBe(true)
  })

  it('它應該預設套用 default 樣式的代表 class', () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } })

    expect(wrapper.get('input').classes()).toContain('rounded-[6px]')
    expect(wrapper.get('input').classes()).not.toContain('bg-transparent')
  })

  it.each([
    { variant: 'default', present: 'rounded-[6px]', absent: 'bg-transparent' },
    { variant: 'inline', present: 'bg-transparent', absent: 'rounded-[6px]' },
  ] as const)('它應該為 $variant 套用各自的代表 class', ({ variant, present, absent }) => {
    const wrapper = mount(BaseInput, { props: { modelValue: '', variant } })

    expect(wrapper.get('input').classes()).toContain(present)
    expect(wrapper.get('input').classes()).not.toContain(absent)
  })
})
