import type { GraphDto, GraphNodeType } from '@/api/graph'
import type { GraphPocNodeSelection } from '@/data/graphPocData'
import { HAS_VERSION, VERSION_OF, relationFromNode } from '@/components/graphRelationPhrase'
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
  /** 「關係」欄的簡短標示：對方的類別，或「版本」（見 graphRelationPhrase.ts 的 relationFromNode） */
  label: string
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
  /** 主技術 id → 它的版本 id（isVersionOf／hasVersion 邊） */
  versions: Map<string, Set<string>>
  /** 間接關聯（跟畫布同一套推算，見 derivedEdges.ts），key 是節點 id */
  indirect: Map<string, { other: string; via: string[] }[]>
  maxDegree: number
}

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
  const versions = new Map<string, Set<string>>()
  for (const e of dto.edges) {
    // 指到不存在節點的邊（資料不一致）略過，不在表格裡顯示一個查不到名稱的 id
    if (!nodes.has(e.source) || !nodes.has(e.target) || e.source === e.target) continue
    add(e.source, e.target)
    add(e.target, e.source)
    const pair =
      e.predicate === VERSION_OF
        ? [e.target, e.source]
        : e.predicate === HAS_VERSION
          ? [e.source, e.target]
          : null
    if (pair) {
      if (!versions.has(pair[0]!)) versions.set(pair[0]!, new Set())
      versions.get(pair[0]!)!.add(pair[1]!)
    }
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
  return { nodes, neighbors, versions, indirect, maxDegree }
}

/**
 * 選中節點的直接關係，依「關係」欄的標示分組：版本、技術、實作、文件；組內依名稱排序。
 */
const GROUP_ORDER = ['版本', '技術', '實作', '文件']

export function relationGroupsOf(index: GraphDetailIndex, id: string): RelationGroup[] {
  if (!index.nodes.has(id)) return []
  const myVersions = index.versions.get(id)
  const byLabel_ = new Map<string, DetailNode[]>()
  for (const otherId of index.neighbors.get(id) ?? []) {
    const other = index.nodes.get(otherId)!
    const label = relationFromNode(other.domainType, myVersions?.has(otherId) ?? false)
    if (!byLabel_.has(label)) byLabel_.set(label, [])
    byLabel_.get(label)!.push(toDetail(other))
  }
  return GROUP_ORDER.filter((l) => byLabel_.has(l)).map((label) => ({
    label,
    nodes: byLabel_.get(label)!.sort(byLabel),
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
