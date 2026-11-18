// 從文章來源匯入文章的 API（後端 ArticleSourceController）。
// 兩支都要登入：GET /article-sources 列出來源檔案與它們在站上的對應狀態，
// POST /article-sources/import 照清單上的選擇一次匯入，整批成功或整批不寫入。
import { apiGet, apiPost } from '@/api/client'

export type SourceStatus =
  | 'new'
  | 'changed'
  | 'unchanged'
  | 'removed'
  | 'site_deleted'
  | 'conflict'
  | 'possible_match'
  | 'invalid'

export type ImportAction = 'create' | 'update' | 'link'

/** 發布前要人工確認的內容。只有規則代號、說明與行號，後端不會帶比對到的文字。 */
export interface SourceWarning {
  code: string
  message: string
  line: number | null
}

export interface SourceItem {
  /** 原稿 front matter 的 slug。invalid 的檔案可能沒有。 */
  key: string | null
  path: string
  /** 來源檔案的 blob SHA；站上有連結但來源已經沒有的（removed）是 null。 */
  blob_sha: string | null
  title: string | null
  status: SourceStatus
  /** 站上目前標題、日期與內文的版本（64 位小寫十六進位）；只有 conflict 有，其他是 null。覆蓋時要原樣帶回 expected_site_version。 */
  site_version: string | null
  /** 已連結（或標題相同、可能對應）的站上文章。 */
  documentation_id: number | null
  /** 對應文章是否已發布；沒有對應或已刪除是 null。 */
  published: boolean | null
  reason: string | null
  reason_message: string | null
  warnings: SourceWarning[]
}

export interface SourceListing {
  repo: string
  commit_sha: string
  fetched_at: string
  items: SourceItem[]
}

export interface ImportRequestItem {
  key: string
  expected_blob_sha: string
  action: ImportAction
  /** 只有 link 要帶。 */
  documentation_id?: number
  /** 對 conflict 的 update 設成 true 才會覆蓋站上的修改。 */
  overwrite_site_edits?: boolean
  /** 覆蓋站上的修改時必帶：清單項目的 site_version。站上在列出清單之後又改過，後端回 409。 */
  expected_site_version?: string
}

export interface ImportRequest {
  commit_sha: string
  items: ImportRequestItem[]
}

export interface ImportResultItem {
  key: string
  action: ImportAction
  documentation_id: number
  title: string
  published: boolean
  warnings: SourceWarning[]
}

export interface ImportResponse {
  commit_sha: string
  data: ImportResultItem[]
  message: string
}

/** 一次最多匯入幾篇（後端 ImportArticleSourcesRequest::MAX_ITEMS）。 */
export const MAX_IMPORT_ITEMS = 50

export function fetchArticleSources(): Promise<SourceListing> {
  return apiGet<SourceListing>('/article-sources')
}

export function importArticleSources(request: ImportRequest): Promise<ImportResponse> {
  return apiPost<ImportResponse>('/article-sources/import', request)
}
