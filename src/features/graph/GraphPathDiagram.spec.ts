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

    expect(text).toContain('說明 ▸')
    // 技術→實作這段的主詞是實作（實作使用技術），箭頭要指回前一站
    expect(text).toContain('◂ 使用')
    expect(text).not.toMatch(/SPECS|USEDBY|USES/)
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
