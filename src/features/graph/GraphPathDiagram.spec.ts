import { describe, it, expect } from 'vitest'
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
    // about／subjectOf：文章談到技術或實作；主詞在後一站時被動
    const article = node('documentation-2', 'documentation', 'Vue 入門筆記')
    expect(labels([article, tech], [edge('documentation-2', 'technique-1', 'about')])).toContain('談到 ▸')
    expect(labels([tech, article], [edge('documentation-2', 'technique-1', 'about')])).toContain('被談到 ▸')
    expect(labels([tech, article], [edge('technique-1', 'documentation-2', 'subjectOf')])).toContain('被談到 ▸')
    expect(labels([article, impl], [edge('documentation-2', 'implementation-1', 'about')])).toContain('談到 ▸')
    expect(labels([impl, article], [edge('documentation-2', 'implementation-1', 'about')])).toContain('被談到 ▸')
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

    expect(wrapper.text()).toBe('這兩項之間沒有路徑')
  })
})
