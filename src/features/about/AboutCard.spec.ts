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

  it('它應該把 http／https 開頭的連結畫成開新分頁的 <a>，並帶 noopener noreferrer', () => {
    const wrapper = mountCard(card([{ label: '論文', to: 'https://example.com/thesis' }]))

    const a = wrapper.get('a')
    expect(a.attributes('href')).toBe('https://example.com/thesis')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener noreferrer')
    expect(a.text()).toContain('論文')
    expect(a.text()).toContain('↗')
    expect(a.find('.sr-only').text()).toBe('（另開新分頁）')
  })

  it('它應該讓站內路徑繼續走 router-link，不開新分頁、也不加 ↗', () => {
    const wrapper = mountCard(card([{ label: '站內', to: '/articles/1' }]))

    const a = wrapper.get('a')
    expect(a.attributes('href')).toBe('/articles/1')
    expect(a.attributes('target')).toBeUndefined()
    expect(a.attributes('rel')).toBeUndefined()
    expect(a.text()).toBe('站內')
  })

  it('它應該只把 http／https 開頭的當站外：長得像但不是的仍走站內路由', () => {
    const wrapper = mountCard(
      card([
        { label: '近似', to: 'httpfoo/bar' },
        { label: '寫在路徑裡', to: '/redirect/https://example.com' },
      ]),
    )

    for (const a of wrapper.findAll('a')) {
      expect(a.attributes('target')).toBeUndefined()
      expect(a.text()).not.toContain('↗')
    }
    expect(wrapper.findAll('a')).toHaveLength(2)
  })
})
