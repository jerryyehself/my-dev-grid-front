import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseEyebrow from './BaseEyebrow.vue'

describe('BaseEyebrow', () => {
  it('它應該顯示 slot 的標題文字', () => {
    const wrapper = mount(BaseEyebrow, { slots: { default: '欄位標題' } })

    expect(wrapper.text()).toBe('欄位標題')
  })

  it('它應該預設使用 11px 字級', () => {
    const wrapper = mount(BaseEyebrow)

    expect(wrapper.classes()).toContain('text-[11px]')
  })

  it('它應該在 field size 使用 10px 字級', () => {
    const wrapper = mount(BaseEyebrow, { props: { size: 'field' } })

    expect(wrapper.classes()).toContain('text-[10px]')
    expect(wrapper.classes()).not.toContain('text-[11px]')
  })
})
