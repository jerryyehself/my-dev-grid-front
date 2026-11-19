import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { GraphNodeType, GraphPathDto } from '@/api/graph'
import GraphPathDiagram from './GraphPathDiagram.vue'

const node = (id: string, type: GraphNodeType, label: string) => ({ id, type, label })
const edge = (source: string, target: string, predicate: string | null) => ({
  source,
  target,
  predicate,
  label: null,
  relation_id: null,
  storedDirection: 'forward' as const,
  hasDefinedReverse: true,
})

const render = (path: GraphPathDto | null) => mount(GraphPathDiagram, { props: { path } })

describe('GraphPathDiagram', () => {
  it('它應該在路徑上標中文短動詞，不顯示英文述詞', () => {
    const wrapper = render({
      found: true,
      nodes: [
        node('documentation-1', 'documentation', 'Vue 官方文件'),
        node('technique-1', 'technique', 'Vue'),
        node('implementation-1', 'implementation', 'my-dev-grid'),
      ],
      edges: [edge('documentation-1', 'technique-1', 'specs'), edge('technique-1', 'implementation-1', 'usedBy')],
    })
    const text = wrapper.text()
    const segments = wrapper.findAll('text[font-size="11"]').map((t) => t.text().trim())

    expect(segments).toEqual(['說明 ▸', '被使用 ▸'])
    expect(text).toContain('說明 ▸')
    // 技術→實作這段的主詞是實作（實作使用技術）：箭頭仍順著路線方向，動詞改被動
    expect(text).toContain('被使用 ▸')
    expect(text).not.toContain('◂')
    expect(text).not.toMatch(/SPECS|USEDBY|USES/)
  })

  it('它應該一律讓箭頭順著路線方向，主詞在後一站時改用被動動詞', () => {
    const doc = node('documentation-1', 'documentation', 'Vue 官方文件')
    const tech = node('technique-1', 'technique', 'Vue')
    const impl = node('implementation-1', 'implementation', 'my-dev-grid')
    const req = node('technique-2', 'technique', 'Vite')
    const labels = (nodes: ReturnType<typeof node>[], edges: ReturnType<typeof edge>[]) => {
      const wrapper = render({ found: true, nodes, edges })
      expect(wrapper.text()).not.toContain('◂')
      // 只取段落標籤（font-size 11 的 <text>），回傳陣列讓 toContain 做完整比對，
      // 「說明 ▸」才不會被「被說明 ▸」當成子字串蒙混過去
      return wrapper.findAll('text[font-size="11"]').map((t) => t.text().trim())
    }

    // 主詞在前一站：主動
    expect(labels([doc, tech], [edge('documentation-1', 'technique-1', 'specs')])).toContain('說明 ▸')
    expect(labels([impl, tech], [edge('implementation-1', 'technique-1', 'uses')])).toContain('使用 ▸')
    // 主詞在後一站：被動，即使邊本身的方向是反的
    expect(labels([tech, doc], [edge('documentation-1', 'technique-1', 'specs')])).toContain('被說明 ▸')
    expect(labels([tech, doc], [edge('technique-1', 'documentation-1', 'specifiedBy')])).toContain('被說明 ▸')
    expect(labels([impl, doc], [edge('documentation-1', 'implementation-1', 'documents')])).toContain('被記錄 ▸')
    expect(labels([doc, impl], [edge('documentation-1', 'implementation-1', 'documents')])).toContain('記錄 ▸')
    // about／subjectOf：文章討論技術或實作；主詞在後一站時被動
    const article = node('documentation-2', 'documentation', 'Vue 入門筆記')
    expect(labels([article, tech], [edge('documentation-2', 'technique-1', 'about')])).toContain('討論 ▸')
    expect(labels([tech, article], [edge('documentation-2', 'technique-1', 'about')])).toContain('被討論 ▸')
    expect(labels([tech, article], [edge('technique-1', 'documentation-2', 'subjectOf')])).toContain('被討論 ▸')
    expect(labels([article, impl], [edge('documentation-2', 'implementation-1', 'about')])).toContain('討論 ▸')
    expect(labels([impl, article], [edge('documentation-2', 'implementation-1', 'about')])).toContain('被討論 ▸')
    // 同類：需要
    expect(labels([req, tech], [edge('technique-1', 'technique-2', 'requires')])).toContain('被需要 ▸')
    expect(labels([tech, req], [edge('technique-1', 'technique-2', 'requires')])).toContain('需要 ▸')
    // 版本的主詞是版本那一端
    const v3 = node('technique-3', 'technique', 'Vue 3')
    expect(labels([v3, tech], [edge('technique-3', 'technique-1', 'isVersionOf')])).toContain('版本 ▸')
    expect(labels([tech, v3], [edge('technique-3', 'technique-1', 'isVersionOf')])).toContain('有版本 ▸')
    expect(labels([tech, v3], [edge('technique-1', 'technique-3', 'hasVersion')])).toContain('有版本 ▸')
  })

  it('它應該讓相關不分主被動，兩個方向都標「相關 ▸」', () => {
    const a = node('technique-1', 'technique', 'Vue')
    const b = node('technique-2', 'technique', 'Vite')
    const e = [edge('technique-1', 'technique-2', null)]
    const forward = render({ found: true, nodes: [a, b], edges: e }).text()
    const backward = render({ found: true, nodes: [b, a], edges: e }).text()

    expect(forward).toContain('相關 ▸')
    expect(backward).toContain('相關 ▸')
    expect(backward).not.toContain('被相關')
  })

  it('它應該讓沒有述詞的同類關係標「相關」，不顯示「未命名」', () => {
    const wrapper = render({
      found: true,
      nodes: [node('technique-1', 'technique', 'Vue'), node('technique-2', 'technique', 'Vite')],
      edges: [edge('technique-1', 'technique-2', null)],
    })

    expect(wrapper.text()).toContain('相關 ▸')
    expect(wrapper.text()).not.toContain('未命名')
  })

  it('它應該在找不到路徑時只留一句話，不用「節點」，也不重述同一件事', () => {
    const wrapper = render({ found: false, nodes: [], edges: [] })

    expect(wrapper.text()).toBe('這兩個條目之間沒有路徑')
  })

  describe('捲動提示', () => {
    const longPath: GraphPathDto = {
      found: true,
      nodes: [
        node('documentation-1', 'documentation', 'Vue 官方文件'),
        node('technique-1', 'technique', 'Vue'),
        node('implementation-1', 'implementation', 'my-dev-grid'),
        node('technique-2', 'technique', 'Vite'),
      ],
      edges: [edge('documentation-1', 'technique-1', 'specs'), edge('technique-1', 'implementation-1', 'usedBy'), edge('implementation-1', 'technique-2', 'uses')],
    }

    // jsdom 不排版，scrollWidth／clientWidth 永遠是 0：在捲動容器上蓋掉這兩個值模擬窄螢幕
    const mountWithSize = async (scrollWidth: number, clientWidth: number) => {
      const wrapper = mount(GraphPathDiagram, { props: { path: longPath }, attachTo: document.body })
      const scroller = wrapper.find('[data-testid="path-scroller"]')
      Object.defineProperty(scroller.element, 'scrollWidth', { configurable: true, value: scrollWidth })
      Object.defineProperty(scroller.element, 'clientWidth', { configurable: true, value: clientWidth })
      return { wrapper, scroller }
    }
    const scrollTo = async (scroller: Awaited<ReturnType<typeof mountWithSize>>['scroller'], left: number) => {
      ;(scroller.element as HTMLElement).scrollLeft = left
      await scroller.trigger('scroll')
    }
    const fades = (scroller: Awaited<ReturnType<typeof mountWithSize>>['scroller']) => ({
      start: scroller.attributes('data-fade-start') !== undefined,
      end: scroller.attributes('data-fade-end') !== undefined,
    })

    let unmount: (() => void) | null = null
    afterEach(() => {
      unmount?.()
      unmount = null
    })

    it('它應該在內容放得下時兩側都不淡出，也不多一個 Tab 停點', async () => {
      const { wrapper, scroller } = await mountWithSize(700, 1000)
      unmount = () => wrapper.unmount()
      await scrollTo(scroller, 0)

      expect(fades(scroller)).toEqual({ start: false, end: false })
      expect(scroller.attributes('tabindex')).toBeUndefined()
    })

    it.each([
      { where: '起點', left: 0, expected: { start: false, end: true } },
      { where: '中間', left: 150, expected: { start: true, end: true } },
      { where: '終點', left: 310, expected: { start: true, end: false } },
    ])('它應該在捲到$where時只淡出還有內容的那一側', async ({ left, expected }) => {
      const { wrapper, scroller } = await mountWithSize(700, 390)
      unmount = () => wrapper.unmount()
      await scrollTo(scroller, left)

      expect(fades(scroller)).toEqual(expected)
      expect(scroller.attributes('tabindex')).toBe('0')
    })

    it('它應該在視窗變寬到放得下時拿掉淡出', async () => {
      const { wrapper, scroller } = await mountWithSize(700, 390)
      unmount = () => wrapper.unmount()
      await scrollTo(scroller, 0)
      expect(fades(scroller).end).toBe(true)

      Object.defineProperty(scroller.element, 'clientWidth', { configurable: true, value: 800 })
      window.dispatchEvent(new Event('resize'))
      await wrapper.vm.$nextTick()

      expect(fades(scroller)).toEqual({ start: false, end: false })
    })
  })
})

