// 知識圖譜技術驗證（POC）的資料層：實際打 GET /api/graph（+ 補充查 Scope 分類），
// 把後端資料轉成 GraphPoc2D/GraphPoc3D 兩個元件原本預期的形狀。
//
// 後端 nodes 只有 {id, type, label}，edges 只有 {source, target, predicate, label,
// relation_id}——沒有 weight/tags/daysSinceAccessed，也沒有 kind: 'related' | 'inspiration'
// 這種分類。這裡用「不需要後端額外補欄位、能從現有資料真實推導」的方式做映射：
//
// - weight：用節點的連結數（degree）除以全圖最大 degree 正規化到 0~1，取代原本
//   「手動標記哪些是核心點子」的假資料，用「連得越多 = 越核心」這個合理的圖論代理指標。
// - tags：後端沒有自由標籤概念，改用節點的 entity type（documentation/technique/
//   implementation）當唯一 tag，是目前唯一算得出來的分類資訊。歷史遺留欄位，實際沒有
//   元件在讀，配色/分層改用下面的 domainType（同一個值，但有型別），不重複移除是因為
//   跟這次要補的東西無關，不擴大這次改動範圍。
// - domainType：直接用後端 GraphNodeDto.type，是配色（--node-doc/tech/impl）跟 GraphPoc3D
//   Z 軸分層（documentation/technique/implementation 各自固定一個 Z 帶）共用的依據。
// - daysSinceAccessed：後端目前完全沒有「存取時間」這個概念（nodes 只有 id/type/label），
//   已知資料缺口，一律回傳 0，前端沒有拿它做任何視覺判斷（3D 版 Z 軸分層 2026-09-14 起
//   改用 domainType，不再依賴這個欄位，見 GraphPoc3D.vue），等後端真的補上對應欄位後
//   這裡再視需求決定要不要恢復使用，不是在前端編造假的時間數字。
// - kind：pivot 表（documentation<->technique / documentation<->implementation /
//   technique<->implementation）永遠是跨型別關聯，entity_relations（例如 technique<->
//   technique 的 requires/isRequiredBy）永遠是同型別關聯——這純粹是「這條邊來自哪張關聯
//   表」的邊樣式區分，用來讓連線視覺上有變化，跟下面 clusterId 講的階層分群是完全不同的
//   兩件事（這兩種邊全部都是「網路」關聯，見下段）。
// - predicate/label：直接從後端 GraphEdgeDto 原封不動帶過來，relation_id 已經在後端解析
//   成 Relation 的 name 當 predicate，點連線看關聯定義（見 GraphPocView.vue）用得到，
//   不需要另外查。
//
// --- 階層 vs 網路的結構分離（clusterId / clusterLabel）---
//
// 讀過後端 GraphController.php 確認：/api/graph 回傳的 edges 全部來自四個「實例層級」
// 關聯來源（三張 pivot 表 + entity_relations），全部都是 Relation 驅動的網路關聯，沒有
// 任何一條邊是 Scope.parent_class 的樹狀階層——Scope 階層在這個後端設計裡根本不會產生
// 邊，它是 Documentation/Technique/Implementation 各自透過 `type` 外鍵指向的「分類」，
// 屬於節點的中繼資料。也就是說「hierarchy 邊 vs network 邊」這個問題在目前的資料模型下
// 不成立：/api/graph 給的邊全部只能算 network，階層資訊要另外查（fetchNodeScopeIds() +
// fetchScopes()，見 src/api/graph.ts），而且它天生就是「節點屬於哪一群」而不是「節點跟
// 節點之間的邊」，所以拿它去餵 force-graph 的 dagMode（需要真的階層邊才畫得出 DAG 分層）
// 並不合適。改成：把每個節點沿 Scope.parent_class 一路爬到的最頂層祖先當作 clusterId，
// 交給畫面層（GraphPoc2D.vue）用來做分群佈局的錨點，讓「這個節點屬於哪個分類」用空間
// 分群表達，而不是硬塞一條假的力導向連結——/api/graph 查到的邊全部維持原樣、原封不動地
// 當網路關聯餵給力模擬，不再有邊被錯誤地當成階層邊處理。
//
// Scope 資料查不到（fetch 失敗、或某個節點的 type 對不到任何 scope）時優雅降級：
// clusterId 退回節點自己的 domain type（documentation/technique/implementation），
// 變成扁平三分群，而不是讓整個 POC 掛掉——這是已知的降級路徑，不是完整功能。

import {
  fetchGraph,
  fetchNodeScopeIds,
  fetchScopes,
  type GraphEdgeDto,
  type GraphNodeDto,
  type GraphNodeType,
  type GraphScopeDto,
} from '@/api/graph'

export interface GraphPocNode {
  id: string
  label: string
  weight: number // 0~1，越高代表越核心的想法
  tags: string[]
  domainType: GraphNodeType // documentation/technique/implementation，配色跟 3D Z 軸分層都靠這個
  daysSinceAccessed: number // 越大代表越久沒被打開，用於「退到背景」的判斷
  clusterId: string // Scope 階層分群 key（見檔頭說明），查不到 Scope 資料時退回 domain type
  clusterLabel: string // clusterId 對應的可讀名稱，查不到時等於 clusterId
}

