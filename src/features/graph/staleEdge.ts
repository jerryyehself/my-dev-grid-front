import { withAlpha } from './colorScale'

// 後端標記為過期（stale）的連線在圖上淡化顯示（2D 首頁與 /graph 共用畫布、3D 都用這裡的規則）。
// 規則是「相乘」：過期邊先照一般連線的狀態決定顏色與透明度，再把透明度乘上 STALE_ALPHA_FACTOR，
// 線寬固定細一點（STALE_LINK_WIDTH），所以不管在哪個狀態，過期邊都比同狀態的一般連線淡。
// 一律實線（虛線在全站只代表間接關聯）；顏色仍取 --edge-real／--text-accent 這兩個 token，
// 沒有新增色票，STALE_ALPHA_FACTOR 是程式常數，不是 CSS token。
//
// | 狀態                          | 顏色          | 透明度     | 線寬 |
// | 一般直接連線                  | --edge-real   | 1          | 1.5  |
// | 過期                          | --edge-real   | 0.4        | 1    |
// | 路徑／選取中，其餘連線        | --edge-real   | 0.18       | 1.5  |
// | 路徑／選取中，其餘的過期連線  | --edge-real   | 0.18 × 0.4 | 1    |
// | 碰到選取點的過期連線          | --text-accent | 0.55 × 0.4 | 1    |
// | 碰到選取點／路徑上的連線      | --text-accent | 1          | 2.2  |
// （路徑上的連線後端不會標過期；線寬維持現有的 2.2。3D 的一般線寬是 1，其餘比照同一套相乘規則）
export const STALE_ALPHA_FACTOR = 0.4
// 過期邊被 hover／選取到時 accent 的基準透明度（再乘 STALE_ALPHA_FACTOR）；一般連線碰到選取點是 1
export const STALE_FOCUS_BASE_ALPHA = 0.55
// 過期邊的線寬（2D、3D 都一樣）
export const STALE_LINK_WIDTH = 1

// 2D 畫布一般直接連線的基準值
const LINK_WIDTH = 1.5
const LINK_FOCUS_WIDTH = 2.2
// 有選取時，沒碰到選取點（或被顯示層篩掉）的連線
const LINK_DIM_ALPHA = 0.18
// 沒有選取時，被顯示層篩掉的連線
const LINK_FILTER_DIM_ALPHA = 0.22

// 舊版 API 與示範資料快照沒有 stale 欄位：只有明確是 true 才算過期
export function isStaleLink(l: { stale?: boolean }): boolean {
  return l.stale === true
}

// 相乘後的透明度會有浮點誤差（0.55 * 0.4 = 0.22000000000000003），四捨五入到小數 4 位
function roundAlpha(alpha: number): number {
  return Math.round(alpha * 10000) / 10000
}

// 2D 畫布「直接關係」連線（非推導邊）的顏色與線寬，一般連線與過期連線共用同一份判斷：
// - 有 hover／路徑選取：碰到選取點且沒被顯示層篩掉 → accent、線寬 2.2；其餘淡成 0.18、線寬 1.5
// - 沒有選取：預設 --edge-real 不透明；被顯示層篩掉的淡成 0.22
// - 過期邊：同樣的狀態，透明度乘 STALE_ALPHA_FACTOR、線寬 STALE_LINK_WIDTH；
//   碰到選取點的過期邊 accent 不是不透明，而是 STALE_FOCUS_BASE_ALPHA 再乘 STALE_ALPHA_FACTOR
export function directLinkStyle(opts: {
  edgeReal: string
  accent: string
  stale: boolean
  hasFocus: boolean
  touchesFocus: boolean
  filterDimmed: boolean
}): { color: string; width: number } {
  const factor = opts.stale ? STALE_ALPHA_FACTOR : 1
  const width = opts.stale ? STALE_LINK_WIDTH : LINK_WIDTH
  if (opts.hasFocus) {
    if (opts.touchesFocus && !opts.filterDimmed) {
      return opts.stale
        ? { color: withAlpha(opts.accent, roundAlpha(STALE_FOCUS_BASE_ALPHA * factor)), width }
        : { color: opts.accent, width: LINK_FOCUS_WIDTH }
    }
    return { color: withAlpha(opts.edgeReal, roundAlpha(LINK_DIM_ALPHA * factor)), width }
  }
  if (opts.filterDimmed) {
    return { color: withAlpha(opts.edgeReal, roundAlpha(LINK_FILTER_DIM_ALPHA * factor)), width }
  }
  return { color: opts.stale ? withAlpha(opts.edgeReal, factor) : opts.edgeReal, width }
}
