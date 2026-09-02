import { apiGet } from './client'

// 對應後端 GraphController@index（my-dev-grid GET /api/graph）的回傳形狀：
// nodes 來自 Documentation/Technique/Implementation 三張表，id 是 "<type>-<id>"；
// edges 來自三張 pivot 表（documentation<->technique / documentation<->implementation /
// technique<->implementation）+ entity_relations（同型別關聯，例如 technique<->technique
// 的 requires/isRequiredBy），relation_id 已經在後端解析成 Relation 的 name 當 predicate。
export type GraphNodeType = 'documentation' | 'technique' | 'implementation'

export interface GraphNodeDto {
  id: string
  type: GraphNodeType
  label: string
}

export interface GraphEdgeDto {
  source: string
  target: string
  predicate: string | null
  label: string | null
  relation_id: number | null
}

export interface GraphDto {
  nodes: GraphNodeDto[]
  edges: GraphEdgeDto[]
}

export function fetchGraph(): Promise<GraphDto> {
  return apiGet<GraphDto>('/graph')
}
