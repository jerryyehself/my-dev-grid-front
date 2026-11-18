// 匯入頁的純邏輯：每種狀態能選哪些動作、選擇組成請求、錯誤代號對成中文。
// 狀態與動作的定義以後端 ArticleSourceService 為準；這裡只放「前端先擋掉明知會被退回的選擇」
// 的規則，最後仍由後端在寫入前重新判斷。
import {
  ApiHttpError,
  ApiRequestError,
  ApiValidationError,
  AuthRefreshUnavailableError,
  AuthSessionChangedError,
} from '@/api/client'
import {
  MAX_IMPORT_ITEMS,
  type ImportAction,
  type ImportRequest,
  type ImportRequestItem,
  type SourceItem,
  type SourceListing,
  type SourceStatus,
} from './articleImportApi'

export const STATUS_LABEL: Record<SourceStatus, string> = {
  new: '新檔案',
  changed: '來源有更新',
  unchanged: '沒有變動',
  conflict: '站上也改過',
  possible_match: '可能已存在',
  removed: '來源已移除',
  site_deleted: '站上已刪除',
  invalid: '無法匯入',
}

/** 狀態標籤的樣式：要處理的實線強調，資訊性的淡色，不能動的虛線。 */
export type StatusTone = 'accent' | 'plain' | 'muted' | 'error'

export const STATUS_TONE: Record<SourceStatus, StatusTone> = {
  new: 'accent',
  changed: 'accent',
  conflict: 'error',
  possible_match: 'accent',
  unchanged: 'plain',
  removed: 'muted',
  site_deleted: 'muted',
  invalid: 'error',
}

export const ACTION_LABEL: Record<ImportAction | 'none', string> = {
  none: '不處理',
  create: '新增為草稿',
  update: '更新',
  link: '連結既有文章',
}

/** 這個狀態可以選的動作（不含「不處理」）。對應後端 write() 的狀態檢查。 */
export function allowedActions(status: SourceStatus): ImportAction[] {
  switch (status) {
    case 'new':
    case 'possible_match':
      return ['create', 'link']
    case 'changed':
    case 'conflict':
      return ['update']
    default:
      // unchanged、removed、site_deleted、invalid：只是資訊，後端也會退回任何動作
      return []
  }
}

/** 一列的選擇。 */
export interface RowChoice {
  action: ImportAction | 'none'
  /** link 要連到的站上文章。 */
  documentationId: number | null
  /** conflict 的 update 要明確確認覆蓋站上的修改。 */
  overwrite: boolean
}

/**
 * 清單列的識別：路徑加 slug。只用路徑不夠：已匯入的檔案保留路徑、只改 slug 時，新 slug 的來源列與
 * 舊 slug 的 removed 列共用同一個路徑。只用 key 也不夠：slug 重複或缺少的 invalid 檔案 key 會重複或是 null。
 * 兩者合起來在一個版本裡不重複；用 NUL 隔開，路徑與 slug 都不會含有它。
 */
export function rowId(item: SourceItem): string {
  return `${item.path}\u0000${item.key ?? ''}`
}

export function defaultChoice(item: SourceItem): RowChoice {
  // 標題相同的文章已經在 documentation_id 裡：連結時預先選它，但動作本身仍是「不處理」，由人決定
  return {
    action: 'none',
    documentationId: item.status === 'possible_match' ? item.documentation_id : null,
    overwrite: false,
  }
}

/** 選擇是否需要提醒：已發布的文章被更新，站上內容會直接換成來源版本。 */
export function overwritesPublished(item: SourceItem, choice: RowChoice): boolean {
  return choice.action === 'update' && item.published === true
}

export type SelectionProblem =
  | { kind: 'too_many'; max: number }
  | { kind: 'missing_target'; path: string }
  | { kind: 'duplicate_target'; documentationId: number }
  | { kind: 'overwrite_unconfirmed'; path: string }
  /** 清單沒給站上版本（site_version），沒辦法確認要覆蓋的是哪一版站上內容。 */
  | { kind: 'site_version_missing'; path: string }

/** 有選動作的列，且確實能送出（有 key 與 blob SHA、動作在狀態允許的範圍內）。 */
function selectedRows(
  listing: SourceListing,
  choices: Record<string, RowChoice>,
): { item: SourceItem; choice: RowChoice }[] {
  const rows: { item: SourceItem; choice: RowChoice }[] = []
  for (const item of listing.items) {
    const choice = choices[rowId(item)]
    if (!choice || choice.action === 'none') continue
    if (item.key === null || item.blob_sha === null) continue
    if (!allowedActions(item.status).includes(choice.action)) continue
    rows.push({ item, choice })
  }
  return rows
}

/** 這一列會送出 overwrite_site_edits（conflict 的更新，而且已確認覆蓋）。 */
function willOverwrite(item: SourceItem, choice: RowChoice): boolean {
  return item.status === 'conflict' && choice.action === 'update' && choice.overwrite
}

