import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { FAMILY_COLOR } from '@/api/ontology'
import GraphLegendDots from './GraphLegendDots.vue'

describe('GraphLegendDots', () => {
  it('它應該依序顯示文件、技術與實作三項', () => {
    const wrapper = mount(GraphLegendDots)
    const items = wrapper.findAll('span.flex.items-center')

    expect(items.map((item) => item.text())).toEqual(['文件', '技術', '實作'])
  })

  it('它應該讓三個色點使用 FAMILY_COLOR 對應型別的背景色', () => {
    const wrapper = mount(GraphLegendDots)
    const dots = wrapper.findAll('span.w-2.h-2.rounded-full')

    expect(dots.map((dot) => (dot.element as HTMLElement).style.background)).toEqual([
      FAMILY_COLOR.documentation,
      FAMILY_COLOR.technique,
      FAMILY_COLOR.implementation,
    ])
  })
})
