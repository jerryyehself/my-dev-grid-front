import { getActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import router from '@/router'

// 後端 my-dev-grid（Laravel）的 API base URL，透過 VITE_API_BASE_URL 覆寫；
// 本地開發預設打 Laravel 內建伺服器的預設埠。
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

/**
 * Sanctum API token 模式（decision-register.md D-56）：帶
 * `Authorization: Bearer`，不是 cookie，所以一般請求不用 `credentials: 'include'`
 * （只有登入／換發／登出那幾支會碰 refresh cookie，在 useAuthStore 裡另外處理）。
 * `useAuthStore()` 在一般 component 外的模組層級呼叫也能用——Pinia 在
 * `app.use(createPinia())` 之後會設一個全域 active instance，這個專案
 * 只有一個 Pinia instance，不會有拿錯 instance 的問題。
 *
 * 先檢查 `getActivePinia()`：這個專案既有的 API 單元測試（例如
 * `projects.spec.ts`）直接呼叫 `fetchProjects()`，不會先 mount 一個掛了
 * Pinia 的 app，沒有這層防呆的話 `useAuthStore()` 會直接丟
 * "no active Pinia" 例外，把本來跟認證無關的測試也弄壞。
 */
function authHeaders(): Record<string, string> {
  if (!getActivePinia()) return {}
  const token = useAuthStore().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * 換發也救不回來的 401（refresh cookie 無效／過期），統一導去登入頁並帶上原本要去的
 * 路徑——跟 Triple 後台 `useFetchAPI.js` 既有的 401 處理邏輯是同一個模式。
 */
function handleUnauthorized(): never {
  if (getActivePinia()) useAuthStore().$patch({ token: null, user: null })
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  throw new Error('Unauthorized')
}

/**
 * GET 收到非 2xx 時丟的錯誤，帶著 HTTP 狀態碼。呼叫端要分「查無此資料（404）」跟
 * 「伺服器壞了（5xx）」時看 `status`，不要去猜 `message` 字串。
 * 網路層失敗（fetch 本身丟 TypeError）不會是這個類別，沒有 `status`。
 */
export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly method = 'GET',
  ) {
    super(`API 請求失敗（${status}）：${path}`)
    this.name = 'ApiHttpError'
  }
}

/**
 * 「載入失敗、改用示範資料」那一行錯誤訊息的內容。這行是給站主看的，所以直接講實際出了什麼事
 * （2026-10-02 站主指定，copy-language 的訪客用語規則不適用）：HTTP 錯誤寫出請求方法、路徑跟狀態碼，
 * 其他（網路層 fetch 失敗等）寫出錯誤本身的 message。
 */
export function describeLoadError(e: unknown): string {
  if (e instanceof ApiHttpError) {
    return `資料載入失敗：${e.method} ${e.path} 回傳 HTTP ${e.status}，下面先放示範資料。`
  }
  const message = e instanceof Error ? e.message : String(e)
  return `資料載入失敗：連不上後端 API（${message}），下面先放示範資料。`
}

/**
 * 送出請求；帶著 token 卻收到 401（access token 只活 15 分鐘，過期是常態），
 * 先用 refresh cookie 換一支新的 token、再重送一次。只重試一次：換到新 token
 * 重送還是 401，或根本換不到，就當成真的沒登入。沒帶 token 的請求收到 401
 * 不換發，照舊直接導去登入頁。header 每次送出前重新組，重送時才會帶到新 token。
 */
async function authorizedFetch(
  path: string,
  init: RequestInit = {},
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const send = () =>
    fetch(`${BASE_URL}${path}`, { ...init, headers: { ...extraHeaders, ...authHeaders() } })

  const sentWithToken = 'Authorization' in authHeaders()
  let res = await send()
  if (res.status === 401 && sentWithToken && (await useAuthStore().refresh())) {
    res = await send()
  }
  if (res.status === 401) handleUnauthorized()
  return res
}

