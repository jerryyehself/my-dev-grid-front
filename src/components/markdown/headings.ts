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

/**
 * 從標題文字推出 slug。
 *
 * **這不是穩定的身分。** 改標題文字就會換 slug，指向它的書籤與外部連結會斷。
 * 用在頁內目錄是安全的（目錄跟標題是同一次 render 從同一份來源算出來的，永遠一致），
 * 但**不要拿去存**——要被存下來的指涉必須用作者明確寫的錨點（`## 標題 {#stable-id}`），
 * 見 management-debt-ledger 的段落指涉那一列。
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

/** 把同名標題後面補流水號，免得兩個 id 撞在一起讓錨點指到第一個。 */
function dedupe(slugs: string[]): string[] {
  const seen = new Map<string, number>()
  return slugs.map((s) => {
    const n = (seen.get(s) ?? 0) + 1
    seen.set(s, n)
    return n === 1 ? s : `${s}-${n}`
  })
}

interface MdNode {
  type: string
  depth?: number
  value?: string
  children?: MdNode[]
}

const processor = unified().use(remarkParse).use(remarkGfm)

function textOf(node: MdNode): string {
  if (node.value) return node.value
  return (node.children ?? []).map(textOf).join('')
}

/** 依文件順序列出所有標題。目錄與內文的 id 都從這裡來。 */
export function extractHeadings(source: string): Heading[] {
  const tree = processor.parse(source) as unknown as MdNode
  const found: { depth: number; text: string }[] = []
  const walk = (n: MdNode) => {
    if (n.type === 'heading') found.push({ depth: n.depth ?? 1, text: textOf(n) })
    ;(n.children ?? []).forEach(walk)
  }
  walk(tree)
  const slugs = dedupe(found.map((f) => slugify(f.text)))
  return found.map((f, i) => ({ ...f, slug: slugs[i]! }))
}
