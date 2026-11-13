// 編輯頁「插入腳註」按鈕背後的純邏輯：決定下一個腳註編號，並算出插入後的內文與游標位置。
// 不碰 DOM、不碰 Vue；編輯頁拿去套用到 textarea，測試也直接測這裡。
// 語法是標準 Markdown 註腳：內文 `[^1]`，定義 `[^1]: 內容`（渲染見 MarkdownBody）。

/** 一個 fence 開頭／結尾：最多縮 3 格，三個以上的 ` 或 ~。 */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/
/** 定義行：`[^標籤]: …`，標籤不含空白與 `]`。 */
const DEFINITION_LINE = /^ {0,3}\[\^[^\]\s]+\]:/
/** 數字標籤的引用或定義（前面有反斜線跳脫的不算）。 */
const NUMERIC_LABEL = /(?<!\\)\[\^(\d+)\]/g
/** 一段等長的反引號夾起來的行內程式碼。 */
const CODE_SPAN = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g

/**
 * 去掉 fenced code block 與行內程式碼，剩下的才是 Markdown 會當成註腳語法解讀的文字。
 * fence 沒關起來就一路算到文末（CommonMark 也是這樣）。縮排 4 格的程式碼區塊不處理：
 * 跟清單內文的續行分不乾淨，寧可多算一個編號（只會跳號），也不要漏掉真的引用而撞號。
 */
function stripCode(source: string): string {
  const kept: string[] = []
  let fence: { char: string; length: number } | null = null
  for (const line of source.split('\n')) {
    const m = FENCE.exec(line.replace(/\r$/, ''))
    if (fence) {
      // 結尾 fence：同一種字元、至少一樣長、後面不能再接文字
      if (m && m[1]![0] === fence.char && m[1]!.length >= fence.length && m[2]!.trim() === '') {
        fence = null
      }
      continue
    }
    // 開頭 fence：反引號 fence 的說明文字不能含反引號，否則那是行內程式碼
    if (m && !(m[1]![0] === '`' && m[2]!.includes('`'))) {
      fence = { char: m[1]![0]!, length: m[1]!.length }
      continue
    }
    kept.push(line)
  }
  // 行內程式碼不能跨段落：先依空行切開再各自處理，免得一個沒配對的 ` 吃掉後面整篇
  return kept
    .join('\n')
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.replace(CODE_SPAN, ''))
    .join('\n\n')
}

/**
 * 下一個還沒用的腳註編號：內文裡出現過的最大數字編號 + 1，沒有就是 1。
 * 引用與定義都算；編號有缺口（1、3）就接在最大值後面（4），不回頭補 2——
 * 補洞會讓新註腳的編號排在舊的前面，作者看起來像順序被打亂。
 * 非數字標籤（`[^note]`）不佔數字編號。
 */
export function nextFootnoteNumber(body: string): number {
  let max = 0
  for (const m of stripCode(body).matchAll(NUMERIC_LABEL)) {
    const n = Number(m[1])
    if (Number.isSafeInteger(n) && n > max) max = n
  }
  return max + 1
}

export interface FootnoteInsertion {
  /** 這次用掉的編號。 */
  number: number
  /** 插入後的完整內文。 */
  value: string
  /** 插入後游標的位置：新定義行 `[^N]: ` 之後（也就是內文結尾）。 */
  caret: number
  /**
   * 跟原文不同的連續區間：把原文的 [from, to) 換成 `text` 就得到 `value`。
   * 編輯頁用它做「一次編輯」，瀏覽器的復原才會一步退回，而不是整篇內容被重設。
   */
  from: number
  to: number
  text: string
}

/**
 * 在游標處插入腳註引用，並把空白定義補在文末。
 *
 * `start`／`end` 是 textarea 的 selectionStart／selectionEnd。有選取文字時選取的字原封不動，
 * 引用接在選取範圍後面；沒有選取就是游標位置。超出範圍的值會被夾回內文長度之內。
 *
 * 文末定義前的空行：最後一個非空行是別的定義就只換行（定義連在一起），否則空一行，
 * 讓定義跟內文分開；原本結尾已經有的換行會算進去，不會越補越多。
 */
export function insertFootnote(body: string, start: number, end: number): FootnoteInsertion {
  const number = nextFootnoteNumber(body)
  const at = Math.min(Math.max(Math.max(start, end), 0), body.length)
  const ref = `[^${number}]`
  const definition = `${ref}: `

  const tail = body.slice(at)
  const withRef = body.slice(0, at) + ref + tail

  const lastLine = withRef.trimEnd().split('\n').pop() ?? ''
  const wanted = DEFINITION_LINE.test(lastLine) ? 1 : 2
  let present = 0
  while (present < withRef.length && withRef[withRef.length - 1 - present] === '\n') present++
  // 全文只有引用、沒有內容可分隔時（空內文），present 是 0，wanted 2：`[^1]` 後空一行再接定義
  const separator = '\n'.repeat(Math.max(0, wanted - present))

  const text = ref + tail + separator + definition
  const value = body.slice(0, at) + text
  return { number, value, caret: value.length, from: at, to: body.length, text }
}
