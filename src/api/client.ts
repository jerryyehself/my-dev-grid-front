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