/**
 * GET 失敗時重試的等待時間（毫秒），陣列長度就是重試次數。
 *
 * 後端 Cloud Run 閒置會縮到 0 台，下一個請求要等容器冷啟動；啟動那一下 nginx 比 php-fpm 先
 * 就緒，前一兩個請求會拿到 502（2026-10-04 部署切換時實測到）。站主回報「文章常常打不到
 * 資料庫就顯示示範資料」——文章頁一次打兩支 API，只要其中一支碰到就整頁退回示範資料。
 * 後端的根治（啟動檢查改打 /up）先不動，前端對「重試一下多半就好」的失敗自己再試：
 * 只重試 GET（冪等），只重試 502／503／504 跟網路層失敗（fetch 丟 TypeError），
 * 404、500、401 這些重試也不會變的照舊直接丟。測試環境不等，免得拖慢測試。
 */
const RETRY_DELAYS_MS = import.meta.env.MODE === 'test' ? [0, 0] : [800, 2000]
const RETRYABLE_STATUS = new Set([502, 503, 504])

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function apiGet<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const canRetry = attempt < RETRY_DELAYS_MS.length
    let res: Response
    try {
      res = await authorizedFetch(path)
    } catch (e) {
      if (!(e instanceof TypeError) || !canRetry) throw e
      await sleep(RETRY_DELAYS_MS[attempt]!)
      continue
    }
    if (RETRYABLE_STATUS.has(res.status) && canRetry) {
      await sleep(RETRY_DELAYS_MS[attempt]!)
      continue
    }
    if (!res.ok) {
      throw new ApiHttpError(res.status, path)
    }
    return res.json() as Promise<T>
  }
}

/**
 * 後端 422 的形狀是 `{ errors: { 欄位: [訊息, ...] } }`（`StoreScopeRequest` 的
 * `failedValidation()` 直接這樣丟，`RelationLockedException::render()` 也是）。
 * 攤平成 `{ 欄位: 第一句訊息 }` 讓表單可以掛在對應欄位底下。
 *
 * 為什麼要有自己的錯誤類別而不是沿用 `Error`：呼叫端要分得出「欄位填錯」跟
 * 「網路/伺服器壞掉」——前者要把訊息渲染在欄位旁邊，後者只能整頁報錯。
 * 用 `message` 字串去猜是哪一種，是之後一定會出錯的那種寫法。
 */
export class ApiValidationError extends Error {
  constructor(
    readonly fieldErrors: Record<string, string>,
    readonly status = 422,
  ) {
    super('輸入內容未通過驗證')
    this.name = 'ApiValidationError'
  }
}

interface RawValidationBody {
  errors?: Record<string, string[] | string>
  message?: string
}

function flattenErrors(errors: Record<string, string[] | string>): Record<string, string> {
  const flat: Record<string, string> = {}
  for (const [field, messages] of Object.entries(errors)) {
    // Laravel 一個欄位可以有多句。表單一次只顯示一句——多句堆疊會把版面撐開，
    // 而且第二句通常是第一句的衍生（「必填」之後才輪得到「長度」）。
    const first = Array.isArray(messages) ? messages[0] : messages
    if (first) flat[field] = first
  }
  return flat
}

async function sendJson<T>(method: 'POST' | 'PUT', path: string, body: unknown): Promise<T> {
  const res = await authorizedFetch(
    path,
    { method, body: JSON.stringify(body) },
    { 'Content-Type': 'application/json', Accept: 'application/json' },
  )

  if (res.status === 422) {
    // 422 的 body 一定是 JSON，但真的解析失敗時不要讓它變成看不懂的例外，
    // 退回一個空的欄位錯誤——畫面至少還能顯示「未通過驗證」。
    const data: RawValidationBody = await res.json().catch(() => ({}))
    throw new ApiValidationError(flattenErrors(data.errors ?? {}))
  }

  if (!res.ok) {
    throw new Error(`API 請求失敗（${res.status}）：${method} ${path}`)
  }

  return res.json() as Promise<T>
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return sendJson<T>('POST', path, body)
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return sendJson<T>('PUT', path, body)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await authorizedFetch(path, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(`API 請求失敗（${res.status}）：DELETE ${path}`)
  }
  return res.json() as Promise<T>
}
