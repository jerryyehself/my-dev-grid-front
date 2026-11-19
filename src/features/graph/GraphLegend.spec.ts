import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GraphLegendDots from './GraphLegendDots.vue'
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

  it.each(['type', 'overlay'] as const)('它應該在 %s 模式不顯示淡色線的說明', (colorMode) => {
    const wrapper = mount(GraphLegend, { props: { colorMode, showIndirect: false } })

    expect(wrapper.text()).not.toContain('淡色線')
    expect(wrapper.text()).not.toContain('沒再確認')
  })

  it('它應該只在 showIndirect 為 true 時顯示間接關聯', async () => {
    const wrapper = mount(GraphLegend, { props: { colorMode: 'type', showIndirect: false } })

    expect(wrapper.text()).not.toContain('間接關聯')
    await wrapper.setProps({ showIndirect: true })
    expect(wrapper.text()).toContain('間接關聯')
  })
})

describe('GraphLegend 的「關於」圖例', () => {
  it.each(['type', 'overlay'] as const)(
    '它應該在 %s 模式顯示「關於」：線上有一個空心圈',
    (colorMode) => {
      const wrapper = mount(GraphLegend, { props: { colorMode, showIndirect: false, hasAbout: true } })

      const item = wrapper.findAll('span.flex').find((el) => el.text() === '關於')
      expect(item).toBeDefined()
      const line = item!.find('span.relative')
      expect(line.classes()).toContain('border-t')
      expect(line.classes()).toContain('border-(--edge-real)')
      const ring = line.find('span.absolute')
      expect(ring.classes()).toContain('rounded-full')
      expect(ring.classes()).toContain('border-(--edge-real)')
      expect(ring.classes()).toContain('bg-(--canvas-bg)')
    },
  )

  it('它應該在圖上沒有「關於」連線時不列「關於」', async () => {
    const wrapper = mount(GraphLegend, { props: { colorMode: 'type', showIndirect: false } })
    expect(wrapper.text()).not.toContain('關於')

    await wrapper.setProps({ hasAbout: true })
    expect(wrapper.text()).toContain('關於')
  })
})

describe('GraphLegend（首頁版本）', () => {
  const counts = { documentation: 12, technique: 53, implementation: 19, edges: 153 }

  it('它應該把類別名稱保持「文件」，後面帶各類數量與直接關係條數', () => {
    const wrapper = mount(GraphLegend, {
      props: { colorMode: 'type', showIndirect: false, counts },
    })
    const text = wrapper.text().replace(/\s+/g, ' ')

    expect(text).toContain('文件 12')
    expect(text).toContain('技術 53')
    expect(text).toContain('實作 19')
    expect(text).toContain('直接關係153')
    expect(text).not.toContain('文章與文件')
  })

  it('它應該在沒給 counts 時（/graph）不印數字', () => {
    const wrapper = mount(GraphLegend, { props: { colorMode: 'type', showIndirect: false } })

    expect(wrapper.find('b').exists()).toBe(false)
  })

  it('它應該只在路線亮起時顯示「目前路線」', async () => {
    const wrapper = mount(GraphLegend, {
      props: { colorMode: 'type', showIndirect: false, counts },
    })
    expect(wrapper.text()).not.toContain('目前路線')

    await wrapper.setProps({ routeLit: true })
    expect(wrapper.text()).toContain('目前路線')
  })
})
