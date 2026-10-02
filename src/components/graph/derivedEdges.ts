import type { GraphNodeType } from '@/api/graph'
import { endpointId } from './graphTypes'

// 推導邊（bipartite network projection / one-mode projection，見
// https://en.wikipedia.org/wiki/Bipartite_network_projection）：這個 ontology
// 幾乎每條真實邊都是跨類別（文件指定技術、技術用在實作上，見 SaveReposDataService
// 註解），導致同類別節點之間完全沒有視覺連結——但兩個 Implementation 如果用了
// 同一項 Technique，或兩份 Documentation 指定了同一項 Technique，這種「同 scope
// 潛在關聯」在概念上是存在的，只是資料庫沒有這張表存這種關聯。
// 只投影 Documentation／Implementation 這兩種類別，刻意不含 Technique：
// Technique 自己就有真實的同類別關聯（entity_relations 的 requires，例如
// framework→base language），不需要這層推導；而且 Technique 節點常常是「一個
// repo 用了 10 種技術」這種高度數的中介，真的算過一輪就爆量——實測拿玩具資料
// 快照跑，含 Technique 會生出 53 條推導邊，拿掉之後剩 1 條，才是真的有意義的
// 訊號，不是雜訊。
//
// 門檻依類別而不同（不是全部用同一個數字）：拿真實資料庫（16 個 repo、
// 84 條 technique-implementation 連結）實測過，Implementation 只要「共用
// ≥1 項技術」就算數的話會冒出 60 條推導邊（120 種可能配對的一半，等於幾乎
// 每兩個 repo 都被判定相關，訊號被稀釋成雜訊）；改成「共用 ≥3 項技術」降到
// 21 條，扣掉本來就已經有真實關聯的配對後剩 18 條，數量跟訊噪比才合理。
// Documentation 目前每份文件通常只連到 1 項技術（見 SaveReposDataService
// 的 link_official_docs()），門檻拉到跟 Implementation 一樣高只會讓
// Documentation 永遠生不出任何推導邊，所以維持 ≥1。
export const DERIVED_EDGE_MIN_SHARED: Partial<Record<GraphNodeType, number>> = {
  documentation: 1,
  implementation: 3,
}

export interface DerivedNodeInput {
  id: string
  domainType: GraphNodeType
}
export interface DerivedLinkInput {
  source?: string | number | { id: string }
  target?: string | number | { id: string }
}
export interface DerivedEdge {
  source: string
  target: string
  predicate: null
  derived: true
  via: string[]
}

export function computeDerivedEdges(nodes: DerivedNodeInput[], realLinks: DerivedLinkInput[]): DerivedEdge[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const neighbors = new Map<string, Set<string>>()
  // 已經有真實同類別關聯的配對記下來，等一下推導的時候跳過——真的知道的事實
  // 優先於算出來的猜測，不要疊床架屋(同一對節點又是實線又是虛線)。
  const realSameTypePairs = new Set<string>()
  for (const l of realLinks) {
    const s = endpointId(l.source)
    const t = endpointId(l.target)
    if (!neighbors.has(s)) neighbors.set(s, new Set())
    if (!neighbors.has(t)) neighbors.set(t, new Set())
    neighbors.get(s)!.add(t)
    neighbors.get(t)!.add(s)
    const sType = nodeById.get(s)?.domainType
    const tType = nodeById.get(t)?.domainType
    if (sType && tType && sType === tType) {
      realSameTypePairs.add(s < t ? `${s}|${t}` : `${t}|${s}`)
    }
  }

  const byType = new Map<GraphNodeType, DerivedNodeInput[]>()
  for (const n of nodes) {
    if (!(n.domainType in DERIVED_EDGE_MIN_SHARED)) continue
    if (!byType.has(n.domainType)) byType.set(n.domainType, [])
    byType.get(n.domainType)!.push(n)
  }

  const derived: DerivedEdge[] = []
  for (const [type, list] of byType) {
    const minShared = DERIVED_EDGE_MIN_SHARED[type]!
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!
        const b = list[j]!
        const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
        if (realSameTypePairs.has(pairKey)) continue
        const an = neighbors.get(a.id)
        const bn = neighbors.get(b.id)
        if (!an || !bn) continue
        const via = [...an].filter((id) => bn.has(id))
        if (via.length < minShared) continue
        derived.push({ source: a.id, target: b.id, predicate: null, derived: true, via })
      }
    }
  }
  return derived
}

// 推導邊的視覺強度依共同鄰居數量分級，不是所有推導邊一視同仁的同一種淡度——
// 這是 weighted one-mode projection 的概念（見 Zhou, Ren, Medo & Zhang,
// "Bipartite network projection and personal recommendation", Phys. Rev. E
// 76, 046115 (2007)）：共用越多異類別鄰居，關聯訊號越強，線條該越明顯。
// 0 對應該類別自己的門檻值(剛好壓線，最淡)，1 對應門檻值+3(明顯更強，封頂)——
// 各類別門檻不同(Documentation 1 / Implementation 3)，起點要跟著各自門檻走，
// 不能全部套用同一個絕對數字。
export function derivedStrength(viaCount: number | undefined, type: GraphNodeType | undefined): number {
  const shared = viaCount ?? 1
  const minShared = (type && DERIVED_EDGE_MIN_SHARED[type]) || 1
  return Math.min(1, Math.max(0, (shared - minShared) / 3))
}