export interface GraphPocLink {
  source: string
  target: string
  kind: 'related' | 'inspiration' // 邊樣式區分（見檔頭說明），不代表階層/網路
  predicate: string | null // 後端已解析成 Relation 的 name，點連線看關聯定義用得到
  label: string | null
}

// 點節點/點連線後要顯示的內容——2D/3D 兩個元件各自的力模擬節點/邊物件內部欄位
// (x/y/z/vx/vy/index...) 不一樣、且 force-graph 系列套件的 link.source/target 在模擬
// 開始後會被解析成節點物件而不是原本的字串 id，兩邊都不適合直接原封不動 emit 出去給
// GraphPocView.vue 用。這裡定義一個跟力模擬實作脫鉤的共同格式，兩個元件各自解析完成
// 再 emit，GraphPocView.vue 只需要認得這一種形狀。
export interface GraphPocNodeSelection {
  kind: 'node'
  id: string
  label: string
  domainType: GraphNodeType
  weight: number
  degree: number
}
export interface GraphPocLinkSelection {
  kind: 'link'
  sourceLabel: string
  targetLabel: string
  linkKind: 'related' | 'inspiration'
  predicate: string | null
  label: string | null
}
export type GraphPocSelection = GraphPocNodeSelection | GraphPocLinkSelection

const nodeTypeOf = (nodeId: string): string => nodeId.split('-')[0] ?? ''

// 沿 parent_class 往上爬到沒有上一層為止，回傳最頂層祖先的 scope id。
// depth 上限只是擋資料異常（例如 parent_class 誤設成環狀參照）用，正常階層深度不會撞到。
function topAncestorScopeId(scopeId: number, parentOf: Map<number, number | null>): number {
  let current = scopeId
  for (let depth = 0; depth < 20; depth++) {
    const parent = parentOf.get(current)
    if (parent == null) return current
    current = parent
  }
  return current
}

interface ScopeLookup {
  nodeScopeIds: Map<string, number>
  parentOf: Map<number, number | null>
  nameOf: Map<number, string>
}

function toGraphPocNodes(
  nodes: GraphNodeDto[],
  edges: GraphEdgeDto[],
  scopeLookup: ScopeLookup | null,
): GraphPocNode[] {
  const degree = new Map<string, number>()
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }
  const maxDegree = Math.max(1, ...degree.values())

  return nodes.map((n) => {
    const domainType = nodeTypeOf(n.id)
    const scopeId = scopeLookup?.nodeScopeIds.get(n.id)
    const topId = scopeId != null ? topAncestorScopeId(scopeId, scopeLookup!.parentOf) : null
    const clusterId = topId != null ? `scope-${topId}` : domainType
    const clusterLabel = topId != null ? (scopeLookup!.nameOf.get(topId) ?? domainType) : domainType

    return {
      id: n.id,
      label: n.label,
      weight: (degree.get(n.id) ?? 0) / maxDegree,
      tags: [n.type],
      domainType: n.type,
      daysSinceAccessed: 0,
      clusterId,
      clusterLabel,
    }
  })
}

function toGraphPocLinks(edges: GraphEdgeDto[]): GraphPocLink[] {
  return edges.map((e) => ({
    source: e.source,
    target: e.target,
    kind: nodeTypeOf(e.source) === nodeTypeOf(e.target) ? 'inspiration' : 'related',
    predicate: e.predicate,
    label: e.label,
  }))
}

function buildScopeLookup(nodeScopeIds: Map<string, number>, scopes: GraphScopeDto[]): ScopeLookup {
  const parentOf = new Map<number, number | null>()
  const nameOf = new Map<number, string>()
  for (const s of scopes) {
    parentOf.set(s.id, s.parent?.id ?? null)
    nameOf.set(s.id, s.name)
  }
  return { nodeScopeIds, parentOf, nameOf }
}

// Scope 階層資料是分群用的加分資訊，不是圖譜能不能畫出來的必要條件：抓不到（fetch 失敗、
// 後端版本沒有這些欄位等）就回傳 null，讓 toGraphPocNodes 降級成扁平的 domain type 分群，
// 而不是讓整個 fetchGraphPocData() 因為這個非必要的加強功能而失敗。
async function tryFetchScopeLookup(): Promise<ScopeLookup | null> {
  try {
    const [nodeScopeIds, { data: scopes }] = await Promise.all([fetchNodeScopeIds(), fetchScopes()])
    return buildScopeLookup(nodeScopeIds, scopes)
  } catch (e) {
    console.warn('[graphPocData] 無法取得 Scope 階層資料，節點分群將退化為 domain type', e)
    return null
  }
}

export async function fetchGraphPocData(): Promise<{ nodes: GraphPocNode[]; links: GraphPocLink[] }> {
  const { nodes, edges } = await fetchGraph()
  const scopeLookup = await tryFetchScopeLookup()

  return {
    nodes: toGraphPocNodes(nodes, edges, scopeLookup),
    links: toGraphPocLinks(edges),
  }
}
