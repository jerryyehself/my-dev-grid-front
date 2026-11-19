import { withAlpha } from './colorScale'

// 2D 畫布「直接關係」連線（非推導邊）的顏色與線寬。一律實線（虛線在全站只代表間接關聯），
// 顏色取 --edge-real／--text-accent 這兩個 token。
//
// | 狀態                          | 顏色          | 透明度 | 線寬 |
// | 一般直接連線                  | --edge-real   | 1      | 1.5  |
// | 路徑／選取中，其餘連線        | --edge-real   | 0.18   | 1.5  |
// | 沒有選取，被顯示層篩掉的連線  | --edge-real   | 0.22   | 1.5  |
// | 碰到選取點／路徑上的連線      | --text-accent | 1      | 2.2  |

// 一般直接連線的基準值
const LINK_WIDTH = 1.5
const LINK_FOCUS_WIDTH = 2.2
// 有選取時，沒碰到選取點（或被顯示層篩掉）的連線
const LINK_DIM_ALPHA = 0.18
// 沒有選取時，被顯示層篩掉的連線
const LINK_FILTER_DIM_ALPHA = 0.22

// - 有 hover／路徑選取：碰到選取點且沒被顯示層篩掉 → accent、線寬 2.2；其餘淡成 0.18、線寬 1.5
// - 沒有選取：預設 --edge-real 不透明；被顯示層篩掉的淡成 0.22
export function directLinkStyle(opts: {
  edgeReal: string
  accent: string
  hasFocus: boolean
  touchesFocus: boolean
  filterDimmed: boolean
}): { color: string; width: number } {
  if (opts.hasFocus) {
    if (opts.touchesFocus && !opts.filterDimmed) {
      return { color: opts.accent, width: LINK_FOCUS_WIDTH }
    }
    return { color: withAlpha(opts.edgeReal, LINK_DIM_ALPHA), width: LINK_WIDTH }
  }
  if (opts.filterDimmed) {
    return { color: withAlpha(opts.edgeReal, LINK_FILTER_DIM_ALPHA), width: LINK_WIDTH }
  }
  return { color: opts.edgeReal, width: LINK_WIDTH }
}

// 「專案 → 技術」的「關於」連線：專案在講某個技術、但程式裡沒有使用證據。線本身跟「使用」
// 完全一樣（同色實線，顏色、線寬、三種狀態都沿用 directLinkStyle），只在線的中點多畫一個
// 空心小圈當記號，不佔用虛線（虛線在全站只代表間接關聯）。
// 後端述詞：subjectOfProject（技術 → 專案，GitHub 同步寫的方向）與反向的 projectAbout。
// 3D 版（GraphPoc3D.vue）畫不了線中點的圈，這次不區分「關於」與「使用」。
export const ABOUT_PREDICATES: readonly string[] = ['subjectOfProject', 'projectAbout']

export function isAboutLink(predicate: string | null | undefined): boolean {
  return predicate != null && ABOUT_PREDICATES.includes(predicate)
}

const ABOUT_MARKER_RADIUS = 3
const ABOUT_MARKER_LINE_WIDTH = 1.5

// 中點圈：描邊顏色直接用該條線的顏色（hover／選取時跟著變 accent，淡出時跟著淡出），
// 填色是畫布底色，把圈裡面的線蓋掉才是空心。
export function aboutMarkerStyle(opts: { lineColor: string; canvasBg: string }): {
  radius: number
  lineWidth: number
  stroke: string
  fill: string
} {
  return {
    radius: ABOUT_MARKER_RADIUS,
    lineWidth: ABOUT_MARKER_LINE_WIDTH,
    stroke: opts.lineColor,
    fill: opts.canvasBg,
  }
}
