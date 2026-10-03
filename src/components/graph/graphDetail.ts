import type { GraphDto, GraphNodeType } from '@/api/graph'
import type { GraphPocNodeSelection } from '@/data/graphPocData'
import { relationFromNode } from '@/components/graphRelationPhrase'
import { computeDerivedEdges } from './derivedEdges'

// /graph 詳情卡的表格資料（點節點／連線之後「連到誰、什麼關係」）。純邏輯，不碰畫布，
// 2D 跟 3D 共用同一份：兩邊都是同一支 GET /api/graph，節點 id 一樣，詳情卡只要拿到 id，
// 其餘名稱、類別、關係都從這裡查，不依賴各自力模擬物件裡的欄位。

export interface DetailNode {
  id: string
  label: string
  domainType: GraphNodeType
}

export interface RelationGroup {
  /** 從選中節點看出去的關係名稱（見 graphRelationPhrase.ts 的 relationFromNode） */
  label: string
  /** 這一組連到的節點類別；關係由兩端類別決定，同一組一定同類 */
  otherType: GraphNodeType
  nodes: DetailNode[]
}

export interface IndirectRelation {
  node: DetailNode
  /** 兩邊都連到的節點 */
  via: DetailNode[]
}

export interface GraphDetailIndex {
  nodes: Map<string, DetailNode & { subtype: string | null; url: string | null }>
  /** 直接關係的鄰居（無向；同一對節點有好幾條邊也只算一次） */
  neighbors: Map<string, Set<string>>
  /** 間接關聯（跟畫布同一套推算，見 derivedEdges.ts），key 是節點 id */
  indirect: Map<string, { other: string; via: string[] }[]>
  maxDegree: number
}

const DEPTH_ORDER: GraphNodeType[] = ['documentation', 'technique', 'implementation']

const byLabel = (a: DetailNode, b: DetailNode) => a.label.localeCompare(b.label, 'zh-Hant')

export function buildGraphDetailIndex(dto: GraphDto): GraphDetailIndex {
  const nodes: GraphDetailIndex['nodes'] = new Map(
    dto.nodes.map((n) => [
      n.id,
      {
        id: n.id,
        label: n.label,
        domainType: n.type,
        subtype: n.subtype ?? null,
        url: n.url ?? null,
      },
    ]),
  )
  const neighbors = new Map<string, Set<string>>()
  const add = (a: string, b: string) => {
    if (!neighbors.has(a)) neighbors.set(a, new Set())
    neighbors.get(a)!.add(b)
  }
  for (const e of dto.edges) {
    // 指到不存在節點的邊（資料不一致）略過，不在表格裡顯示一個查不到名稱的 id
    if (!nodes.has(e.source) || !nodes.has(e.target) || e.source === e.target) continue
    add(e.source, e.target)
    add(e.target, e.source)
  }

  const indirect = new Map<string, { other: string; via: string[] }[]>()
  const derived = computeDerivedEdges(
    [...nodes.values()].map((n) => ({ id: n.id, domainType: n.domainType })),
    dto.edges.filter((e) => nodes.has(e.source) && nodes.has(e.target)),
  )
  for (const d of derived) {
    for (const [self, other] of [
      [d.source, d.target],
      [d.target, d.source],
    ] as const) {
      if (!indirect.has(self)) indirect.set(self, [])
      indirect.get(self)!.push({ other, via: d.via })
    }
  }

  const maxDegree = Math.max(1, ...[...neighbors.values()].map((s) => s.size))
  return { nodes, neighbors, indirect, maxDegree }
}

/**
 * 選中節點的直接關係，依「關係名稱」分組。跨類別的組照文件→技術→實作排，同類的組放最後
 * （同類之間沒有動詞，只是「相關」，資訊量最少）；組內依名稱排序。
 */
export function relationGroupsOf(index: GraphDetailIndex, id: string): RelationGroup[] {
  const self = index.nodes.get(id)
  if (!self) return []
  const byType = new Map<GraphNodeType, DetailNode[]>()
  for (const otherId of index.neighbors.get(id) ?? []) {
    const other = index.nodes.get(otherId)!
    if (!byType.has(other.domainType)) byType.set(other.domainType, [])
    byType.get(other.domainType)!.push(toDetail(other))
  }
  const order = [...DEPTH_ORDER.filter((t) => t !== self.domainType), self.domainType]
  return order
    .filter((t) => byType.has(t))
    .map((t) => ({
      label: relationFromNode(self.domainType, t),
      otherType: t,
      nodes: byType.get(t)!.sort(byLabel),
    }))
}

/** 選中節點的間接關聯（推算出來的），共同連到的節點越多排越前面 */
export function indirectRelationsOf(index: GraphDetailIndex, id: string): IndirectRelation[] {
  return (index.indirect.get(id) ?? [])
    .map(({ other, via }) => ({
      node: toDetail(index.nodes.get(other)!),
      via: via.map((v) => toDetail(index.nodes.get(v)!)).sort(byLabel),
    }))
    .sort((a, b) => b.via.length - a.via.length || byLabel(a.node, b.node))
}

/** 詳情卡裡點了某個節點名稱：組出跟畫布點節點時一樣的選取格式 */
export function nodeSelectionOf(index: GraphDetailIndex, id: string): GraphPocNodeSelection | null {
  const n = index.nodes.get(id)
  if (!n) return null
  const degree = index.neighbors.get(id)?.size ?? 0
  return {
    kind: 'node',
    id: n.id,
    label: n.label,
    domainType: n.domainType,
    weight: degree / index.maxDegree,
    degree,
    subtype: n.subtype,
    url: n.url,
  }
}

export function detailNodeOf(index: GraphDetailIndex | null, id: string): DetailNode | null {
  const n = index?.nodes.get(id)
  return n ? toDetail(n) : null
}

function toDetail(n: DetailNode): DetailNode {
  return { id: n.id, label: n.label, domainType: n.domainType }
}
