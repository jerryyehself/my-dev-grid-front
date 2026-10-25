import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseLoadingBlock from './BaseLoadingBlock.vue'

describe('BaseLoadingBlock', () => {
  it('它應該顯示 slot 的載入文字', () => {
    const wrapper = mount(BaseLoadingBlock, { props: { height: '200px' }, slots: { default: '載入中' } })

    expect(wrapper.text()).toBe('載入中')
  })

  it('它應該將 height 套用為 inline style 並隨 prop 更新', async () => {
    const wrapper = mount(BaseLoadingBlock, { props: { height: '200px' } })

    expect(wrapper.element.style.height).toBe('200px')
    await wrapper.setProps({ height: '12rem' })
    expect(wrapper.element.style.height).toBe('12rem')
  })

  it('它應該在預設與 error tone 使用不同的文字色', async () => {
    const wrapper = mount(BaseLoadingBlock, { props: { height: '200px' } })

    expect(wrapper.classes()).toContain('text-(--text-ink-body)/40')
    await wrapper.setProps({ tone: 'error' })
    expect(wrapper.classes()).toContain('text-(--text-error)')
    expect(wrapper.classes()).not.toContain('text-(--text-ink-body)/40')
  })
})
