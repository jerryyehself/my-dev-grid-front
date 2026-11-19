/**
 * 橫向捲動容器兩側「還有沒看到的內容」的狀態，給路徑圖的邊緣漸層用。
 *
 * 跟 Vue 無關的純計算，從元件拆出來方便測邊界。容差 1px：瀏覽器縮放或高 DPI 下
 * scrollLeft 會是小數，捲到最右邊時 scrollLeft + clientWidth 常差零點幾 px 才等於
 * scrollWidth，不留容差的話右側漸層會在已經捲到底時還亮著。
 */
export interface ScrollEdges {
  /** 內容比容器寬，可以橫向捲動 */
  overflowing: boolean
  /** 左側（起點方向）還有被捲走的內容 */
  start: boolean
  /** 右側（終點方向）還有沒捲到的內容 */
  end: boolean
}

const EDGE_TOLERANCE_PX = 1

export function scrollEdges(scrollLeft: number, scrollWidth: number, clientWidth: number): ScrollEdges {
  const maxScroll = scrollWidth - clientWidth
  if (maxScroll <= EDGE_TOLERANCE_PX) return { overflowing: false, start: false, end: false }
  return {
    overflowing: true,
    start: scrollLeft > EDGE_TOLERANCE_PX,
    end: scrollLeft < maxScroll - EDGE_TOLERANCE_PX,
  }
}
