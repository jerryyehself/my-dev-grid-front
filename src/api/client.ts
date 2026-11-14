import { getActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import router from '@/router'

// 後端 my-dev-grid（Laravel）的 API base URL，透過 VITE_API_BASE_URL 覆寫；
// 本地開發預設打 Laravel 內建伺服器的預設埠。
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

/**
 * Sanctum API token 模式（D-56）：帶
 * `Authorization: Bearer`，不是 cookie，所以一般請求不用 `credentials: 'include'`
 * （只有登入／換發／登出那幾支會碰 refresh cookie，在 useAuthStore 裡另外處理）。
 * `useAuthStore()` 在一般 component 外的模組層級呼叫也能用——Pinia 在
 * `app.use(createPinia())` 之後會設一個全域 active instance，這個專案
 * 只有一個 Pinia instance，不會有拿錯 instance 的問題。
 *
 * 先檢查 `getActivePinia()`：這個專案既有的 API 單元測試（例如
 * `projects.spec.ts`）直接呼叫 `fetchProjects()`，不會先 mount 一個掛了
 * Pinia 的 app，沒有這層防呆的話 `useAuthStore()` 會直接丟
 * "no active Pinia" 例外，把本來跟認證無關的測試也弄壞。沒有 Pinia 就當成沒登入。
 */
function activeAuthStore(): ReturnType<typeof useAuthStore> | null {
  return getActivePinia() ? useAuthStore() : null
}

/**
 * 換發也救不回來的 401（refresh cookie 無效／過期），統一導去登入頁並帶上原本要去的
 * 路徑——跟 Triple 後台 `useFetchAPI.js` 既有的 401 處理邏輯是同一個模式。
 * 已經在登入頁就不再導一次：不然 redirect 會變成 /login，登入成功後又停在登入頁。
 *
 * 清登入狀態走 store 的 clearSession()，不直接改 token：登入世代要跟著換，還在進行的換發
 * 回來時才知道結果要丟掉，不會在導去登入頁之後又把登入狀態寫回來；「上次是登入狀態」的
 * 旗標也一起清掉，下次開站不用再白打一次換發。
 */
function handleUnauthorized(): never {
  if (getActivePinia()) useAuthStore().clearSession()
  const current = router.currentRoute.value
  if (current.name !== 'login') {
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
  throw new Error('Unauthorized')
}

/**
 * 帶 token 的請求收到 401、換發卻暫時失敗（連不上後端、5xx、429）時丟的錯誤。
 * 這時後端的登入多半還活著，所以不清登入狀態、不導去登入頁——以前會導過去，
 * 編輯器裡還沒存的內容就跟著不見了。呼叫端把它當成「稍後再試」的錯誤顯示即可。
 */
export class AuthRefreshUnavailableError extends Error {
  constructor() {
    super('暫時無法更新登入狀態（伺服器沒有回應），目前仍是登入狀態，請稍後再試一次')
    this.name = 'AuthRefreshUnavailableError'
  }
}

/**
 * 帶 token 的請求收到 401，但送出之後登入狀態已經換掉了（登出、重新登入、換帳號）時丟的錯誤。
 * 這個請求是上一次登入送的：不用目前的 token 重送（可能是另一個帳號，等於用別人的身分做
 * 原本的操作），也不清登入狀態、不導頁（目前的登入跟這個 401 無關）。
 */
export class AuthSessionChangedError extends Error {
  constructor() {
    super('送出之後登入狀態已經改變（登出或重新登入），這個操作沒有完成，請確認後再試一次')
    this.name = 'AuthSessionChangedError'
  }
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
    /** 後端錯誤回應的 JSON（解析不出來是 null）。要分辨 `reason` 這類固定代號時讀這裡。 */
    readonly body: ApiErrorBody | null = null,
  ) {
    super(`API 請求失敗（${status}）：${path}`)
    this.name = 'ApiHttpError'
  }

  get reason(): string | null {
    return this.body?.reason ?? null
  }
}

/**
 * 非 GET 請求收到非 2xx（422 除外，那個走 ApiValidationError）時丟的錯誤。
 * 訊息格式沿用以前的 `Error`（含請求方法），另外帶狀態碼與後端回應的 `reason`／`errors`，
 * 呼叫端要分辨 409（清單過期）或 502／503（外部服務出錯）時不用去猜 `message`。
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly method: string,
    readonly body: ApiErrorBody | null = null,
  ) {
    super(`API 請求失敗（${status}）：${method} ${path}`)
    this.name = 'ApiRequestError'
  }

  get reason(): string | null {
    return this.body?.reason ?? null
  }
}

/** 後端錯誤回應的共同形狀：`message` 是中文說明，`reason` 是固定代號，`errors` 以欄位為 key。 */
export interface ApiErrorBody {
  message?: string
  reason?: string
  errors?: Record<string, string[] | string>
}

/** 讀錯誤回應的 JSON；不是 JSON、或 mock 沒有 json() 時回 null，不讓它蓋掉原本的 HTTP 錯誤。 */
async function readErrorBody(res: Response): Promise<ApiErrorBody | null> {
  try {
    const data: unknown = await res.json()
    return data !== null && typeof data === 'object' ? (data as ApiErrorBody) : null
  } catch {
    return null
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
 * 4xx／5xx 回應在 console 記一行 error：方法、路徑、狀態碼跟 `X-Request-Id`，
 * 站主回報問題時可以拿這個 id 去後端 log 對（D-128）。只寫 console，不顯示在畫面上。
 * 後端要在 CORS `exposed_headers` 公開這個 header，前端跨來源才讀得到；還沒公開
 * （或後端沒回）時 `get` 回 null，印 `(none)`，不影響原本的錯誤處理。
 */
function logErrorResponse(method: string, path: string, res: Response): void {
  if (res.status < 400) return
  const requestId = res.headers?.get('X-Request-Id') ?? null
  console.error(
    `API 請求失敗：${method} ${path} HTTP ${res.status}，request id: ${requestId ?? '(none)'}`,
  )
}

/**
 * 帶 token 的請求收到 401 之後最多再送幾次。正常過期只要一次（換發後重送）；最多兩次是給
 * 「送出時那支 token 已經被別的請求換掉，換上的那支也已經失效」的情況：先用目前的 token
 * 重送一次，還是 401 再換發一次、重送一次。
 */
const MAX_RESENDS_AFTER_401 = 2

/**
 * 送出請求；帶著 token 卻收到 401（access token 只活 15 分鐘，過期是常態），
 * 先用 refresh cookie 換一支新的 token、再重送。換發最多一次、重送最多
 * MAX_RESENDS_AFTER_401 次，用完還是 401，或後端說 refresh cookie 也無效，就當成真的
 * 沒登入。換發暫時失敗時丟 AuthRefreshUnavailableError，不清登入狀態也不導頁。
 * 沒帶 token 的請求收到 401 不換發，照舊直接導去登入頁（送出之後已經登入的話，跟下面
 * 「世代變了」一樣丟 AuthSessionChangedError，不把剛登入的狀態清掉）。
 *
 * 送出時記下登入世代（見 useAuthStore 的 loginGeneration）。401 回來時：
 * - 世代變了（送出之後登出、重新登入或換了帳號）：丟 AuthSessionChangedError。不重送、
 *   不換發、不清登入狀態——這個請求屬於上一次登入，不能拿目前的 token 代替它送。
 * - 世代沒變、token 已經換成別支（同一次登入裡別的請求換發過了）：直接用目前的 token
 *   重送，不再換發。refresh token 單次使用，再換一次後端會把上一次剛換出來的 access token
 *   作廢，正拿著它重送的其他請求又會 401。
 * - 世代沒變、token 還是送出時那一支：換發後用新的 token 重送。
 * 換發期間世代變了（store 回 superseded）一樣丟 AuthSessionChangedError。
 */
async function authorizedFetch(
  path: string,
  init: RequestInit = {},
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const method = init.method ?? 'GET'
  const send = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...extraHeaders, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })

  const auth = activeAuthStore()
  const sentGeneration = auth?.currentLoginGeneration() ?? null
  const sessionChanged = () => auth !== null && auth.currentLoginGeneration() !== sentGeneration
  const fail = (res: Response, error: Error): never => {
    logErrorResponse(method, path, res)
    throw error
  }

  const sentToken = auth?.token ?? null
  let res = await send(sentToken)

  if (auth && sentToken !== null) {
    let tried = sentToken
    let refreshUsed = false
    for (let resends = 0; res.status === 401 && resends < MAX_RESENDS_AFTER_401; resends++) {
      if (sessionChanged()) fail(res, new AuthSessionChangedError())
      let next = auth.token
      if (next === null) break
      if (next === tried) {
        if (refreshUsed) break
        refreshUsed = true
        const outcome = await auth.refresh()
        if (outcome === 'unavailable') fail(res, new AuthRefreshUnavailableError())
        if (outcome === 'superseded') fail(res, new AuthSessionChangedError())
        next = auth.token
        // unauthorized：換發已經清掉登入狀態（世代也換了，是這個請求自己造成的），直接導登入頁
        if (outcome === 'unauthorized' || next === null) {
          logErrorResponse(method, path, res)
          handleUnauthorized()
        }
      }
      tried = next
      res = await send(next)
    }
  }

  logErrorResponse(method, path, res)
  if (res.status === 401) {
    // 最後這次 401 回來之前登入狀態已經換掉：不能把新的登入清掉
    if (sessionChanged()) throw new AuthSessionChangedError()
    handleUnauthorized()
  }
  return res
}

/**
 * GET 失敗時重試的等待時間（毫秒），陣列長度就是重試次數。
 *
 * 後端 Cloud Run 閒置會縮到 0 台，下一個請求要等容器冷啟動；啟動那一下 nginx 比 php-fpm 先
 * 就緒，前一兩個請求會拿到 502（2026-10-04 部署切換時實測到）。實際症狀是文章常常打不到
 * 資料庫、顯示示範資料——文章頁一次打兩支 API，只要其中一支碰到就整頁退回示範資料。
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
      throw new ApiHttpError(res.status, path, 'GET', await readErrorBody(res))
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
    throw new ApiRequestError(res.status, path, method, await readErrorBody(res))
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
