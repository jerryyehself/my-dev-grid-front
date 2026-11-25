import { describe, expect, it } from 'vitest'
import type { ArticleMindmap } from './articleMindmapTypes'
import { estimateLabelWidth } from './measureLabel'
import { linesWidth, narrowestTwoLines } from './wrapLabel'

// 跟排版同一套量字方式（測試環境沒有 OffscreenCanvas，measureLabelWidth 走的也是這個估算）
const measure = (text: string, font: { size: number }) => estimateLabelWidth(text, font.size)
const FONT = { size: 13, weight: 500, serif: false }
const CENTER_FONT = { size: 16, weight: 700, serif: true }

const datasets = import.meta.glob<ArticleMindmap>('./data/articleMindmap*.json', { import: 'default', eager: true })
const realLabels = Object.values(datasets).flatMap((d) => d.nodes.map((n) => n.label))

const NO_LINE_START = /^[、，。：；！？）」』》〉】,.:;!?)\]}…]/
const NO_LINE_END = /[（「『《〈【([{]$/
const isLatin = (ch: string | undefined) => ch !== undefined && /[A-Za-z0-9_]/.test(ch)

/** 兩行接回去要等於原文：在空白處斷的，空白回到兩行中間 */
function rejoin(text: string, lines: string[]): boolean {
  return lines.join('') === text || lines.join(' ') === text
}

describe('narrowestTwoLines', () => {
  it('它應該把真實資料最長的中文詞依字折成兩半（文章 14 的中心詞）', () => {
    const lines = narrowestTwoLines('首頁知識網路為什麼用節點連結圖', CENTER_FONT, measure)
    expect(lines).toEqual(['首頁知識網路為', '什麼用節點連結圖'])
  })

  it('它應該只在英文詞與詞之間斷，不拆開一個英文詞（文章 12 最長的詞）', () => {
    const text = 'GitHub Actions 與 Workers Builds 兩組檢查'
    const lines = narrowestTwoLines(text, FONT, measure)
    expect(lines).toHaveLength(2)
    expect(rejoin(text, lines)).toBe(true)
    for (const word of ['GitHub', 'Actions', 'Workers', 'Builds']) {
      expect(lines.some((l) => l.includes(word)), `「${word}」被拆開`).toBe(true)
    }
    // 兩行都比一行窄，而且是最窄的折法
    expect(linesWidth(lines, FONT, measure)).toBeLessThan(measure(text, FONT))
    expect(lines).toEqual(['GitHub Actions 與', 'Workers Builds 兩組檢查'])
  })

  it('它應該在中文與英文相接的地方也能斷（文章 17 的「information managing」不拆）', () => {
    const lines = narrowestTwoLines('引用與收藏屬於 information managing', FONT, measure)
    expect(lines).toEqual(['引用與收藏屬於', 'information managing'])
  })

  it('它應該在全是英文時於空白處斷（文章 15 的 nominative fair use）', () => {
    expect(narrowestTwoLines('nominative fair use', FONT, measure)).toEqual(['nominative', 'fair use'])
  })

  it('它應該讓「、」不出現在行首（文章 17 的「列表管要不要點、內頁管信不信」）', () => {
    // 「列表管要不要／點、內頁管信不信」一樣窄，但在「、」後面斷比較好讀
    const lines = narrowestTwoLines('列表管要不要點、內頁管信不信', FONT, measure)
    expect(lines).toEqual(['列表管要不要點、', '內頁管信不信'])
  })

  it('它應該讓開頭的括號不留在行尾', () => {
    const lines = narrowestTwoLines('內容安全政策（CSP）設定方式', FONT, measure)
    expect(lines.length).toBe(2)
    expect(lines[0]).not.toMatch(NO_LINE_END)
    expect(lines[1]).not.toMatch(NO_LINE_START)
  })

  it.each(['mergeable_state', 'meta-framework', 'DNSSEC', '', '甲'])('它應該讓沒辦法斷的詞「%s」維持一行', (text) => {
    expect(narrowestTwoLines(text, FONT, measure)).toEqual([text])
  })

  it('它應該對真實資料的每個詞都折成最多兩行、接回去等於原文、不拆英文詞、標點不落在行首行尾', () => {
    expect(realLabels.length).toBeGreaterThan(100)
    for (const text of realLabels) {
      const lines = narrowestTwoLines(text, FONT, measure)
      expect(lines.length, text).toBeLessThanOrEqual(2)
      expect(rejoin(text, lines), text).toBe(true)
      expect(linesWidth(lines, FONT, measure), text).toBeLessThanOrEqual(measure(text, FONT))
      if (lines.length === 2) {
        const [a, b] = lines as [string, string]
        expect(a.trim(), text).toBe(a)
        expect(b.trim(), text).toBe(b)
        expect(b, text).not.toMatch(NO_LINE_START)
        expect(a, text).not.toMatch(NO_LINE_END)
        // 直接相接（沒有空白）的兩個英文字母／數字不能被拆到兩行
        if (lines.join('') === text) expect(isLatin(a.at(-1)) && isLatin(b[0]), text).toBe(false)
      }
    }
  })
})

describe('linesWidth', () => {
  it('它應該取最寬那行的寬度', () => {
    expect(linesWidth(['甲乙', '甲乙丙'], FONT, measure)).toBe(39)
    expect(linesWidth([], FONT, measure)).toBe(0)
  })
})
