// 鏡頭框景（D-87 修正「真實資料下首頁圖譜縮成中間一小團」）。
//
// 舊做法：force-graph 內建 zoomToFit() 只框節點圓本身，看不到畫在節點下方的文字，所以
// 另外把 padding 設成「最長標籤寬度的一半」。真實資料裡有 38 個字的文章標題（「my-dev-grid-front
// 部署到 Cloudflare 的完整流程」），一半就是 ~120px，四邊都留這麼多，975×458 的畫布只剩
// 735×218 給節點用，整張圖縮成中間一小團、標籤疊在一起。
//
// 新做法：直接算「畫在螢幕上的範圍」——節點圓會跟著縮放，但標籤是固定螢幕字級（畫的時候除以
// globalScale），所以兩者對縮放倍率 k 的反應不同：節點範圍 = k × 世界座標，標籤範圍 = 固定像素。
// 對每個 k 算出整張圖在螢幕上的寬高，二分搜尋找出塞得進畫布的最大 k。寬高對 k 單調遞增，
// 二分搜尋一定收斂。標籤寬度由呼叫端先截斷過（見 labels.ts），不會被單一長標題撐開。

export interface FitItem {
  x: number
  y: number
  /** 節點半徑（世界座標，會跟著縮放） */
  r: number
  /** 標籤寬度（螢幕像素，不跟著縮放）；0 表示不畫標籤 */
  labelW: number
  /** 標籤高度＋與節點間距（螢幕像素） */
  labelH: number
}

export interface FitResult {
  k: number
  /** 畫面中心要對準的世界座標 */
  cx: number
  cy: number
}

interface Extent {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export function screenExtent(items: FitItem[], k: number): Extent {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const it of items) {
    const halfW = Math.max(k * it.r, it.labelW / 2)
    minX = Math.min(minX, k * it.x - halfW)
    maxX = Math.max(maxX, k * it.x + halfW)
    minY = Math.min(minY, k * (it.y - it.r))
    maxY = Math.max(maxY, k * (it.y + it.r) + (it.labelW > 0 ? it.labelH : 0))
  }
  return { minX, maxX, minY, maxY }
}

export function fitTransform(
  items: FitItem[],
  viewW: number,
  viewH: number,
  pad: number,
  maxK = 3,
): FitResult | null {
  if (!items.length || viewW <= 0 || viewH <= 0) return null
  const availW = Math.max(1, viewW - pad * 2)
  const availH = Math.max(1, viewH - pad * 2)
  const fits = (k: number) => {
    const e = screenExtent(items, k)
    return e.maxX - e.minX <= availW && e.maxY - e.minY <= availH
  }
  let lo = 1e-3
  let hi = maxK
  if (fits(hi)) lo = hi
  else {
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (fits(mid)) lo = mid
      else hi = mid
    }
  }
  const k = lo
  const e = screenExtent(items, k)
  return { k, cx: (e.minX + e.maxX) / 2 / k, cy: (e.minY + e.maxY) / 2 / k }
}
