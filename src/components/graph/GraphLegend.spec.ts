import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GraphLegendDots from '@/components/GraphLegendDots.vue'
import GraphLegend from './GraphLegend.vue'

describe('GraphLegend', () => {
  it('它應該在 type 模式顯示三個型別項目且不顯示時間色階', () => {
    const wrapper = mount(GraphLegend, { props: { colorMode: 'type', showIndirect: false } })

    expect(wrapper.text()).toContain('文件')
    expect(wrapper.text()).toContain('技術')
    expect(wrapper.text()).toContain('實作')
    expect(wrapper.text()).not.toContain('較舊')
    expect(wrapper.text()).not.toContain('較新')
  })

  it('它應該在 overlay 模式顯示時間色階與無日期項目且不顯示三個型別項目', () => {
    const wrapper = mount(GraphLegend, { props: { colorMode: 'overlay', showIndirect: false } })

    expect(wrapper.text()).toContain('較舊')
    expect(wrapper.text()).toContain('較新')
    expect(wrapper.text()).toContain('尚無建立時間資料')
    expect(wrapper.findComponent(GraphLegendDots).exists()).toBe(false)
  })

  it.each(['type', 'overlay'] as const)('它應該在 %s 模式一律顯示直接關係', (colorMode) => {
    const wrapper = mount(GraphLegend, { props: { colorMode, showIndirect: false } })

    expect(wrapper.text()).toContain('直接關係')
  })

  it('它應該只在 showIndirect 為 true 時顯示間接關聯', async () => {
    const wrapper = mount(GraphLegend, { props: { colorMode: 'type', showIndirect: false } })

    expect(wrapper.text()).not.toContain('間接關聯')
    await wrapper.setProps({ showIndirect: true })
    expect(wrapper.text()).toContain('間接關聯')
  })
})
