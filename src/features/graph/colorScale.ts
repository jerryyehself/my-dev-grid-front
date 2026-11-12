// 圖譜畫布用的顏色小工具（從 KnowledgeGraphPanel.vue 抽出，D-87）。

export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a)
  const pb = hexToRgb(b)
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `rgb(${r},${g},${bl})`
}

// VOSviewer 2018 起的預設色階換成了 viridis（放棄彩虹色階，見 CWTS 團隊
// "Farewell rainbow!" 一文），這裡手刻同一組色階的簡化版本（6 個色點線性插值）。
export const VIRIDIS_STOPS = [
  '#440154',
  '#414487',
  '#2a788e',
  '#22a884',
  '#7ad151',
  '#fde725',
] as const

export function viridis(t: number): string {
  t = Math.max(0, Math.min(1, t))
  const n = VIRIDIS_STOPS.length - 1
  const seg = Math.min(n - 1, Math.floor(t * n))
  const localT = t * n - seg
  // seg 由 Math.min(n-1, ...) 夾在 [0, n-1] 範圍內，seg+1 必落在陣列合法索引內，
  // 這裡的 ! 是純粹的邊界證明，不是繞過真的可能 undefined 的情況。
  return lerpColor(VIRIDIS_STOPS[seg]!, VIRIDIS_STOPS[seg + 1]!, localT)
}

// 正規化區間：2025-01-01 ~ 今天，不是拿現有實作各自的日期當極值——用固定的合理
// 時間窗，真實日期落在窗內哪個位置就是哪個位置，不是刻意把資料點推到色階兩端
// 做出「有變化」的假象。
export const OVERLAY_WINDOW_START = new Date('2025-01-01').getTime()

export function recencyScore(dateStr: string, windowEnd: number): number {
  const t = new Date(dateStr).getTime()
  return (t - OVERLAY_WINDOW_START) / (windowEnd - OVERLAY_WINDOW_START)
}
