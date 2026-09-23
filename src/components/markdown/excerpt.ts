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

/**
 * 取內文第一個段落節點的純文字（跳過標題、程式碼區塊、圖片、表格……），
 * 粗體/連結/行內程式碼都拆成純文字，不保留 Markdown 語法。沒有段落就回傳空字串。
 */
export function excerptOf(source: string): string {
  const tree = processor.parse(source) as unknown as MdNode
  const firstParagraph = (tree.children ?? []).find((n) => n.type === 'paragraph')
  return firstParagraph ? plainText(firstParagraph) : ''
}
