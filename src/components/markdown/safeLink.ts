/**
 * Markdown 連結的網址白名單：只放行 http、https、mailto，跟站內路徑（`/…`）、錨點（`#…`）。
 * 其他協定（javascript:、data:、vbscript:、file: …）一律不給 href，MarkdownBody 改成純文字。
 *
 * Vue 不會擋 `href="javascript:…"`，Markdown 的 `[x](javascript:alert(1))` 不過濾的話
 * 點下去就是在 jerrylib.com 上執行任意 script——而這個網站上的 script 能用 refresh cookie
 * 換出 access token。
 *
 * 判斷協定不自己寫正規表示式，交給瀏覽器同一套 WHATWG URL parser（`new URL`）：
 * 大小寫（`JaVaScRiPt:`）、前後空白與控制字元、夾在中間的 tab／換行（`java\tscript:`）
 * 這些混淆，parser 的處理方式跟瀏覽器點連結時一模一樣，不會有「我們認為安全、瀏覽器
 * 卻當成 javascript:」的落差。HTML entity（`&#106;avascript:`）在 remark 解析時就已經
 * 還原成一般字元，到這裡看到的是還原後的網址。
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/** 只用來把相對網址解析成完整網址、看它會不會跑到別的主機；不會出現在輸出裡 */
const PROBE_BASE = 'https://relative.invalid/'

export interface SafeLink {
  /** 要放進 href／RouterLink `to` 的值 */
  href: string
  /** 站內路徑或錨點：走 RouterLink；其他開新分頁 */
  internal: boolean
}

/** URL parser 的前處理：去掉前後的 C0 控制字元與空白、刪掉所有 tab 與換行 */
function normalize(raw: string): string {
  let start = 0
  let end = raw.length
  while (start < end && raw.charCodeAt(start) <= 0x20) start++
  while (end > start && raw.charCodeAt(end - 1) <= 0x20) end--
  return raw.slice(start, end).replace(/[\t\n\r]/g, '')
}

export function safeLink(raw: string | null | undefined): SafeLink | null {
  const url = normalize(raw ?? '')
  if (url === '') return null

  // 站內：`/路徑` 或 `#錨點`。`//host`、`/\host` 是「同協定的別的網站」，不算站內
  if (url.startsWith('#') || (url.startsWith('/') && !/^\/[/\\]/.test(url))) {
    return { href: url, internal: true }
  }

  // 有協定的完整網址：協定在白名單裡才放行，輸出 parser 正規化後的網址
  let absolute: URL | null = null
  try {
    absolute = new URL(url)
  } catch {
    // 沒有協定：相對網址，往下處理
  }
  if (absolute) {
    return ALLOWED_PROTOCOLS.has(absolute.protocol) ? { href: absolute.href, internal: false } : null
  }

  // 相對網址的協定一定跟頁面相同（https）。`//evil.example`、`\\evil.example` 會跑到別的主機：
  // 輸出解析後的完整 https 網址，不把原始字串交給瀏覽器再解析一次
  let resolved: URL
  try {
    resolved = new URL(url, PROBE_BASE)
  } catch {
    return null
  }
  if (resolved.origin !== new URL(PROBE_BASE).origin) {
    return ALLOWED_PROTOCOLS.has(resolved.protocol) ? { href: resolved.href, internal: false } : null
  }
  return { href: url, internal: false }
}
