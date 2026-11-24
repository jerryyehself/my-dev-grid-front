// 心智圖標籤的寬度。排版要先知道每個詞多寬，才排得出底線長度與欄位位置。
// 瀏覽器有 OffscreenCanvas 就用它量（字型跟畫面上一樣）；沒有（測試環境 jsdom）就用估算，
// 估算只求不要差太多：中文與全形字算一個字寬，拉丁字母依大小寫給不同比例。

export interface LabelFont {
  /** px */
  size: number
  weight: number
  serif: boolean
}

/** 估算寬度：CJK／全形 1em，大寫 0.68em，其他拉丁字母與數字 0.56em，空白與窄標點 0.3em。 */
export function estimateLabelWidth(text: string, size: number): number {
  let em = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code >= 0x2e80) em += 1
    else if (/[A-Z]/.test(ch)) em += 0.68
    else if (/[a-z0-9]/.test(ch)) em += 0.56
    else em += 0.3
  }
  return em * size
}

let context: OffscreenCanvasRenderingContext2D | null | undefined

function fontFamily(serif: boolean): string {
  const fallback = serif ? "'Noto Serif TC', Georgia, serif" : 'ui-sans-serif, system-ui, sans-serif'
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(serif ? '--font-serif' : '--font-sans')
    .trim()
  return value || fallback
}

/** 量一個標籤在畫面上的寬度（px）。 */
export function measureLabelWidth(text: string, font: LabelFont): number {
  if (context === undefined) {
    context = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1).getContext('2d') : null
  }
  if (!context) return estimateLabelWidth(text, font.size)
  context.font = `${font.weight} ${font.size}px ${fontFamily(font.serif)}`
  return context.measureText(text).width
}
