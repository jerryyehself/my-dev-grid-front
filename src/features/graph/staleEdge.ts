import { withAlpha } from './colorScale'

// 後端標記為過期（stale）的連線在圖上淡化顯示（2D 首頁與 /graph 共用畫布、3D 都用這裡的值）。
// 顏色仍取 --edge-real 這個 token，只調透明度；沒有新增色票。
// 0.35 比「hover／路徑選取時其餘連線」的 0.18 清楚、比正常連線（1）淡很多，
// 讓人看得出「還在，但同步已經很久沒看到」。
export const STALE_EDGE_ALPHA = 0.35
// 過期邊被 hover／路徑選到時：仍提亮成 accent，但透明度減半，保留「它是過期的」這個線索
export const STALE_EDGE_FOCUS_ALPHA = 0.55

// 舊版 API 與示範資料快照沒有 stale 欄位：只有明確是 true 才算過期
export function isStaleLink(l: { stale?: boolean }): boolean {
  return l.stale === true
}

// 2D 畫布過期邊的顏色（hex 輸入，rgba 輸出）：
// - 有 hover／路徑選取：碰到選取點且沒被顯示層篩掉 → accent 減半；其餘跟一般連線一樣淡成 0.18
// - 沒有選取：預設淡成 STALE_EDGE_ALPHA；被顯示層篩掉的再淡成 0.22（跟一般連線被篩掉時一樣）
export function staleLinkColor(opts: {
  edgeReal: string
  accent: string
  hasFocus: boolean
  touchesFocus: boolean
  filterDimmed: boolean
}): string {
  if (opts.hasFocus) {
    return opts.touchesFocus && !opts.filterDimmed
      ? withAlpha(opts.accent, STALE_EDGE_FOCUS_ALPHA)
      : withAlpha(opts.edgeReal, 0.18)
  }
  return withAlpha(opts.edgeReal, opts.filterDimmed ? 0.22 : STALE_EDGE_ALPHA)
}
