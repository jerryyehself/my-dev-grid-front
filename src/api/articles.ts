// 文章（D-40：一篇文章就是一筆 Documentation）的讀寫。D-56（登入）落地後
// 這裡才第一次真的接上後端——在那之前 ArticlesView／ArticleDetailView／
// ArticleEditorView／ArticleManageView 全部讀 src/data/articles.ts 的假資料，
// 寫入按鈕也全部寫死停用。
//
// summary／intro／margins（邊註）／純標籤／文章對文章關聯這五項編輯頁欄位，
// 後端 documentations 資料表完全沒有對應欄位（entity_relations 表雖然存在，
// 但 DocumentationController 沒有 sync 邏輯，文章對文章連結目前寫不進去），
// 這裡刻意不假裝能存——只回傳／只接受後端真的有的欄位。
import { apiDelete, apiGet, apiPost, apiPut } from './client'
import { fetchScopes } from './ontology'

interface ListEnvelope<T> {
  type: string
  data: T[]
}

/** 三張 pivot 表都帶 relation_id，述詞不是附加資訊，是這條邊本身。 */
export interface ArticleRelationDto {
  id: number
  title: string
  relation_id: number
}

export interface ArticleDto {
  id: number
  type: number
  title: string
  body: string | null
  status: number | null
  creation_date: string | null
  created_at: string | null
  updated_at: string | null
  scope: { id: number; name: string; full_call_number: string } | null
  techniques: ArticleRelationDto[]
  implementations: ArticleRelationDto[]
}

export interface ArticleWritePayload {
  /** 文章所屬的 Documentation 子分類（scope id），例如 post（0030）。 */
  type: number
  title: string
  body: string
  status: number
  techniques: { id: number; relation_id: number }[]
  implementations: { id: number; relation_id: number }[]
}

interface ArticleWriteResponse {
  data: ArticleDto
  message: string
}

let postScopeId: number | null = null

/**
 * 文章清單頁只列 post（0030），不是全部 Documentation——sourcesite（0010，
 * 外部官方文件）跟其他子分類不是「文章」。查一次快取起來，不寫死數字：
 * 種子資料在不同環境的 id 不保證一樣，靠 full_call_number 找才可靠。
 */
async function postScopeIdOnce(): Promise<number> {
  if (postScopeId !== null) return postScopeId
  const scopes = await fetchScopes()
  const post = scopes.find((s) => s.full_call_number === '0030')
  if (!post) throw new Error('找不到 post（0030）分類，文章沒有地方掛')
  postScopeId = post.id
  return postScopeId
}

export async function fetchArticles(): Promise<ArticleDto[]> {
  const [scopeId, res] = await Promise.all([
    postScopeIdOnce(),
    apiGet<ListEnvelope<ArticleDto>>('/documentations'),
  ])
  return res.data.filter((d) => d.type === scopeId)
}

export function fetchArticle(id: number): Promise<ArticleDto> {
  return apiGet<ArticleDto>(`/documentations/${id}`)
}

export function createArticle(payload: ArticleWritePayload): Promise<ArticleWriteResponse> {
  return apiPost<ArticleWriteResponse>('/documentations', payload)
}

export function updateArticle(
  id: number,
  payload: ArticleWritePayload,
): Promise<ArticleWriteResponse> {
  return apiPut<ArticleWriteResponse>(`/documentations/${id}`, payload)
}

export function deleteArticle(id: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/documentations/${id}`)
}
