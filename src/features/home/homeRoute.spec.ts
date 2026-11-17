import { describe, it, expect } from 'vitest'
import type { GraphDto, GraphEdgeDto, GraphNodeDto } from '@/api/graph'
import { buildHomeRoutes, canSwitchRoute, nextRouteIndex, routeTitle, titleOfRoute } from './homeRoute'

const node = (id: string, type: GraphNodeDto['type'], label: string, subtype: string | null = null): GraphNodeDto => ({
  id,
  type,
  label,
  created_at: null,
  subtype,
  url: null,
})
const edge = (source: string, target: string, predicate: string | null): GraphEdgeDto => ({
  source,
  target,
  predicate,
  label: null,
  relation_id: null,
})

const post = (n: number, label = `文章${n}`) => node(`documentation-${n}`, 'documentation', label, 'post')
const sourcesite = node('documentation-90', 'documentation', 'Vue 官方文件', 'sourcesite')
const vue = node('technique-1', 'technique', 'Vue 3')
const vite = node('technique-2', 'technique', 'Vite')
const front = node('implementation-1', 'implementation', 'my-dev-grid-front')

describe('routeTitle：路線卡標題依實際經過的類別組字', () => {
  it('它應該一類寫「到甲」、兩類寫「到甲與乙」，順序照路線', () => {
    expect(routeTitle(['technique'])).toBe('從一篇文章延伸到技術的路線')
    expect(routeTitle(['implementation'])).toBe('從一篇文章延伸到實作的路線')
    expect(routeTitle(['technique', 'implementation'])).toBe('從一篇文章延伸到技術與實作的路線')
    expect(routeTitle(['implementation', 'technique'])).toBe('從一篇文章延伸到實作與技術的路線')
  })

  it('它應該讓重複的類別只算一次（文章 → 技術 → 技術 只列「技術」）', () => {
    expect(routeTitle(['technique', 'technique'])).toBe('從一篇文章延伸到技術的路線')
    expect(routeTitle(['technique', 'implementation', 'technique'])).toBe(
      '從一篇文章延伸到技術與實作的路線',
    )
  })

  it('它應該在三類時用頓號接最後一類', () => {
    expect(routeTitle(['technique', 'implementation', 'documentation'])).toBe(
      '從一篇文章延伸到技術、實作與文件的路線',
    )
  })

  it('它應該在沒有任何類別（沒有路線）時退回不列類別的寫法', () => {
    expect(routeTitle([])).toBe('從一篇文章延伸的路線')
    expect(titleOfRoute(null)).toBe('從一篇文章延伸的路線')
  })
})

describe('換路線按鈕的顯示規則', () => {
  it('它應該只在不只一條路線時顯示（沒有路線、只有一條都隱藏）', () => {
    expect(canSwitchRoute(0)).toBe(false)
    expect(canSwitchRoute(1)).toBe(false)
    expect(canSwitchRoute(2)).toBe(true)
    expect(canSwitchRoute(40)).toBe(true)
  })

  it('它應該換到下一條並繞回第一條；沒有路線時留在 0', () => {
    expect(nextRouteIndex(0, 3)).toBe(1)
    expect(nextRouteIndex(2, 3)).toBe(0)
    expect(nextRouteIndex(0, 0)).toBe(0)
  })
})

