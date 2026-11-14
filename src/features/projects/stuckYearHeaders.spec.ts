import { describe, it, expect } from 'vitest'
import { stuckYearHeaders } from './stuckYearHeaders'

// 容器上緣在 100，標頭高 36
const TOP = 100
const HEADER = 36

describe('stuckYearHeaders', () => {
  it('它應該在哨兵還在容器上緣下面時，不把該組標頭算作卡住', () => {
    expect(stuckYearHeaders(TOP, HEADER, [{ year: '2026', sentinelTop: 100, bottom: 500 }]).size).toBe(0)
  })

  it('它應該在哨兵捲出上緣、該組還沒捲完時，把標頭算作卡住', () => {
    expect([...stuckYearHeaders(TOP, HEADER, [{ year: '2026', sentinelTop: 60, bottom: 500 }])]).toEqual(['2026'])
  })

  it('它應該在該組底端只剩一個標頭高度時，不再算卡住（下一組的標頭要把它推走）', () => {
    // bottom 剛好等於 top + 標頭高：邊界上不算；多 1px 才算
    expect(stuckYearHeaders(TOP, HEADER, [{ year: '2026', sentinelTop: 0, bottom: TOP + HEADER }]).size).toBe(0)
    expect(stuckYearHeaders(TOP, HEADER, [{ year: '2026', sentinelTop: 0, bottom: TOP + HEADER + 1 }]).size).toBe(1)
  })

  it('它應該容忍半個像素內的捲動誤差', () => {
    expect(stuckYearHeaders(TOP, HEADER, [{ year: '2026', sentinelTop: 99.6, bottom: 500 }]).size).toBe(0)
    expect(stuckYearHeaders(TOP, HEADER, [{ year: '2026', sentinelTop: 99.4, bottom: 500 }]).size).toBe(1)
  })

  it('它應該在多組時只標出真的卡住的那一組', () => {
    const stuck = stuckYearHeaders(TOP, HEADER, [
      { year: '2026', sentinelTop: -300, bottom: 110 },
      { year: '2025', sentinelTop: 40, bottom: 600 },
      { year: '2024', sentinelTop: 600, bottom: 900 },
    ])

    expect([...stuck]).toEqual(['2025'])
  })
})
