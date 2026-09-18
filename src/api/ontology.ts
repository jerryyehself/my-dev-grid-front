// 本體論的「唯讀」查詢。文章編輯頁的分類號選單、實體挑選器與述詞清單都靠這裡，
// 而不是在前端寫死一份——寫死的那份一旦後端加了新的 scope 或 relation 就會默默說謊。
//
// 這五個端點在 my-dev-grid 的 routes/api.php 裡是 apiResources(['only' => ['index','show']])，
// 完全公開不需要登入；寫入（store/update/destroy）才在 auth:sanctum 後面。
import { apiGet } from './client'
import type { GraphNodeType } from './graph'

/** 後端所有 index 端點的共同外層：{ type, data }。 */
interface ListEnvelope<T> {
  type: string
  data: T[]
}

/** Scope 是階層分類號本身，同時擔任圖譜裡的主詞與受詞。 */
export interface ScopeDto {
  id: number
  name: string
  /** 四位數完整分類號，例如 '0030'。族別看前兩碼：00 文件 / 10 技術 / 20 實作。 */
  full_call_number: string
  comment: string | null
}

/**
 * Relation 是述詞，而且成對可逆——`reverse_id` 指向反向的那一條。
 * 三張 pivot 表與 entity_relations 都帶 relation_id，所以任何一條邊都必須指定述詞。
 */
export interface RelationDto {
  id: number
  name: string
  reverse_id: number | null
}

/** 挑選器上一列實體所需要的最小資訊，三個族共用同一個形狀。 */
export interface EntityOption {
  id: number
  title: string
  /** 例如 '1040 framework'；後端查不到 scope 時為 null，不自己編一個。 */
  scope: string | null
}

interface RawEntity {
  id: number
  title: string
  scope?: { full_call_number?: string | null; name?: string | null } | null
}

function toOption(r: RawEntity): EntityOption {
  const n = r.scope?.full_call_number
  const name = r.scope?.name
  return { id: r.id, title: r.title, scope: n && name ? `${n} ${name}` : null }
}

export function fetchScopes(): Promise<ScopeDto[]> {
  return apiGet<ListEnvelope<ScopeDto>>('/scopes').then((r) => r.data)
}

export function fetchRelations(): Promise<RelationDto[]> {
  return apiGet<ListEnvelope<RelationDto>>('/relations').then((r) => r.data)
}

export function fetchTechniqueOptions(): Promise<EntityOption[]> {
  return apiGet<ListEnvelope<RawEntity>>('/techniques').then((r) => r.data.map(toOption))
}

export function fetchImplementationOptions(): Promise<EntityOption[]> {
  return apiGet<ListEnvelope<RawEntity>>('/implementations').then((r) => r.data.map(toOption))
}

export function fetchDocumentationOptions(): Promise<EntityOption[]> {
  return apiGet<ListEnvelope<RawEntity>>('/documentations').then((r) => r.data.map(toOption))
}

/**
 * 圖譜裡的三個族。`documentation` 同時是文章自己所屬的族（同型別關聯走 entity_relations）。
 * 這三個字串跟 `/api/graph` 回傳的 `GraphNodeType` 是同一組值,所以直接沿用同一個型別,
 * 不另外宣告一份看起來一樣、之後卻可能各自漂移的聯合型別。
 */
export type EntityFamily = GraphNodeType

export const FAMILY_LABEL: Record<EntityFamily, string> = {
  technique: 'TECHNIQUE 1000',
  implementation: 'IMPLEMENTATION 2000',
  documentation: 'DOCUMENTATION 0000',
}

/**
 * 每一族在圖譜上的代表色,回傳的是 CSS 變數而不是色碼。
 *
 * 一開始這裡寫的是 '#0e8a72' 這種硬寫的色碼,照著設計稿抄過來的——但設計稿只畫了
 * 淺色版,而 --node-* 這三個 token 在夜讀主題有各自重新驗證過的另一組值
 * （#b8791a / #279c7d / #b356a8,為了在深色底上拉到夠亮）。硬寫色碼等於讓編輯頁的
 * 節點顏色永遠停在淺色主題,切到夜讀就跟 /graph 上同一個節點對不起來。
 *
 * GraphPathSearch.vue 與 GraphPathDiagram.vue 原本各自有一份一模一樣的
 * nodeColorVar()，現在都改成呼叫這裡，三份合成一份。
 */
export const FAMILY_COLOR: Record<EntityFamily, string> = {
  technique: 'var(--node-tech)',
  implementation: 'var(--node-impl)',
  documentation: 'var(--node-doc)',
}

