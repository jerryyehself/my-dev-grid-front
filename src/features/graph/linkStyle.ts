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
// 後端述詞：圖譜 API 只回 subjectOfProject（技術 → 專案，GitHub 同步寫的方向）；
// projectAbout 是預防反向命名而加的，目前 API 不會回。
// 3D 版（GraphPoc3D.vue）畫不了線中點的圈，這次不區分「關於」與「使用」。
export const ABOUT_PREDICATES: readonly string[] = ['subjectOfProject', 'projectAbout']

export function isAboutLink(predicate: string | null | undefined): boolean {
  return predicate != null && ABOUT_PREDICATES.includes(predicate)
}

const ABOUT_MARKER_RADIUS = 3

// 中點圈：描邊的顏色與寬度直接用該條線的（hover／選取時跟著變 accent 與 2.2，淡出時跟著淡出），
// 填色是畫布底色，把圈裡面的線蓋掉才是空心。
export function aboutMarkerStyle(opts: {
  line: { color: string; width: number }
  canvasBg: string
}): {
  radius: number
  lineWidth: number
  stroke: string
  fill: string
} {
  return {
    radius: ABOUT_MARKER_RADIUS,
    lineWidth: opts.line.width,
    stroke: opts.line.color,
    fill: opts.canvasBg,
  }
}

// force-graph 的 linkCanvasObjectMode：只有直接關係裡的「關於」連線在線之後多畫一個圈，其餘不畫。
export function aboutLinkCanvasMode(l: {
  derived?: boolean
  predicate?: string | null
}): 'after' | undefined {
  return !l.derived && isAboutLink(l.predicate) ? 'after' : undefined
}

type MarkerEnd = { x?: number; y?: number } | string | number | undefined

// 在線的中點畫空心圈。端點還沒被力導向模擬換成節點物件（仍是 id）時不畫。
export function drawAboutMarker(
  ctx: CanvasRenderingContext2D,
  link: { source?: MarkerEnd; target?: MarkerEnd },
  style: ReturnType<typeof aboutMarkerStyle>,
): void {
  const { source: s, target: t } = link
  if (typeof s !== 'object' || typeof t !== 'object') return
  ctx.beginPath()
  ctx.arc(
    ((s.x ?? 0) + (t.x ?? 0)) / 2,
    ((s.y ?? 0) + (t.y ?? 0)) / 2,
    style.radius,
    0,
    2 * Math.PI,
  )
  ctx.fillStyle = style.fill
  ctx.fill()
  ctx.lineWidth = style.lineWidth
  ctx.strokeStyle = style.stroke
  ctx.stroke()
}