/** 用 typeof 而不只擋 null：後端還沒更新時欄位整個不存在（undefined），也要當成沒有。 */
function hasSiteVersion(item: SourceItem): item is SourceItem & { site_version: string } {
  return typeof item.site_version === 'string' && item.site_version !== ''
}

/** 送出前能先確定會被退回的問題。空陣列才可以送出。 */
export function selectionProblems(
  listing: SourceListing,
  choices: Record<string, RowChoice>,
): SelectionProblem[] {
  const rows = selectedRows(listing, choices)
  const problems: SelectionProblem[] = []

  if (rows.length > MAX_IMPORT_ITEMS) problems.push({ kind: 'too_many', max: MAX_IMPORT_ITEMS })

  const targets = new Set<number>()
  const duplicated = new Set<number>()
  for (const { item, choice } of rows) {
    if (choice.action === 'link') {
      if (choice.documentationId === null) {
        problems.push({ kind: 'missing_target', path: item.path })
      } else if (targets.has(choice.documentationId)) {
        duplicated.add(choice.documentationId)
      } else {
        targets.add(choice.documentationId)
      }
    }
    if (item.status === 'conflict' && choice.action === 'update' && !choice.overwrite) {
      problems.push({ kind: 'overwrite_unconfirmed', path: item.path })
    } else if (willOverwrite(item, choice) && !hasSiteVersion(item)) {
      problems.push({ kind: 'site_version_missing', path: item.path })
    }
  }
  for (const documentationId of duplicated) problems.push({ kind: 'duplicate_target', documentationId })

  return problems
}

export function selectedCount(listing: SourceListing, choices: Record<string, RowChoice>): number {
  return selectedRows(listing, choices).length
}

/**
 * 把選擇組成請求。欄位只帶後端需要的：documentation_id 只給 link，overwrite_site_edits 與
 * expected_site_version 只給 conflict 的 update。
 * 清單沒給 site_version 時不送覆蓋（selectionProblems 已經先擋下；這裡是第二道）：寧可讓後端因為
 * 缺少 overwrite_site_edits 退回，也不要在沒帶版本的情況下覆蓋。
 */
export function buildImportRequest(
  listing: SourceListing,
  choices: Record<string, RowChoice>,
): ImportRequest {
  const items: ImportRequestItem[] = selectedRows(listing, choices).map(({ item, choice }) => {
    const request: ImportRequestItem = {
      key: item.key!,
      expected_blob_sha: item.blob_sha!,
      action: choice.action as ImportAction,
    }
    if (choice.action === 'link') request.documentation_id = choice.documentationId!
    if (willOverwrite(item, choice) && hasSiteVersion(item)) {
      request.overwrite_site_edits = true
      request.expected_site_version = item.site_version
    }
    return request
  })
  return { commit_sha: listing.commit_sha, items }
}

/**
 * 可以選來連結的站上文章：排除已經連到「這個版本裡還在的來源檔案」的文章。
 * 來源檔案已經移除（removed）的文章可以重新連結（slug 改名的情況），所以不排除。
 * 其他 repo 的連結前端看不到，連到那種文章會由後端回 409。
 */
export function linkableArticleIds(listing: SourceListing, articleIds: number[]): number[] {
  const taken = new Set<number>()
  for (const item of listing.items) {
    if (item.documentation_id === null) continue
    // possible_match 的對應文章還沒有來源，正是要連結的對象
    if (item.status === 'possible_match' || item.status === 'removed') continue
    taken.add(item.documentation_id)
  }
  return articleIds.filter((id) => !taken.has(id))
}

/** 後端 ArticleSourceException 的 reason 代號對成中文。 */
export const REASON_TEXT: Record<string, string> = {
  not_configured: '尚未設定文章來源。',
  misconfigured: '文章來源的設定格式不正確。',
  post_scope_missing: '找不到 post 分類，無法新增文章。',
  github_rate_limited: 'GitHub 的請求次數已達上限，請稍後再試。',
  github_unauthorized: 'GitHub token 無效或已過期。',
  github_forbidden: 'GitHub token 沒有讀取來源的權限。',
  github_not_found: '找不到來源 repo 或分支，或 token 沒有權限。',
  github_unreachable: '連不上 GitHub，請稍後再試。',
  github_error: 'GitHub 回應錯誤。',
  github_bad_response: 'GitHub 的回應格式不符預期。',
  github_tree_truncated: '來源的檔案太多，GitHub 只回傳了部分清單，所以不列出結果。',
  stale: '來源在清單產生之後有變動。',
  conflict: '站上的文章在清單產生之後有變動。',
}

export type ImportErrorKind =
  /** 409：整批都沒寫入，要重新整理清單再選。 */
  | 'stale'
  /** 422：選擇本身有問題（例如要連結的文章已刪除）。整批沒寫入，重新整理清單後再選。 */
  | 'validation'
  /** 連不上後端（fetch 丟 TypeError）。後端整批都成功才寫入、並檢查 blob SHA，所以重新整理後再送一次是安全的。 */
  | 'network'
  /** 502／503：來源或 GitHub 暫時不能用，或沒設定。 */
  | 'unavailable'
  | 'other'

