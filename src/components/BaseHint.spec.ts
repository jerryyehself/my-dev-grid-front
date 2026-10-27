import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseHint from './BaseHint.vue'

describe('BaseHint', () => {
  it('它應該顯示 slot 的提示文字', () => {
    const wrapper = mount(BaseHint, { slots: { default: '請選擇類型' } })

    expect(wrapper.text()).toBe('請選擇類型')
  })

  it('它應該預設使用 opacity-75', () => {
    const wrapper = mount(BaseHint)

    expect(wrapper.classes()).toContain('opacity-75')
  })

  it('它應該在 dim 時改用 opacity-60', () => {
    const wrapper = mount(BaseHint, { props: { dim: true } })

    expect(wrapper.classes()).toContain('opacity-60')
    expect(wrapper.classes()).not.toContain('opacity-75')
  })

  it.each([false, true])('它應該在 error tone 套用錯誤色且不套用 opacity，dim=%s', (dim) => {
    const wrapper = mount(BaseHint, { props: { tone: 'error', dim } })

    expect(wrapper.classes()).toContain('text-(--text-error)')
    expect(wrapper.classes().some((name) => name.startsWith('opacity-'))).toBe(false)
  })
})
