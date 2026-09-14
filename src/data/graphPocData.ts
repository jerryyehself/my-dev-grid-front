// 知識圖譜技術驗證（POC）的資料層：實際打 GET /api/graph，把後端資料轉成
// GraphPoc2D/GraphPoc3D 兩個元件原本預期的形狀。
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
//   表」的邊樣式區分，用來讓連線視覺上有變化，這些邊全部都是「網路」關聯，不是階層。
// - predicate/label：直接從後端 GraphEdgeDto 原封不動帶過來，relation_id 已經在後端解析
//   成 Relation 的 name 當 predicate，點連線看關聯定義（見 GraphPocView.vue）用得到，
//   不需要另外查。
//
// 2026-09-14 拿掉的東西：曾經另外查 Scope.parent_class 階層算出 clusterId，讓 GraphPoc2D.vue
// 用一個自訂 d3-force 把同分類的節點輕輕拉在一起分區。實測拿真實資料跑起來，這個分區力
// 跟真實邊的 link force 打架——真實關聯常常跨 Scope，兩股力互相拉扯的結果是一團擠在一起、
// 線條到處交叉，看起來比沒有分區更亂，沒有真的達成「一眼看出誰屬於哪個分類」的效果。拿掉
// 分區、只留純力導向自然長成的樣子（直接相關的節點自己會靠近，這個訊號至少是真的），連帶
// 拿掉的還有 api/graph.ts 的 fetchScopes()/fetchNodeScopeIds()——那兩個 API 呼叫存在的唯一
// 理由就是算這個分區，沒有分區邏輯在用就是純粹浪費一次網路來回。

import { fetchGraph, type GraphEdgeDto, type GraphNodeDto, type GraphNodeType } from '@/api/graph'

export interface GraphPocNode {
  id: string
  label: string
  weight: number // 0~1，越高代表越核心的想法
  tags: string[]
  domainType: GraphNodeType // documentation/technique/implementation，配色跟 3D Z 軸分層都靠這個
  daysSinceAccessed: number // 越大代表越久沒被打開，用於「退到背景」的判斷
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

function toGraphPocNodes(nodes: GraphNodeDto[], edges: GraphEdgeDto[]): GraphPocNode[] {
  const degree = new Map<string, number>()
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }
  const maxDegree = Math.max(1, ...degree.values())

  return nodes.map((n) => ({
    id: n.id,
    label: n.label,
    weight: (degree.get(n.id) ?? 0) / maxDegree,
    tags: [n.type],
    domainType: n.type,
    daysSinceAccessed: 0,
  }))
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

export async function fetchGraphPocData(): Promise<{ nodes: GraphPocNode[]; links: GraphPocLink[] }> {
  const { nodes, edges } = await fetchGraph()

  return {
    nodes: toGraphPocNodes(nodes, edges),
    links: toGraphPocLinks(edges),
  }
}
