import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AboutCard from './AboutCard.vue'
import type { AboutCardData } from './aboutCards'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }],
})

const Sketch = { template: '<svg role="img" aria-label="草圖" />' }

function card(links: AboutCardData['links']): AboutCardData {
  return { id: 'demo', title: '示範卡', situation: '一句情境', links, sketch: Sketch }
}

const mountCard = (data: AboutCardData) =>
  mount(AboutCard, { props: { card: data }, global: { plugins: [router] } })

describe('AboutCard', () => {
  it('它應該在沒有連結時不畫「確認詳情」，也不畫任何連結或提示文字', () => {
    const wrapper = mountCard(card([]))

    expect(wrapper.text()).toBe('示範卡一句情境')
    expect(wrapper.text()).not.toContain('確認詳情')
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('svg[role="img"]').exists()).toBe(true)
  })

  it('它應該在有連結時畫出「確認詳情」與每個連結', () => {
    const wrapper = mountCard(
      card([
        { label: '第一篇', to: '/articles/1' },
        { label: '第二篇', to: '/articles/2' },
      ]),
    )

    expect(wrapper.text()).toContain('確認詳情')
    const links = wrapper.findAll('a')
    expect(links.map((a) => a.text())).toEqual(['第一篇', '第二篇'])
    expect(links.map((a) => a.attributes('href'))).toEqual(['/articles/1', '/articles/2'])
  })
})
