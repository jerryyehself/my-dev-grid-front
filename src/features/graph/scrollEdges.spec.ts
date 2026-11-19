import { describe, it, expect } from 'vitest'
import { scrollEdges } from './scrollEdges'

describe('scrollEdges', () => {
  // 容器 390、內容 700：最多可捲 310
  it.each([
    { case: '內容比容器窄', scrollLeft: 0, scrollWidth: 300, clientWidth: 390, expected: { overflowing: false, start: false, end: false } },
    { case: '內容跟容器一樣寬', scrollLeft: 0, scrollWidth: 390, clientWidth: 390, expected: { overflowing: false, start: false, end: false } },
    { case: '只多 1px（容差內，當作不會捲）', scrollLeft: 0, scrollWidth: 391, clientWidth: 390, expected: { overflowing: false, start: false, end: false } },
    { case: '多 2px（超過容差）', scrollLeft: 0, scrollWidth: 392, clientWidth: 390, expected: { overflowing: true, start: false, end: true } },
    { case: '在起點', scrollLeft: 0, scrollWidth: 700, clientWidth: 390, expected: { overflowing: true, start: false, end: true } },
    { case: '離起點 1px（容差內）', scrollLeft: 1, scrollWidth: 700, clientWidth: 390, expected: { overflowing: true, start: false, end: true } },
    { case: '離起點 2px', scrollLeft: 2, scrollWidth: 700, clientWidth: 390, expected: { overflowing: true, start: true, end: true } },
    { case: '捲到中間', scrollLeft: 150, scrollWidth: 700, clientWidth: 390, expected: { overflowing: true, start: true, end: true } },
    { case: '離終點 2px', scrollLeft: 308, scrollWidth: 700, clientWidth: 390, expected: { overflowing: true, start: true, end: true } },
    { case: '離終點不到 1px（高 DPI 的小數 scrollLeft）', scrollLeft: 309.4, scrollWidth: 700, clientWidth: 390, expected: { overflowing: true, start: true, end: false } },
    { case: '在終點', scrollLeft: 310, scrollWidth: 700, clientWidth: 390, expected: { overflowing: true, start: true, end: false } },
  ])('它應該在$case時回傳對應的兩側狀態', ({ scrollLeft, scrollWidth, clientWidth, expected }) => {
    expect(scrollEdges(scrollLeft, scrollWidth, clientWidth)).toEqual(expected)
  })

  it('它應該在容器寬度為 0（尚未排版）時當作不會捲動', () => {
    expect(scrollEdges(0, 0, 0)).toEqual({ overflowing: false, start: false, end: false })
  })
})
