import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseStatTile from './BaseStatTile.vue'

describe('BaseStatTile', () => {
  it('它應該顯示 label 與非零 value', () => {
    const wrapper = mount(BaseStatTile, { props: { label: '實體', value: 20 } })

    expect(wrapper.get('span').text()).toBe('20')
    expect(wrapper.text()).toContain('實體')
    expect(wrapper.get('span').classes()).toContain('text-(--text-ink-main)')
  })

  it('它應該保留數字 0 並使用降對比的文字色', () => {
    const wrapper = mount(BaseStatTile, { props: { label: '子類', value: 0 } })
    const value = wrapper.get('span')

    expect(value.text()).toBe('0')
    expect(value.isVisible()).toBe(true)
    expect(value.classes()).toContain('text-(--text-ink-muted)/45')
  })

  it('它應該在非零 value 且 emphasis 時使用強調色', () => {
    const wrapper = mount(BaseStatTile, { props: { label: '實體', value: 20, emphasis: true } })

    expect(wrapper.get('span').classes()).toContain('text-(--text-accent)')
  })

  it('它應該在 value 為 0 且 emphasis 時仍保留降對比文字色', () => {
    const wrapper = mount(BaseStatTile, { props: { label: '實體', value: 0, emphasis: true } })
    const value = wrapper.get('span')

    expect(value.text()).toBe('0')
    expect(value.classes()).toContain('text-(--text-ink-muted)/45')
    expect(value.classes()).not.toContain('text-(--text-accent)')
  })
})