/** 只要 token 名字（不含 var(...)）的呼叫端用這個，例如要組成 `var(${name})` 以外的寫法。 */
export function nodeColorVar(type: GraphNodeType): string {
  return type === 'documentation' ? '--node-doc' : type === 'technique' ? '--node-tech' : '--node-impl'
}

/**
 * 同型別（文章對文章）只給這幾個述詞，而且存進 entity_relations 而不是 pivot。
 * 其餘述詞（documents / specs / uses / requires / assists…）語意上都是跨型別的。
 */
export const SAME_TYPE_PREDICATES = [
  'precedes',
  'succeeds',
  'accompanies',
  'descendantOf',
  'ancestorOf',
] as const

export function fetchEntityOptions(family: EntityFamily): Promise<EntityOption[]> {
  if (family === 'technique') return fetchTechniqueOptions()
  if (family === 'implementation') return fetchImplementationOptions()
  return fetchDocumentationOptions()
}

/** 關聯實際會被寫到哪張表——挑選器上直接講出來，免得看起來像只是加了個標籤。 */
export function storageTargetOf(family: EntityFamily): string {
  if (family === 'technique') return 'documentation_technique（帶 relation_id）'
  if (family === 'implementation') return 'documentation_implementation（帶 relation_id）'
  return 'entity_relations（同型別，不走 pivot）'
}

/* ------------------------------------------------------------------ *
 * 本體論詳情頁（規格「本體論編輯規格」第 4 步）
 *
 * 上面那批是**清單**，給編輯器的下拉選單用；下面這批是**單筆詳情**，欄位多很多，
 * 而且只有 show 端點才有——`children_count` 這類計數是 `whenCounted`，清單端點
 * 沒有跑 `loadCount()` 就整個不會出現（不是 0，是 key 不存在）。所以型別上全部
 * 標成選填，呼叫端拿 `?? 0` 收尾，不要假設它一定在。
 * ------------------------------------------------------------------ */

/** 詳情頁要的那一排計數。三族實體分開給，因為一個 scope 實際上只會有其中一族。 */
export interface ScopeCounts {
  children_count?: number
  siblings_count?: number
  subject_of_count?: number
  object_of_count?: number
  documentations_count?: number
  techniques_count?: number
  implementations_count?: number
  entities_count?: number
}

/**
 * 述詞定義。`subject` / `object` 是**Scope 的 id**，不是巢狀物件——
 * 後端刻意只給 id（`optional($this->subject)->id`），所以名字要自己用
 * `fetchScopes()` 的清單查。別在這裡假裝它是物件。
 */
export interface RelationSummaryDto {
  id: number
  name: string
  full_call_number: string
  note: string | null
  reverse_id: number | null
  subject: number | null
  object: number | null
}

export interface ScopeDetailDto extends ScopeCounts {
  id: number
  name: string
  class_number: string
  call_number: string
  parent_class: number | null
  full_call_number: string
  comment: string | null
  note: string | null
  parent?: ScopeDto | null
  children?: ScopeDto[]
  /** **後端已經把自己排除掉了**，前端不要再濾一次，也不要把自己補回去。 */
  siblings?: ScopeDto[]
  subject_of?: RelationSummaryDto[]
  object_of?: RelationSummaryDto[]
}

export interface RelationDetailDto extends RelationSummaryDto {
  class_number: string
  call_number: string
  reverse: { id: number; name: string } | null
  is_referenced: boolean
  /** 被自己的邊鎖住（`self`）還是被反向那條的邊鎖住（`reverse`）。 */
  referenced_via: 'self' | 'reverse' | null
  locked_fields: string[]
  own_edges_count: number
  reverse_edges_count: number
}

/** 一條邊。四張連結表正規化成同一個形狀，`source` 說它來自哪一張。 */
export interface EdgeDto {
  subject_type: string
  subject_id: number
  subject_title: string
  object_type: string
  object_id: number
  object_title: string
  source: string
}

/** Laravel paginator 的外層，只取畫面真的會用到的欄位。 */
export interface EdgePage {
  data: EdgeDto[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export function fetchScope(id: number): Promise<ScopeDetailDto> {
  return apiGet<ScopeDetailDto>(`/scopes/${id}`)
}

export function fetchRelation(id: number): Promise<RelationDetailDto> {
  return apiGet<RelationDetailDto>(`/relations/${id}`)
}

export function fetchRelationEdges(id: number, page = 1, perPage = 25): Promise<EdgePage> {
  return apiGet<EdgePage>(`/relations/${id}/edges?page=${page}&per_page=${perPage}`)
}
