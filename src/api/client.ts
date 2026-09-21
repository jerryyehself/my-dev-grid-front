// 後端 my-dev-grid（Laravel）的 API base URL，透過 VITE_API_BASE_URL 覆寫；
// 本地開發預設打 Laravel 內建伺服器的預設埠。
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`API 請求失敗（${res.status}）：${path}`)
  }
  return res.json() as Promise<T>
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
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })

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
