import { describe, expect, it } from 'vitest'
import { estimateLabelWidth, measureLabelWidth } from './measureLabel'

describe('estimateLabelWidth', () => {
  it.each([
    ['', 0],
    ['背景', 28],
    ['ＡＢ', 28],
    ['ISO', 0.68 * 3 * 14],
    ['force', 0.56 * 5 * 14],
    ['a b', (0.56 * 2 + 0.3) * 14],
    ['degree 驅動', (0.56 * 6 + 0.3 + 2) * 14],
  ])('它應該估「%s」在 14px 下寬 %d', (text, width) => {
    expect(estimateLabelWidth(text, 14)).toBeCloseTo(width)
  })
})

describe('measureLabelWidth', () => {
  it('它應該在沒有 OffscreenCanvas 的環境（jsdom）退回估算', () => {
    expect(measureLabelWidth('背景', { size: 15, weight: 700, serif: false })).toBe(estimateLabelWidth('背景', 15))
  })
})
