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
  // 只有 implementation 節點會有值（git_repo_created_at，來自 GitHub API）；
  // documentation/technique 完全沒有對應的時間欄位，後端一律回傳 null，不是漏傳。
  created_at: string | null
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

// 2026-09-03 從真實資料庫的 GET /api/graph 存下來的快照（18 節點、20 邊，含
// GraphController 補上的 created_at 欄位），只給「單機展示、後端沒起來」這種
// 情境當保底填充用——不是常態資料來源。用真實查過的一份快照，不是編的示意資料。
// 之後資料庫內容變了，這份快照不會跟著變，僅供展示用途，不代表目前的真實狀態。
import graphDemoFixture from '@/data/graphDemoFixture.json'

// 正常打 API；連不上（單機展示沒開後端等情境）才退回上面那份快照，並且明確回報
// 用的是示範資料，讓畫面上可以誠實標示「這是示範資料、不是即時資料」，不能悄悄
// 拿假資料冒充真資料。
export async function fetchGraphOrDemo(): Promise<{ dto: GraphDto; isDemo: boolean }> {
  try {
    return { dto: await fetchGraph(), isDemo: false }
  } catch (e) {
    console.warn('[graph] 連不上後端，改用示範資料快照（僅供單機展示）', e)
    return { dto: graphDemoFixture as GraphDto, isDemo: true }
  }
}
