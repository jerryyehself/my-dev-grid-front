// 畫布上的節點名稱（D-87）。
//
// 長標題截斷：真實資料有 38 個字的文章標題，畫在圖上會蓋過一整排節點。畫布上只畫前段，
// 超過寬度上限就截斷加「…」；完整名稱在滑過的提示框、點開的內容卡上都看得到。
// 上限用像素量而不是字數：中文一個字的寬度大約是英數字的兩倍，用字數切會讓英文標題太短、
// 中文標題太長。
//
// 擺放避讓：沿用 /graph 頁原本的做法（地圖慣用）——依優先序一個一個擺，跟已經擺好的名稱重疊
// 的就這一幀先不畫；放大之後名稱之間的螢幕距離變大，被略過的自然會出現。被「強制顯示」的
// （選取中節點與它的鄰居、路徑上的節點）不受重疊限制。

export const LABEL_MAX_WIDTH_PX = 132

export function truncateLabel(label: string, maxWidth: number, measure: (s: string) => number): string {
  if (measure(label) <= maxWidth) return label
  const chars = Array.from(label)
  let lo = 0
  let hi = chars.length
  // 找出「前 n 個字＋…」還塞得下的最大 n
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (measure(chars.slice(0, mid).join('').trimEnd() + '…') <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return chars.slice(0, lo).join('').trimEnd() + '…'
}

export interface LabelBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface LabelCandidate {
  id: string
  box: LabelBox
  forced: boolean
}

/** 依傳入順序擺放，回傳要畫的 id；非強制的標籤跟已擺好的重疊就略過 */
export function placeLabels(candidates: LabelCandidate[]): Set<string> {
  const placed: LabelBox[] = []
  const shown = new Set<string>()
  for (const c of candidates) {
    const b = c.box
    const overlaps = placed.some((p) => b.x0 < p.x1 && b.x1 > p.x0 && b.y0 < p.y1 && b.y1 > p.y0)
    if (overlaps && !c.forced) continue
    placed.push(b)
    shown.add(c.id)
  }
  return shown
}
