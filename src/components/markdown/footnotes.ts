// Markdown 註腳（GFM 的 `[^1]` 與 `[^1]: 內容`）的編號與邊注排版。
// 全部是純函式，不碰 DOM、不碰 Vue，MarkdownBody 拿去用，測試也直接測這裡。

interface MdNode {
  type: string
  identifier?: string
  label?: string | null
  children?: MdNode[]
}

export interface FootnoteInfo {
  /** 顯示用的編號，從 1 起算。 */
  number: number
  /** mdast 的 identifier（小寫化後的標籤），同一則註釋的多次引用靠它對上。 */
  identifier: string
  /** 內文裡引用它的次數；0 代表孤兒定義（有定義、沒人引用）。 */
  refCount: number
  /** 定義節點（`[^x]: …` 的內容）。 */
  definition: MdNode
}

export interface FootnoteIndex {
  /** 依編號排好：先是被引用的（照第一次引用的順序），孤兒定義接在後面（照定義順序）。 */
  list: FootnoteInfo[]
  byId: Map<string, FootnoteInfo>
}

/**
 * 掃一次文件，決定每則註釋的編號。
 *
 * 編號依「第一次被引用」的順序，不是依定義寫在哪裡：定義常常全部丟在文末，順序跟內文無關。
 * 同一則註釋被引用很多次，永遠是同一個編號。沒有任何引用的定義也要列出來
 * （作者寫了就該看得到，不默默吞掉），編號排在被引用的後面。
 * 同一個標籤定義了兩次，採第一個（跟 CommonMark 的連結參照定義同一個規則）。
 *
 * 註釋內容裡再引用註釋（巢狀）不算引用：MarkdownBody 在註釋內容裡把它當純文字，
 * 這裡也就不計入，否則會多出一個內文裡找不到、點不到的編號。
 */
export function buildFootnoteIndex(root: MdNode): FootnoteIndex {
  const definitions = new Map<string, MdNode>()
  const definitionOrder: string[] = []
  const refCounts = new Map<string, number>()
  const refOrder: string[] = []

  const walk = (node: MdNode) => {
    if (node.type === 'footnoteDefinition') {
      const id = node.identifier
      if (id && !definitions.has(id)) {
        definitions.set(id, node)
        definitionOrder.push(id)
      }
      // 不往定義裡面走：裡面的巢狀引用不計（見上面的說明）
      return
    }
    if (node.type === 'footnoteReference') {
      const id = node.identifier
      if (id) {
        if (!refCounts.has(id)) refOrder.push(id)
        refCounts.set(id, (refCounts.get(id) ?? 0) + 1)
      }
    }
    for (const child of node.children ?? []) walk(child)
  }
  walk(root)

  const list: FootnoteInfo[] = []
  const byId = new Map<string, FootnoteInfo>()
  const push = (id: string) => {
    const definition = definitions.get(id)
    // 引用了、卻沒有定義：remark-gfm 本來就不會把這種 `[^x]` 當成註腳引用（會留成一般文字），
    // 保險起見這裡也略過，不替它編號
    if (!definition || byId.has(id)) return
    const info: FootnoteInfo = { number: list.length + 1, identifier: id, refCount: refCounts.get(id) ?? 0, definition }
    list.push(info)
    byId.set(id, info)
  }
  refOrder.forEach(push)
  definitionOrder.forEach(push)
  return { list, byId }
}

/**
 * 邊注往下推開，避免重疊。
 *
 * `tops` 是每則邊注「理想的 top」（跟它的引用同一行），`heights` 是各自的高度，
 * 兩者都依引用順序排。每一則至少要在前一則的底部再往下 `gap`，所以註釋密集的時候
 * 後面的會被往下推，但永遠不會往上跑到引用的上方，順序也不會變。
 */
export function stackSidenotes(tops: number[], heights: number[], gap = 12): number[] {
  const result: number[] = []
  let bottom = -Infinity
  tops.forEach((ideal, i) => {
    const top = Math.max(ideal, bottom + gap)
    result.push(top)
    bottom = top + (heights[i] ?? 0)
  })
  return result
}

// 只建一次：Intl.Segmenter 的建構成本不低，而每個註腳引用都會用到。不支援的環境退回逐碼位拆。
const graphemeSegmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

/**
 * 取出文字的最後一個字（以字形為單位，不會把組合字拆開），回傳 [前面的字, 最後一個字]。
 * 結尾是空白就不拆（回傳 [原文, '']）：空白本來就是斷行點，不用綁住編號。
 */
export function splitLastChar(value: string): [string, string] {
  const chars = graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(value), (s) => s.segment)
    : Array.from(value)
  const last = chars[chars.length - 1]
  if (!last || /\s/u.test(last)) return [value, '']
  return [chars.slice(0, -1).join(''), last]
}
