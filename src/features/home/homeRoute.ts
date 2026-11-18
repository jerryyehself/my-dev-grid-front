import type { GraphDto, GraphNodeType, GraphPathDto, GraphPathEdgeDto, GraphPathNodeDto } from '@/api/graph'
import { routeSegmentVerb } from '@/features/graph/graphRelationPhrase'
import { TYPE_LABEL } from '@/features/graph/graphTypes'

// 首頁路線卡的資料：從圖譜資料（GET /api/graph，跟畫布同一份）算出「從一篇文章出發」的路線，
// 不另外打 API。路線的形狀是文章 → 技術／實作 → 技術／實作，最多兩步；中間站只走技術和實作，
// 不經過官方文件或另一篇文章。

/** 路線上的一站；路線的第一站一定是文章（subtype = post） */
export interface RouteStation extends GraphPathNodeDto {
  subtype: string | null
}

export interface HomeRoute {
  /** 給畫布亮起用的格式（跟 /graph 路徑查詢同一個形狀） */
  path: GraphPathDto
  stations: RouteStation[]
  /** 每一段的中文動詞，長度是站數減一；動詞的主被動規則見 routeSegmentVerb */
  verbs: string[]
}

const WALKABLE: ReadonlySet<GraphNodeType> = new Set(['technique', 'implementation'])

/**
 * 路線卡標題：「從一篇文章延伸到{經過的類別}的路線」。類別只列路線實際經過的，依出現順序、
 * 重複的只算一次：一類「到甲」、兩類「到甲與乙」、三類「到甲、乙與丙」。沒有任何類別（沒有路線）
 * 時退回不列類別的寫法。
 */
export function routeTitle(types: readonly GraphNodeType[]): string {
  const labels = [...new Set(types)].map((t) => TYPE_LABEL[t])
  if (labels.length === 0) return '從一篇文章延伸的路線'
  const joined =
    labels.length === 1
      ? labels[0]!
      : `${labels.slice(0, -1).join('、')}與${labels[labels.length - 1]!}`
  return `從一篇文章延伸到${joined}的路線`
}

/** 這條路線的標題：類別取第二站起經過的站（第一站固定是文章，已經寫在「從一篇文章」裡） */
export function titleOfRoute(route: HomeRoute | null): string {
  return routeTitle(route ? route.stations.slice(1).map((s) => s.type) : [])
}

/** 「↻ 另一條路線」只在有東西可換時才顯示：沒有路線、只有一條路線，按了都不會變 */
export function canSwitchRoute(routeCount: number): boolean {
  return routeCount > 1
}

/** 換下一條，繞回第一條；沒有路線時回 0 */
export function nextRouteIndex(current: number, routeCount: number): number {
  return routeCount > 0 ? (current + 1) % routeCount : 0
}

/**
 * 從圖譜資料算出所有路線。排序決定「第一條」和換路線的順序（沒有亂數，每次載入同一份資料
 * 看到同一條）：
 * - 每篇文章內，跨類的兩步路（技術 ↔ 實作）優先，其次經過關係少的站（路過 laravel、Vue 這種樞紐的路太顯而易見，少見的技術比較有料）
 * - 文章之間輪流排（A 的第一條、B 的第一條、…再回到 A 的第二條），按「另一條路線」時換的是文章，
 *   不是同一篇文章的第二十條
 */
export function buildHomeRoutes(dto: GraphDto): HomeRoute[] {
  const nodes = new Map(dto.nodes.map((n) => [n.id, n]))
  // 只看直接關係；一對節點有好幾條邊時，取第一條決定動詞
  const adjacency = new Map<string, { other: string; edge: GraphDto['edges'][number] }[]>()
  const link = (from: string, other: string, edge: GraphDto['edges'][number]) => {
    if (!adjacency.has(from)) adjacency.set(from, [])
    const list = adjacency.get(from)!
    if (!list.some((x) => x.other === other)) list.push({ other, edge })
  }
  for (const e of dto.edges) {
    if (!nodes.has(e.source) || !nodes.has(e.target) || e.source === e.target) continue
    link(e.source, e.target, e)
    link(e.target, e.source, e)
  }
  const degree = (id: string) => adjacency.get(id)?.length ?? 0
  const walkable = (id: string) => WALKABLE.has(nodes.get(id)!.type)

  const toRoute = (ids: string[]): HomeRoute => {
    const stations: RouteStation[] = ids.map((id) => {
      const n = nodes.get(id)!
      return { id: n.id, type: n.type, label: n.label, subtype: n.subtype ?? null }
    })
    const edges: GraphPathEdgeDto[] = []
    const verbs: string[] = []
    for (let i = 0; i < ids.length - 1; i++) {
      const from = stations[i]!
      const to = stations[i + 1]!
      const edge = adjacency.get(from.id)!.find((x) => x.other === to.id)!.edge
      edges.push({
        source: edge.source,
        target: edge.target,
        predicate: edge.predicate,
        label: edge.label,
        relation_id: edge.relation_id,
        storedDirection: edge.source === from.id ? 'forward' : 'reverse',
        hasDefinedReverse: true,
      })
      verbs.push(
        routeSegmentVerb(
          { id: from.id, domainType: from.type, label: from.label, subtype: from.subtype },
          { id: to.id, domainType: to.type, label: to.label, subtype: to.subtype },
          edge,
        ),
      )
    }
    return {
      path: { found: true, nodes: stations.map(({ id, type, label }) => ({ id, type, label })), edges },
      stations,
      verbs,
    }
  }

  const starts = dto.nodes
    .filter((n) => n.type === 'documentation' && n.subtype === 'post')
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))

  const perStart: HomeRoute[][] = []
  for (const start of starts) {
    const idLists: string[][] = []
    for (const first of adjacency.get(start.id) ?? []) {
      if (!walkable(first.other)) continue
      const seconds = (adjacency.get(first.other) ?? []).filter(
        (x) => x.other !== start.id && walkable(x.other),
      )
      // 第一站之後沒有路可走，這一步本身就是一條（較短的）路線
      if (seconds.length === 0) idLists.push([start.id, first.other])
      for (const second of seconds) idLists.push([start.id, first.other, second.other])
    }
    // 跨類的兩步路（文章 → 技術 → 實作、文章 → 實作 → 技術）排最前：這是路線卡要講的「從文章走到
    // 技術與實作」；只走一步、或技術接技術（需要、版本）的路排後面
    const crossRank = (ids: string[]) =>
      ids.length === 3 && nodes.get(ids[1]!)!.type !== nodes.get(ids[2]!)!.type ? 0 : 1
    idLists.sort(
      (a, b) =>
        crossRank(a) - crossRank(b) ||
        degree(a[1]!) - degree(b[1]!) ||
        degree(a[2] ?? '') - degree(b[2] ?? '') ||
        nodes.get(a[1]!)!.label.localeCompare(nodes.get(b[1]!)!.label, 'zh-Hant') ||
        (nodes.get(a[2] ?? '')?.label ?? '').localeCompare(nodes.get(b[2] ?? '')?.label ?? '', 'zh-Hant'),
    )
    if (idLists.length) perStart.push(idLists.map(toRoute))
  }

  const routes: HomeRoute[] = []
  for (let i = 0; perStart.some((list) => i < list.length); i++) {
    for (const list of perStart) if (i < list.length) routes.push(list[i]!)
  }
  return routes
}
