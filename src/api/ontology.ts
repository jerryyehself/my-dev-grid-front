// 本體論的「唯讀」查詢。文章編輯頁的分類號選單、實體挑選器與述詞清單都靠這裡，
// 而不是在前端寫死一份——寫死的那份一旦後端加了新的 scope 或 relation 就會默默說謊。
//
// 這五個端點在 my-dev-grid 的 routes/api.php 裡是 apiResources(['only' => ['index','show']])，
// 完全公開不需要登入；寫入（store/update/destroy）才在 auth:sanctum 後面。
import { apiGet } from './client'

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

/** 圖譜裡的三個族。`documentation` 同時是文章自己所屬的族（同型別關聯走 entity_relations）。 */
export type EntityFamily = 'technique' | 'implementation' | 'documentation'

export const FAMILY_LABEL: Record<EntityFamily, string> = {
  technique: 'TECHNIQUE 1000',
  implementation: 'IMPLEMENTATION 2000',
  documentation: 'DOCUMENTATION 0000',
}

/**
 * 每一族在圖譜上的代表色。沿用 /graph 頁既有的節點配色，
 * 讓編輯頁挑到的顏色跟之後在圖譜上看到的是同一個。
 */
export const FAMILY_COLOR: Record<EntityFamily, string> = {
  technique: '#0e8a72',
  implementation: '#8a3aa8',
  documentation: '#b45309',
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