export interface ImportError {
  kind: ImportErrorKind
  message: string
}

function reasonText(reason: string | null, status: number): string {
  if (reason !== null && reason in REASON_TEXT) return REASON_TEXT[reason]!
  return `來源暫時無法使用（HTTP ${status}）。`
}

/** 後端 409 errors 裡「站上內容在列出清單之後又改過」的 key（items.N.expected_site_version）。 */
const SITE_VERSION_ERROR_KEY = /^items\.\d+\.expected_site_version$/

/** 站上內容在清單載入之後又改過：後端的原文（「請重新整理清單，確認後再決定要不要覆蓋」）改用這句固定的說明。 */
const SITE_EDITED_TEXT = '站上的標題、日期或內文在清單載入之後又改過。'

/** 後端 errors 的內容攤平成不重複的訊息；沒有 errors、或不是預期的形狀時回空陣列。 */
function uniqueErrorMessages(errors: unknown, include: (key: string) => boolean = () => true): string[] {
  if (typeof errors !== 'object' || errors === null) return []
  const messages = new Set<string>()
  for (const [key, value] of Object.entries(errors)) {
    if (!include(key)) continue
    for (const message of Array.isArray(value) ? value : [value]) {
      if (typeof message === 'string' && message !== '') messages.add(message)
    }
  }
  return [...messages]
}

/** 訊息接在一起時每句都要以句號結尾。 */
function asSentence(message: string): string {
  return /[。！？]$/.test(message) ? message : `${message}。`
}

/** 列清單與匯入共用：把例外變成要顯示的中文與分類。 */
export function describeImportError(e: unknown): ImportError {
  if (e instanceof ApiRequestError || e instanceof ApiHttpError) {
    if (e.status === 409) {
      const errorKeys = typeof e.body?.errors === 'object' && e.body.errors !== null ? Object.keys(e.body.errors) : []
      if (errorKeys.some((key) => SITE_VERSION_ERROR_KEY.test(key))) {
        // 其他項目的原因照舊列出；這一項改用固定說明，出路是重讀清單、看過站上現在的內容再決定
        const others = uniqueErrorMessages(e.body?.errors, (key) => !SITE_VERSION_ERROR_KEY.test(key))
          .map(asSentence)
          .join('')
        return {
          kind: 'stale',
          message: `${SITE_EDITED_TEXT}${others}沒有任何文章被寫入。請重新整理清單，確認站上現在的內容後，再決定要不要覆蓋。`,
        }
      }
      const detail = e.reason !== null && e.reason in REASON_TEXT ? REASON_TEXT[e.reason] : ''
      // 後端 errors 列出每一項被退回的原因（以請求欄位為 key），key 對使用者沒有意義，只留訊息
      const reasons = uniqueErrorMessages(e.body?.errors).map(asSentence).join('')
      return {
        kind: 'stale',
        message: `${detail}${reasons}沒有任何文章被寫入。請重新整理清單，再選一次。`,
      }
    }
    if (e.status === 502 || e.status === 503) {
      return { kind: 'unavailable', message: reasonText(e.reason, e.status) }
    }
    if (e.status === 403) return { kind: 'other', message: '這個帳號沒有匯入文章的權限。' }
    return { kind: 'other', message: `請求失敗（HTTP ${e.status}），請稍後再試。` }
  }
  if (e instanceof ApiValidationError) {
    const messages = Object.values(e.fieldErrors)
    return {
      kind: 'validation',
      message: messages.length
        ? `${messages.map(asSentence).join('')}沒有任何文章被寫入。`
        : '選擇的內容未通過驗證，沒有任何文章被寫入。',
    }
  }
  if (e instanceof AuthSessionChangedError || e instanceof AuthRefreshUnavailableError) {
    return { kind: 'other', message: e.message }
  }
  if (e instanceof TypeError) return { kind: 'network', message: '連不上後端 API，請稍後再試。' }
  return { kind: 'other', message: '發生未預期的錯誤，請稍後再試。' }
}

/** 提交前問題的中文說明。 */
export function describeProblem(
  problem: SelectionProblem,
  titleOf: (path: string) => string,
): string {
  switch (problem.kind) {
    case 'too_many':
      return `一次最多匯入 ${problem.max} 篇，請減少選擇。`
    case 'missing_target':
      return `「${titleOf(problem.path)}」還沒選要連結的文章。`
    case 'duplicate_target':
      return `文章 #${problem.documentationId} 被選了不只一次，一篇文章只能連結一個來源檔案。`
    case 'overwrite_unconfirmed':
      return `「${titleOf(problem.path)}」要覆蓋站上的修改，請先勾選確認。`
    case 'site_version_missing':
      return `「${titleOf(problem.path)}」的清單資料缺少站上版本，沒辦法確認覆蓋的是哪一版，請重新整理清單。`
  }
}
