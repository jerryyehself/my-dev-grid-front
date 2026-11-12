import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { GraphDto } from '@/api/graph'
import KnowledgeGraphPanel from './KnowledgeGraphPanel.vue'
import StatusBoardPanel from './StatusBoardPanel.vue'

const graph: GraphDto = {
  nodes: [
    { id: 'documentation-1', type: 'documentation', label: 'd', created_at: null },
    { id: 'technique-1', type: 'technique', label: 't', created_at: null },
    { id: 'implementation-1', type: 'implementation', label: 'i', created_at: null },
  ],
  edges: [{ source: 'documentation-1', target: 'technique-1', predicate: 'specs', label: null, relation_id: null }],
}

vi.mock('@/api/graph', () => ({
  fetchGraphOrDemo: () => Promise.resolve({ dto: graph, loadError: null }),
}))
vi.mock('@/api/projects', () => ({
  fetchProjectsOrDemo: () => Promise.resolve({ projects: [], loadError: null }),
}))
vi.mock('@/api/articles', () => ({
  fetchArticles: () => Promise.resolve([]),
}))
vi.mock('@/features/graph/KnowledgeGraphCanvas.vue', () => ({
  default: { props: ['label'], template: '<div class="canvas" :aria-label="label" />' },
}))

const router = () =>
  createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})

describe('KnowledgeGraphPanel', () => {
  it('它應該用「知識網路」當標題與圖的說明，不寫「近期」（畫出來的是整張圖）', async () => {
    const wrapper = mount(KnowledgeGraphPanel, { global: { plugins: [router()] } })
    await flushPromises()

    expect(wrapper.find('h2').text()).toBe('知識網路')
    expect(wrapper.find('.canvas').attributes('aria-label')).toBe('知識網路圖')
    expect(wrapper.text()).not.toContain('近期')
    expect(wrapper.text()).toContain('1 份文件、1 項技術、1 個實作，共 1 條直接關係。')
  })
})

describe('StatusBoardPanel', () => {
  it('它應該只留「專案」「近期文章」兩個欄標題，不再有「近況板」標題與說明句', async () => {
    const wrapper = mount(StatusBoardPanel, { global: { plugins: [router()] } })
    await flushPromises()

    expect(wrapper.findAll('h2')).toHaveLength(0)
    expect(wrapper.findAll('h3').map((h) => h.text())).toEqual(['專案', '近期文章'])
    expect(wrapper.text()).not.toContain('近況板')
    expect(wrapper.text()).not.toContain('GitHub 上的公開專案')
  })
})
