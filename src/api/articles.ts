// 文章（D-40：一篇文章就是一筆 Documentation）的讀寫。D-56（登入）落地後
// 這裡才第一次真的接上後端——在那之前 ArticlesView／ArticleDetailView／
// ArticleEditorView／ArticleManageView 全部讀 src/data/articles.ts 的假資料，
// 寫入按鈕也全部寫死停用。
//
// summary／intro／margins（邊註）／純標籤／文章對文章關聯這五項編輯頁欄位，
// 後端 documentations 資料表完全沒有對應欄位（entity_relations 表雖然存在，
// 但 DocumentationController 沒有 sync 邏輯，文章對文章連結目前寫不進去），
// 這裡刻意不假裝能存——只回傳／只接受後端真的有的欄位。
import { ApiHttpError, apiDelete, apiGet, apiPost, apiPut, describeLoadError } from './client'
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

// 2026-09-24：跟 api/projects.ts 的 fetchProjectsOrDemo()、api/graph.ts 的
// fetchGraphOrDemo() 同一套作法——正常打真的 API，連不上（單機展示沒開後端）才退回
// 保底填充內容，並回報 loadError（錯誤訊息字串，成功時是 null）讓畫面顯示出錯了（2026-10-02 站主決定：
// 出錯導致沒資料時照樣用示範資料頂替，但一定要顯示錯誤，不能悄悄蓋過去）。
//
// 2026-09-25 改版：body 內容從「自己編的示範散文」換成 `daily-claude-summary` 專案
// `reports/` 資料夾裡三篇真的寫過的技術文件（逐字引用，只去掉重複的 H1）——使用者
// 要求填充文章要用真的 report 內容，不要自己編。`reports/` 是主題式的技術文件（例如
// 前端建置工具問答、首頁視覺化設計決策），不是 `summaries/` 那種逐日對話流水帳；
// 後者內容偏內部協作/交接細節（session id、hook 腳本內部機制等），不適合當公開文章
// 的填充內容。body 沒有另外加揭露句——D-57 的摘要就是抓 body 第一段，加一句每篇
// 都一樣的揭露文字只會蓋掉這三篇本來就有意義的摘要；`loadError` 已經讓畫面在頁面層級
// 顯示錯誤訊息，不需要每篇內文再重複講一次。
import articlesDemoFixture from '@/data/articlesDemoFixture.json'

export async function fetchArticlesOrDemo(): Promise<{ articles: ArticleDto[]; loadError: string | null }> {
  try {
    return { articles: await fetchArticles(), loadError: null }
  } catch (e) {
    console.warn('[articles] 載入失敗，改用填充內容', e)
    return { articles: articlesDemoFixture as ArticleDto[], loadError: describeLoadError(e) }
  }
}

export async function fetchArticleOrDemo(id: number): Promise<{ article: ArticleDto; loadError: string | null }> {
  try {
    return { article: await fetchArticle(id), loadError: null }
  } catch (e) {
    // 404 是「這篇文章真的不存在」，不是載入失敗：不拿填充文章頂替（即使 demo 清單剛好有同一個
    // id），丟回去讓頁面顯示一般的找不到狀態。
    if (e instanceof ApiHttpError && e.status === 404) throw e
    const demo = (articlesDemoFixture as ArticleDto[]).find((a) => a.id === id)
    if (!demo) throw e // demo 清單裡也沒有這個 id，誠實回報「找不到」，不要生一篇假的出來
    console.warn('[articles] 載入失敗，改用填充內容', e)
    return { article: demo, loadError: describeLoadError(e) }
  }
}
