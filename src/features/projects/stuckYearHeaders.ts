export interface YearSectionMeasure {
  year: string
  /** 該組開頭的 0 高哨兵元素，頂端到視窗頂端的距離 */
  sentinelTop: number
  /** 該組底端到視窗頂端的距離 */
  bottom: number
}

/**
 * 哪些年份標頭此刻「卡在」捲動容器的上緣：哨兵已經捲出容器上緣，而且該組還沒捲完
 * （底端還在標頭下面）。卡住的標頭才畫底下那條 1px 髮絲線，沒卡住的時候不畫，
 * 否則每個標頭永遠帶著一條線，跟「列表沒有分隔線」的設計矛盾。
 *
 * 用哨兵元素量，不用 IntersectionObserver：sticky 元素本身永遠在容器內，觀察它看不出有沒有卡住。
 */
export function stuckYearHeaders(
  containerTop: number,
  headerHeight: number,
  sections: readonly YearSectionMeasure[],
): Set<string> {
  const stuck = new Set<string>()
  for (const s of sections) {
    if (s.sentinelTop < containerTop - 0.5 && s.bottom > containerTop + headerHeight) stuck.add(s.year)
  }
  return stuck
}
