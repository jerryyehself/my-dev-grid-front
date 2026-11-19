// 標題錨點。這裡是**唯一**產生 slug 的地方——目錄跟內文裡的 id 必須用同一個函式算，
// 分開算就會漂移，而且漂移的症狀是「點目錄沒反應」，不會有任何錯誤訊息。
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

export interface Heading {
  depth: number
  text: string
  slug: string
}

// 標題行尾的明確 ID：`## 標題 {#stable-id}`。規則與後端的段落切分一致——
// 只認 ATX 標題（最多 3 空白縮排、井號後要有空白），`{#id}` 後面只能接收尾井號與空白，
// 程式碼區塊（``` 或 ~~~，含較長圍欄）裡不動，內文裡的 `{#...}` 不動，格式不合的不動。
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/
const HEADING_LINE = /^ {0,3}#{1,6}[ \t]+/
const LINE_ID = /[ \t]*\{#([A-Za-z0-9][A-Za-z0-9_-]*)\}(?=(?:[ \t]+#+)?[ \t]*$)/

/**
 * 剝掉標題行尾的 `{#id}`，並回報每個標題行（1 起算）的明確 ID。
 * 只動標題行的那段文字，行數不變，所以 AST 的行號仍對得上原稿。
 */
export function stripHeadingIds(source: string): { source: string; ids: Map<number, string> } {
  const ids = new Map<number, string>()
  let fence: { char: string; length: number } | null = null
  const lines = source.split('\n').map((raw, index) => {
    const cr = raw.endsWith('\r') ? '\r' : ''
    const line = cr ? raw.slice(0, -1) : raw
    const f = FENCE.exec(line)
    if (f) {
      const marker = f[1]!
      if (fence === null) {
        // 反引號開頭的區塊，資訊字串裡不能再有反引號，否則只是行內程式碼
        if (marker[0] !== '`' || !f[2]!.includes('`')) fence = { char: marker[0]!, length: marker.length }
      } else if (marker[0] === fence.char && marker.length >= fence.length && f[2]!.trim() === '') {
        fence = null
      }
      return raw
    }
    if (fence !== null || !HEADING_LINE.test(line)) return raw
    const m = LINE_ID.exec(line)
    if (!m) return raw
    ids.set(index + 1, m[1]!)
    return line.replace(LINE_ID, '') + cr
  })
  return { source: lines.join('\n'), ids }
}

/**
 * 從標題文字推出 slug。
 *
 * **這不是穩定的身分。** 改標題文字就會換 slug，指向它的書籤與外部連結會斷。
 * 用在頁內目錄是安全的（目錄跟標題是同一次 render 從同一份來源算出來的，永遠一致），
 * 但**不要拿去存**——要被存下來的指涉必須用作者明確寫的錨點（`## 標題 {#stable-id}`）：
 * 有寫就直接拿它當 id，沒寫才用這個函式推。
 *
 * 比原本的 `section-${index}` 好一階:那個是位置，調換順序就默默指到別段；
 * 這個至少綁在內容上，只有改標題才會斷。
 */
export function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      // 保留中日韓文字、英數字與空白連字號，其餘標點一律去掉
      .replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\w\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
  )
}

/**
 * 把同名標題後面補流水號，免得兩個 id 撞在一起讓錨點指到第一個。
 * 明確 ID（`explicit[i]` 非 null）原樣使用，並先保留起來，自動 slug 不會撞上它。
 */
function dedupe(slugs: string[], explicit: (string | null)[]): string[] {
  const seen = new Map<string, number>()
  const used = new Set<string>(explicit.filter((e): e is string => e !== null))
  return slugs.map((s, i) => {
    const fixed = explicit[i]
    if (fixed != null) return fixed
    let n = (seen.get(s) ?? 0) + 1
    let candidate = n === 1 ? s : `${s}-${n}`
    while (used.has(candidate)) {
      n += 1
      candidate = `${s}-${n}`
    }
    seen.set(s, n)
    used.add(candidate)
    return candidate
  })
}

interface MdNode {
  type: string
  depth?: number
  position?: { start: { line: number } }
  value?: string
  children?: MdNode[]
}

const processor = unified().use(remarkParse).use(remarkGfm)

function textOf(node: MdNode): string {
  if (node.value) return node.value
  return (node.children ?? []).map(textOf).join('')
}

/** 依文件順序列出所有標題。目錄與內文的 id 都從這裡來；標題文字是剝掉 `{#id}` 之後的。 */
export function extractHeadings(source: string): Heading[] {
  const stripped = stripHeadingIds(source)
  const tree = processor.parse(stripped.source) as unknown as MdNode
  const found: { depth: number; text: string; id: string | null }[] = []
  const walk = (n: MdNode) => {
    // 註腳定義裡的標題不算：MarkdownBody 在註釋內容裡不產生有 id 的標題，
    // 這裡若照算，目錄會多一項點不到的，後面所有標題的 slug 也會跟內文錯開一格
    if (n.type === 'footnoteDefinition') return
    if (n.type === 'heading') {
      const line = n.position?.start.line
      found.push({
        depth: n.depth ?? 1,
        text: textOf(n),
        id: (line !== undefined && stripped.ids.get(line)) || null,
      })
    }
    ;(n.children ?? []).forEach(walk)
  }
  walk(tree)
  const slugs = dedupe(
    found.map((f) => slugify(f.text)),
    found.map((f) => f.id),
  )
  return found.map((f, i) => ({ depth: f.depth, text: f.text, slug: slugs[i]! }))
}
