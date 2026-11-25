// 心智圖標籤折行：長詞折成最多兩行，讓整張圖塞得進文章欄寬，不用把整張圖縮小。
// 可以斷的地方：中文（含全形字）每個字之間、英文與數字只在詞與詞之間（空白、或跟中文相接處），
// 一個英文詞不拆開。標點照中文排版習慣：「、」「）」這類不放在行首，「（」這類不放在行尾。
// 寬度用排版同一套量字方式（measureLabel.ts），結果才跟畫面一致。
import type { LabelFont } from './measureLabel'

export type MeasureText = (text: string, font: LabelFont) => number

/** 可斷行的最小單位：text 是這一段的字，spaceBefore 是它跟前一段之間原本有空白 */
interface BreakUnit {
  text: string
  spaceBefore: boolean
}

/** 不放在行首的標點（接在前一段後面） */
const NO_LINE_START = new Set('、，。：；！？）」』》〉】,.:;!?)]}…')
/** 不放在行尾的標點（接在下一段前面） */
const NO_LINE_END = new Set('（「『《〈【([{')
/** 句中停頓的標點：兩種折法一樣窄時，優先在它後面斷 */
const PAUSE = new Set('、，：；,;:')

function isWide(ch: string): boolean {
  return (ch.codePointAt(0) ?? 0) >= 0x2e80
}

/** 切成可斷行的單位。 */
function breakUnits(text: string): BreakUnit[] {
  const units: BreakUnit[] = []
  let space = false
  let pendingOpen = ''
  const push = (piece: string) => {
    const last = units[units.length - 1]
    if (last && !space && NO_LINE_START.has(piece[0]!)) {
      last.text += piece
    } else {
      units.push({ text: pendingOpen + piece, spaceBefore: space && units.length > 0 })
      pendingOpen = ''
    }
    space = false
  }
  let word = ''
  const flushWord = () => {
    if (word) push(word)
    word = ''
  }
  for (const ch of text) {
    if (/\s/.test(ch)) {
      flushWord()
      space = true
    } else if (isWide(ch)) {
      flushWord()
      if (NO_LINE_END.has(ch)) {
        pendingOpen += ch
      } else {
        push(ch)
      }
    } else if (NO_LINE_END.has(ch) && !word) {
      pendingOpen += ch
    } else {
      word += ch
    }
  }
  flushWord()
  // 結尾剩下開頭的標點（少見），接在最後一段後面
  if (pendingOpen) {
    const last = units[units.length - 1]
    if (last) last.text += pendingOpen
    else units.push({ text: pendingOpen, spaceBefore: false })
  }
  return units
}

function joinUnits(units: BreakUnit[]): string {
  return units.map((u, i) => (i > 0 && u.spaceBefore ? ' ' : '') + u.text).join('')
}

/**
 * 這個詞折成兩行時最窄的折法（兩行裡較寬那行最窄）；一樣窄時優先在「、」這類停頓後面斷。
 * 只有一個單位（例如一個英文詞）沒辦法折，回傳原文一行。
 */
export function narrowestTwoLines(text: string, font: LabelFont, measure: MeasureText): string[] {
  const units = breakUnits(text)
  if (units.length < 2) return [text]
  let best: string[] = [text]
  let bestWidth = measure(text, font)
  let bestAtPause = false
  for (let k = 1; k < units.length; k++) {
    const first = joinUnits(units.slice(0, k))
    const second = joinUnits(units.slice(k))
    const width = Math.max(measure(first, font), measure(second, font))
    const atPause = PAUSE.has(first.at(-1)!)
    // 寬度差不到半個像素算一樣窄（量字有小數誤差）
    const narrower = width < bestWidth - 0.5
    const asNarrowAtPause = width < bestWidth + 0.5 && atPause && !bestAtPause
    if (narrower || asNarrowAtPause) {
      best = [first, second]
      bestWidth = width
      bestAtPause = atPause
    }
  }
  return best
}

/** 幾行字裡最寬那行的寬度。 */
export function linesWidth(lines: readonly string[], font: LabelFont, measure: MeasureText): number {
  return Math.max(0, ...lines.map((line) => measure(line, font)))
}
