// 登入後要導去的頁面來自網址的 redirect 參數，任何人都能改，所以只接受站內路徑。
// `//example.com` 與 `/\example.com` 開頭是斜線，但瀏覽器會當成別的網域，要另外排除。
// 含控制字元（tab、換行等）的值一律拒絕，不是刪掉再繼續檢查：瀏覽器解析網址時會丟掉這些字元，
// 檢查時看到的字串跟瀏覽器實際解析的網址就會不一樣。
// 最後再用 URL 解析一次，確認解析出來仍是同一個來源，前面的字首檢查漏掉的寫法也會被擋下。
// 不符合就回到預設頁，而不是報錯：使用者剛登入成功，讓他停在可用的頁面比較重要。

// 解析用的假來源，只拿來比對解析結果是不是還在同一個來源，不會真的連過去。
const PROBE_ORIGIN = 'https://x.invalid'

// ASCII 控制字元：U+0000–U+001F 與 U+007F。
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

export function safeRedirect(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  if (hasControlChar(value)) return fallback
  if (!value.startsWith('/')) return fallback
  if (value[1] === '/' || value[1] === '\\') return fallback
  try {
    if (new URL(value, `${PROBE_ORIGIN}/`).origin !== PROBE_ORIGIN) return fallback
  } catch {
    return fallback
  }
  return value
}
