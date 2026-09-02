// 知識圖譜技術驗證（POC）的資料層：實際打 GET /api/graph，
// 把後端 {nodes, edges} 轉成 GraphPoc2D/GraphPoc3D 兩個元件原本預期的形狀。
//
// 後端 nodes 只有 {id, type, label}，edges 只有 {source, target, predicate, label,
// relation_id}——沒有 weight/tags/daysSinceAccessed，也沒有 kind: 'related' | 'inspiration'
// 這種分類。這裡用「不需要後端額外補欄位、能從現有資料真實推導」的方式做映射，
// 兩個元件的內部渲染邏輯（radiusFor/colorFor/fz 分層等）完全不用改：
//
// - weight：用節點的連結數（degree）除以全圖最大 degree 正規化到 0~1，取代原本
//   「手動標記哪些是核心點子」的假資料，用「連得越多 = 越核心」這個合理的圖論代理指標。
// - tags：後端沒有自由標籤概念，改用節點的 entity type（documentation/technique/
//   implementation）當唯一 tag，是目前唯一算得出來的分類資訊。
// - daysSinceAccessed：後端目前完全沒有「存取時間」這個概念（nodes 只有 id/type/label），
//   已知資料缺口，一律回傳 0（3D 版的 Z 軸分層在真實資料下會全部貼齊前景，等後端補上
//   對應欄位後這裡再改，不是在前端編造假的時間數字）。
// - kind：pivot 表（documentation<->technique / documentation<->implementation /
//   technique<->implementation）永遠是跨型別關聯，entity_relations（例如 technique<->
//   technique 的 requires/isRequiredBy）永遠是同型別關聯——同型別的關聯在語意上最接近
//   mock 資料裡「靈感對撞機拉出的跨界連結」，所以用 source/target 的 type 是否相同
//   來對應 related／inspiration，而不是亂猜 predicate 字串。

import { fetchGraph, type GraphNodeDto, type GraphEdgeDto } from '@/api/graph'

export interface GraphPocNode {
  id: string
  label: string
  weight: number // 0~1，越高代表越核心的想法
  tags: string[]
  daysSinceAccessed: number // 越大代表越久沒被打開，用於「退到背景」的判斷
}

export interface GraphPocLink {
  source: string
  target: string
  kind: 'related' | 'inspiration' // inspiration = 靈感對撞機拉出的虛線
}

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
    daysSinceAccessed: 0,
  }))
}

function toGraphPocLinks(edges: GraphEdgeDto[]): GraphPocLink[] {
  return edges.map((e) => ({
    source: e.source,
    target: e.target,
    kind: nodeTypeOf(e.source) === nodeTypeOf(e.target) ? 'inspiration' : 'related',
  }))
}

export async function fetchGraphPocData(): Promise<{ nodes: GraphPocNode[]; links: GraphPocLink[] }> {
  const { nodes, edges } = await fetchGraph()
  return {
    nodes: toGraphPocNodes(nodes, edges),
    links: toGraphPocLinks(edges),
  }
}
