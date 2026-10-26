// 登入後要導去的頁面來自網址的 redirect 參數，任何人都能改，所以只接受站內路徑。
// `//example.com` 與 `/\example.com` 開頭是斜線，但瀏覽器會當成別的網域，要另外排除。
// 不符合就回到預設頁，而不是報錯：使用者剛登入成功，讓他停在可用的頁面比較重要。
export function safeRedirect(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/')) return fallback
  if (value[1] === '/' || value[1] === '\\') return fallback
  return value
}
