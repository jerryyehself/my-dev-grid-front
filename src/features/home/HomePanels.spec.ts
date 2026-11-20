import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { GraphDto } from '@/api/graph'
import type { Project } from '@/api/projects'
import HomeView from './HomeView.vue'

const mockGraph = vi.hoisted(() => ({ dto: { nodes: [], edges: [] } as GraphDto }))
vi.mock('@/api/graph', () => ({
  fetchGraphOrDemo: () => Promise.resolve({ dto: mockGraph.dto, loadError: null }),
}))
const mockProjects = vi.hoisted(() => ({ list: [] as Project[] }))
vi.mock('@/api/projects', () => ({
  fetchProjects: () => Promise.resolve(mockProjects.list),
}))
vi.mock('@/api/articles', () => ({
  fetchArticles: () => Promise.resolve([]),
}))
// 畫布換成替身：記下收到的 props，不去跑力模擬
vi.mock('@/features/graph/KnowledgeGraphCanvas.vue', () => ({
  default: {
    props: ['label', 'highlightPath', 'homeMode'],
    template:
      '<div class="canvas" :aria-label="label" :data-route="highlightPath ? highlightPath.nodes.map((n) => n.label).join(\'>\') : \'\'" :data-home="homeMode" />',
  },
}))

const node = (id: string, type: GraphDto['nodes'][number]['type'], label: string, subtype: string | null = null) => ({
  id,
  type,
  label,
  created_at: null,
  subtype,
  url: null,
})
const edge = (source: string, target: string, predicate: string) => ({
  source,
  target,
  predicate,
  label: null,
  relation_id: null,
})

const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/articles', component: { template: '<div />' } },
      { path: '/articles/:id', name: 'article-detail', component: { template: '<div />' } },
      { path: '/projects', component: { template: '<div />' } },
      { path: '/graph', component: { template: '<div />' } },
    ],
  })

const mountHome = async () => {
  const wrapper = mount(HomeView, { global: { plugins: [router()] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  mockProjects.list = []
  mockGraph.dto = { nodes: [], edges: [] }
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})

describe('HomeView（C 版：路線當主角）', () => {
  it('它應該讓 H1 的畫面文字與 aria-label 去掉 <wbr> 和空白後內容一致', async () => {
    const wrapper = await mountHome()
    const h1 = wrapper.find('h1')

    const visible = h1.html().replace(/<wbr\s*\/?>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, '')
    const label = (h1.attributes('aria-label') ?? '').replace(/\s+/g, '')
    expect(label).not.toBe('')
    expect(label).toBe(visible)
  })

  it('它應該用主題句當 H1，而且沒有舊的「知識網路」標題、統計句與專案／近期文章欄', async () => {
    const wrapper = await mountHome()

    expect(wrapper.find('h1').text()).toBe('一位圖資背景後端工程師的工作心智模式')
    expect(wrapper.text()).not.toContain('知識網路')
    expect(wrapper.text()).not.toContain('條直接關係')
    expect(wrapper.text()).not.toContain('近期文章')
    expect(wrapper.text()).not.toContain('心智模型')
    expect(wrapper.find('.canvas').attributes('aria-label')).toBe('知識網路圖')
    expect(wrapper.find('.canvas').attributes('data-home')).toBeDefined()
  })

  it('它應該在沒有路線時顯示不列類別的標題與空狀態句，並隱藏換路線按鈕', async () => {
    mockGraph.dto = { nodes: [node('documentation-1', 'documentation', '一篇沒有關係的文章', 'post')], edges: [] }
    const wrapper = await mountHome()

    expect(wrapper.find('h2').text()).toBe('從一篇文章延伸的路線')
    expect(wrapper.text()).toContain('目前尚無從文章延伸的路線。文章與技術、實作建立關係後，路線會顯示在此。')
    expect(wrapper.text()).not.toContain('另一條路線')
    expect(wrapper.find('.canvas').attributes('data-route')).toBe('')
  })

  it('它應該在只有一條路線時組出標題、顯示每一站與動詞，並隱藏換路線按鈕', async () => {
    mockGraph.dto = {
      nodes: [
        node('documentation-1', 'documentation', 'Vue SPA 部署', 'post'),
        node('technique-1', 'technique', 'Vue 3'),
        node('implementation-1', 'implementation', 'my-dev-grid-front'),
      ],
      edges: [edge('documentation-1', 'technique-1', 'about'), edge('implementation-1', 'technique-1', 'uses')],
    }
    const wrapper = await mountHome()
    const card = wrapper.find('section[aria-labelledby="home-route-title"]')

    expect(card.find('h2').text()).toBe('從一篇文章延伸到技術與實作的路線')
    expect(card.text()).toContain('〈Vue SPA 部署〉')
    expect(card.text()).toContain('討論 ▸')
    expect(card.text()).toContain('被使用 ▸')
    expect(card.findAll('li')).toHaveLength(3)
    // li 不能用 display: contents，Safari 會把清單語意拿掉
    for (const li of card.findAll('li')) expect(li.classes()).not.toContain('contents')
    expect(card.find('button').exists()).toBe(false)
    // 同一條路線在圖上亮起
    expect(wrapper.find('.canvas').attributes('data-route')).toBe('Vue SPA 部署>Vue 3>my-dev-grid-front')
  })

  it('它應該在有多條路線時顯示「↻ 另一條路線」，按下去換成另一篇文章並跟著亮起', async () => {
    mockGraph.dto = {
      nodes: [
        node('documentation-1', 'documentation', '文章甲', 'post'),
        node('documentation-2', 'documentation', '文章乙', 'post'),
        node('technique-1', 'technique', 'Vue 3'),
      ],
      edges: [edge('documentation-1', 'technique-1', 'about'), edge('documentation-2', 'technique-1', 'about')],
    }
    const wrapper = await mountHome()
    const button = wrapper.find('button')

    expect(button.text()).toBe('↻另一條路線')
    // 圖示不被報讀：↻ 設 aria-hidden，按鈕名稱只剩文字
    expect(button.find('span[aria-hidden="true"]').text()).toBe('↻')
    expect(wrapper.find('.canvas').attributes('data-route')).toBe('文章甲>Vue 3')

    await button.trigger('click')
    expect(wrapper.find('.canvas').attributes('data-route')).toBe('文章乙>Vue 3')
    expect(wrapper.find('h2').text()).toBe('從一篇文章延伸到技術的路線')

    await button.trigger('click')
    expect(wrapper.find('.canvas').attributes('data-route')).toBe('文章甲>Vue 3')
  })

  it('它應該在最新收錄有資料時顯示「最新收錄」與「新」標記，沒有資料時整列不顯示', async () => {
    const empty = await mountHome()
    expect(empty.text()).not.toContain('最新收錄')

    mockProjects.list = [
      { id: '5', title: 'repo-a', desc: '', tags: [], started: '2026.10', createdDate: '2026-10-04', repo: 'repo-a' },
    ]
    const wrapper = await mountHome()

    expect(wrapper.text()).toContain('最新收錄')
    expect(wrapper.text()).toContain('實作')
    expect(wrapper.text()).toContain('repo-a')
    expect(wrapper.text()).toContain('新')
  })

  it('它應該在頁底放「全部實作 →」「全部文章 →」兩條連結', async () => {
    const wrapper = await mountHome()
    const links = wrapper.findAll('nav a').map((a) => [a.text(), a.attributes('href')])

    expect(links).toEqual([
      ['全部實作 →', '/projects'],
      ['全部文章 →', '/articles'],
    ])
  })
})
