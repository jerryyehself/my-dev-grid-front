// 文章摘要。D-57：summary/intro 不開獨立欄位，直接用 body（Markdown 原文）
// 第一段格式帶——這裡就是「格式帶」的唯一實作，跟 headings.ts 的 slug
// 是同一個角色：只有一個地方算，別處都呼叫它，不要各自重算一次。
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

interface MdNode {
  type: string
  value?: string
  children?: MdNode[]
}

const processor = unified().use(remarkParse).use(remarkGfm)

function plainText(node: MdNode): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? ''
  return (node.children ?? []).map(plainText).join('')
}

// 結尾是冒號：這段是在帶出後面的清單／表格／程式碼，單獨拿出來當摘要會停在「：」
const LEAD_IN_ENDING = /[：:]\s*$/

interface Candidate {
  text: string
  leadIn: boolean
}

function candidateOf(node: MdNode, next: MdNode | undefined): Candidate | null {
  const text = plainText(node)
  if (!text.trim()) return null
  return { text, leadIn: LEAD_IN_ENDING.test(text) && !!next && next.type !== 'paragraph' }
}

/**
 * 取內文的摘要段落，粗體/連結/行內程式碼都拆成純文字，不保留 Markdown 語法。沒有文字就回傳空字串。
 *
 * 候選段落依出現順序：第一個標題之前的段落（含開頭引言區塊 `>` 裡的段落，那是作者寫的文章簡介），
 * 接著是標題之後的頂層段落；標題、程式碼區塊、圖片、表格、清單本身都不算。
 * 結尾是冒號、後面接的不是段落的（帶出清單或表格的引言句）往後排：有其他段落就用其他段落，
 * 全部都是這種才用它，並拿掉結尾的冒號。
 */
export function excerptOf(source: string): string {
  const tree = processor.parse(source) as unknown as MdNode
  const blocks = tree.children ?? []
  const firstHeading = blocks.findIndex((node) => node.type === 'heading')
  const leadEnd = firstHeading === -1 ? blocks.length : firstHeading

  const candidates: Candidate[] = []
  blocks.forEach((node, index) => {
    const next = blocks[index + 1]
    if (node.type === 'paragraph') {
      const c = candidateOf(node, next)
      if (c) candidates.push(c)
    } else if (node.type === 'blockquote' && index < leadEnd) {
      const inner = node.children ?? []
      inner.forEach((child, i) => {
        if (child.type !== 'paragraph') return
        // 引言區塊最後一段後面接的是區塊外的下一個節點
        const c = candidateOf(child, inner[i + 1] ?? next)
        if (c) candidates.push(c)
      })
    }
  })

  const plain = candidates.find((c) => !c.leadIn)
  if (plain) return plain.text
  return candidates[0]?.text.replace(LEAD_IN_ENDING, '') ?? ''
}
