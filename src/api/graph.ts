import { apiGet } from './client'

// 對應後端 GraphController@index（my-dev-grid GET /api/graph）的回傳形狀：
// nodes 來自 Documentation/Technique/Implementation 三張表，id 是 "<type>-<id>"；
// edges 來自三張 pivot 表（documentation<->technique / documentation<->implementation /
// technique<->implementation）+ entity_relations（同型別關聯，例如 technique<->technique
// 的 requires/isRequiredBy），relation_id 已經在後端解析成 Relation 的 name 當 predicate。
//
// 重要：GraphController::index() 完全沒有用到 Scope（scopes 表、parent_class 階層）——
// 讀過後端程式碼確認過，/api/graph 回傳的 edges 全部來自上述四個「實例層級」的關聯來源，
// 沒有一條是 Scope 的樹狀階層。Scope 階層是 Documentation/Technique/Implementation 各自
// 透過 `type` 外鍵指向的「分類」，屬於節點的中繼資料，不是圖上的邊——所以底下另外補
// fetchScopes()／fetchNodeScopeIds() 去查這個分類資訊，給 graphPocData.ts 做節點分群用，
// 跟 /graph 的 edges（純網路關聯）是兩條不相交的資料路徑。見 graphPocData.ts 檔頭註解。
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

// scopes 表本身是一個以 parent_class 自我參照的樹（見 Scope model + migration）。
// ScopeController@index 用 Scope::with('parent') 撈一層 parent，所以這裡的 parent 只保證
// 有「直接上一層」的 id；要往上爬完整條祖先鏈，靠前端自己在拿到全部 scopes 之後用 id
// 查表往上走（見 graphPocData.ts 的 topAncestorScopeId）。頂層 scope 沒有 parent_class，
// 後端對應的 ScopeResource 在這種情況下會把 parent 解析成一個全欄位皆為 null 的物件
// （Laravel `new ScopeResource($this->whenLoaded('parent'))` 包 null 的已知行為），
// 所以這裡把 parent 的型別放寬成「物件但 id 可能是 null」，不能直接假設 parent 不存在。
export interface GraphScopeDto {
  id: number
  name: string
  class_number: string
  call_number: string
  parent: { id: number | null } | null
}

export function fetchScopes(): Promise<{ data: GraphScopeDto[] }> {
  return apiGet('/scopes')
}

// Documentation/Technique/Implementation 三張表都有 `type` 外鍵指到 scopes.id
// （DocumentationResource 等直接把它原樣回傳成 `type` 欄位——這裡命名跟
// GraphNodeDto.type 撞名但語意完全不同，前者是「這筆資料屬於哪個 Scope 分類」，
// 後者是「這個節點來自 documentation/technique/implementation 哪張表」）。
// /api/graph 的 GraphNodeDto 沒有帶這個分類外鍵，只能另外打三張表各自的 index API 查。
interface EntityScopeRefDto {
  id: number
  type: number
}

// 回傳 "documentation-5" -> scope id 的對照表，供 graphPocData.ts 算節點的階層分群用。
export async function fetchNodeScopeIds(): Promise<Map<string, number>> {
  const [docs, techniques, implementations] = await Promise.all([
    apiGet<{ data: EntityScopeRefDto[] }>('/documentations'),
    apiGet<{ data: EntityScopeRefDto[] }>('/techniques'),
    apiGet<{ data: EntityScopeRefDto[] }>('/implementations'),
  ])

  const map = new Map<string, number>()
  for (const d of docs.data) map.set(`documentation-${d.id}`, d.type)
  for (const t of techniques.data) map.set(`technique-${t.id}`, t.type)
  for (const i of implementations.data) map.set(`implementation-${i.id}`, i.type)
  return map
}