describe('buildHomeRoutes：從圖譜資料算出從文章出發的路線', () => {
  it('它應該算出 文章 → 技術 → 實作，標題與動詞都對得上', () => {
    const dto: GraphDto = {
      nodes: [post(1, 'Vue SPA 部署'), vue, front],
      edges: [edge('documentation-1', 'technique-1', 'about'), edge('implementation-1', 'technique-1', 'uses')],
    }
    const routes = buildHomeRoutes(dto)

    expect(routes).toHaveLength(1)
    expect(routes[0]!.stations.map((s) => s.label)).toEqual(['Vue SPA 部署', 'Vue 3', 'my-dev-grid-front'])
    expect(routes[0]!.verbs).toEqual(['討論', '被使用'])
    expect(titleOfRoute(routes[0]!)).toBe('從一篇文章延伸到技術與實作的路線')
    expect(canSwitchRoute(routes.length)).toBe(false)
    // 給畫布亮起用的格式：站與段都在
    expect(routes[0]!.path.found).toBe(true)
    expect(routes[0]!.path.nodes).toHaveLength(3)
    expect(routes[0]!.path.edges).toHaveLength(2)
  })

  it('它應該算出 文章 → 實作 → 技術（aboutProject），動詞是 討論、使用', () => {
    const dto: GraphDto = {
      nodes: [post(1), vue, front],
      edges: [edge('documentation-1', 'implementation-1', 'aboutProject'), edge('implementation-1', 'technique-1', 'uses')],
    }
    const [route] = buildHomeRoutes(dto)

    expect(route!.verbs).toEqual(['討論', '使用'])
    expect(titleOfRoute(route!)).toBe('從一篇文章延伸到實作與技術的路線')
  })

  it('它應該在第一站之後沒有路時，留下一步就結束的較短路線', () => {
    const onlyTech: GraphDto = { nodes: [post(1), vue], edges: [edge('documentation-1', 'technique-1', 'about')] }
    expect(titleOfRoute(buildHomeRoutes(onlyTech)[0]!)).toBe('從一篇文章延伸到技術的路線')

    const onlyImpl: GraphDto = {
      nodes: [post(1), front],
      edges: [edge('documentation-1', 'implementation-1', 'aboutProject')],
    }
    expect(titleOfRoute(buildHomeRoutes(onlyImpl)[0]!)).toBe('從一篇文章延伸到實作的路線')
  })

  it('它應該讓 文章 → 技術 → 技術（需要）只在標題列一次「技術」', () => {
    const dto: GraphDto = {
      nodes: [post(1), vue, vite],
      edges: [edge('documentation-1', 'technique-1', 'about'), edge('technique-1', 'technique-2', 'requires')],
    }
    const [route] = buildHomeRoutes(dto)

    expect(route!.verbs).toEqual(['討論', '需要'])
    expect(titleOfRoute(route!)).toBe('從一篇文章延伸到技術的路線')
  })

  it('它應該只從文章出發：官方文件、沒有關係的文章都不產生路線', () => {
    const dto: GraphDto = {
      nodes: [post(1), post(2), sourcesite, vue, front],
      edges: [
        edge('documentation-90', 'technique-1', 'specs'),
        edge('implementation-1', 'technique-1', 'uses'),
      ],
    }

    expect(buildHomeRoutes(dto)).toEqual([])
  })

  it('它應該不經過官方文件或另一篇文章（只走技術與實作）', () => {
    const dto: GraphDto = {
      nodes: [post(1), post(2), sourcesite, vue, front],
      edges: [
        edge('documentation-1', 'technique-1', 'about'),
        edge('documentation-90', 'technique-1', 'specs'),
        edge('documentation-2', 'technique-1', 'about'),
        edge('implementation-1', 'technique-1', 'uses'),
      ],
    }
    const routes = buildHomeRoutes(dto)

    for (const r of routes) {
      expect(r.stations.slice(1).every((s) => s.type !== 'documentation')).toBe(true)
      expect(r.stations[0]!.subtype).toBe('post')
    }
    expect(routes).toHaveLength(2)
  })

  it('它應該在邊的方向與路線相反時仍標對動詞，並記下 storedDirection', () => {
    const dto: GraphDto = {
      nodes: [post(1), vue, front],
      // 技術 → 文章 方向存的 subjectOf；實作 → 技術 存的 uses
      edges: [edge('technique-1', 'documentation-1', 'subjectOf'), edge('implementation-1', 'technique-1', 'uses')],
    }
    const [route] = buildHomeRoutes(dto)

    expect(route!.verbs).toEqual(['討論', '被使用'])
    expect(route!.path.edges.map((e) => e.storedDirection)).toEqual(['reverse', 'reverse'])
  })

  it('它應該輪流排文章，讓「另一條路線」換的是文章；每篇文章內關係少的站優先', () => {
    const hub = node('technique-3', 'technique', 'laravel')
    const rare = node('technique-4', 'technique', 'visualization')
    const impls = [1, 2, 3].map((i) => node(`implementation-${i + 10}`, 'implementation', `impl-${i}`))
    const dto: GraphDto = {
      nodes: [post(1), post(2), hub, rare, ...impls],
      edges: [
        edge('documentation-1', 'technique-3', 'about'),
        edge('documentation-1', 'technique-4', 'about'),
        edge('documentation-2', 'technique-3', 'about'),
        ...impls.map((i) => edge(i.id, 'technique-3', 'uses')),
        edge('implementation-11', 'technique-4', 'uses'),
      ],
    }
    const routes = buildHomeRoutes(dto)

    // 第一條：文章 1 經過較少關係的 visualization；第二條換成文章 2
    expect(routes[0]!.stations.map((s) => s.label)).toEqual(['文章1', 'visualization', 'impl-1'])
    expect(routes[1]!.stations[0]!.label).toBe('文章2')
    // 同一份資料算兩次，順序一樣（沒有亂數）
    expect(buildHomeRoutes(dto).map((r) => r.stations.map((s) => s.id))).toEqual(
      routes.map((r) => r.stations.map((s) => s.id)),
    )
  })

  it('它應該讓跨類的兩步路排在只走一步或技術接技術的路前面（即使後者經過的站關係更少）', () => {
    const dto: GraphDto = {
      nodes: [post(1), vue, vite, front],
      edges: [
        // 文章 → vite → vite 的版本：vite 只有 2 條關係
        edge('documentation-1', 'technique-2', 'about'),
        edge('technique-2', 'technique-1', 'requires'),
        // 文章 → Vue 3 → 實作：Vue 3 有 3 條關係
        edge('documentation-1', 'technique-1', 'about'),
        edge('implementation-1', 'technique-1', 'uses'),
      ],
    }
    const routes = buildHomeRoutes(dto)

    expect(routes[0]!.stations.map((s) => s.type)).toEqual(['documentation', 'technique', 'implementation'])
    expect(routes.at(-1)!.stations.map((s) => s.type)).toEqual(['documentation', 'technique', 'technique'])
  })

  it('它應該忽略指向不存在節點的邊與自己連自己的邊，不丟錯', () => {
    const dto: GraphDto = {
      nodes: [post(1), vue],
      edges: [
        edge('documentation-1', 'technique-404', 'about'),
        edge('technique-1', 'technique-1', 'requires'),
        edge('documentation-1', 'technique-1', 'about'),
      ],
    }

    expect(buildHomeRoutes(dto)).toHaveLength(1)
  })

  it('它應該在空資料時回空陣列（首頁顯示沒有路線的空狀態）', () => {
    expect(buildHomeRoutes({ nodes: [], edges: [] })).toEqual([])
  })
})
