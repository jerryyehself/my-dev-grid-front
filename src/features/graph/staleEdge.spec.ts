import { describe, expect, it } from 'vitest'
import {
  STALE_ALPHA_FACTOR,
  STALE_FOCUS_BASE_ALPHA,
  STALE_LINK_WIDTH,
  directLinkStyle,
  isStaleLink,
} from './staleEdge'

const base = {
  edgeReal: '#6d7686',
  accent: '#922e39',
  stale: false,
  hasFocus: false,
  touchesFocus: false,
  filterDimmed: false,
}
const gray = (alpha: number) => `rgba(109,118,134,${alpha})`
const red = (alpha: number) => `rgba(146,46,57,${alpha})`

describe('isStaleLink', () => {
  it('它應該只在 stale 明確是 true 時才算過期', () => {
    expect(isStaleLink({ stale: true })).toBe(true)
    expect(isStaleLink({ stale: false })).toBe(false)
  })

  it('它應該把舊版 API 沒有 stale 欄位的連線當成不過期', () => {
    expect(isStaleLink({})).toBe(false)
    expect(isStaleLink({ stale: undefined })).toBe(false)
  })
})

describe('常數', () => {
  it('它應該讓過期係數是 0.4、選取時的 accent 基準是 0.55、線寬是 1', () => {
    expect(STALE_ALPHA_FACTOR).toBe(0.4)
    expect(STALE_FOCUS_BASE_ALPHA).toBe(0.55)
    expect(STALE_LINK_WIDTH).toBe(1)
  })
})

describe('directLinkStyle', () => {
  it('它應該讓一般直接連線是不透明的 --edge-real、線寬 1.5', () => {
    expect(directLinkStyle(base)).toEqual({ color: '#6d7686', width: 1.5 })
  })

  it('它應該讓過期連線是 --edge-real 透明度 0.4、線寬 1', () => {
    expect(directLinkStyle({ ...base, stale: true })).toEqual({ color: gray(0.4), width: 1 })
  })

  it('它應該讓選取中沒碰到選取點的一般連線淡成 0.18、線寬維持 1.5', () => {
    expect(directLinkStyle({ ...base, hasFocus: true })).toEqual({ color: gray(0.18), width: 1.5 })
  })

  it('它應該讓選取中沒碰到選取點的過期連線是 0.18 乘 0.4、線寬 1', () => {
    expect(directLinkStyle({ ...base, hasFocus: true, stale: true })).toEqual({
      color: gray(0.072),
      width: 1,
    })
  })

  it('它應該讓碰到選取點的一般連線是不透明 accent、線寬 2.2', () => {
    expect(directLinkStyle({ ...base, hasFocus: true, touchesFocus: true })).toEqual({
      color: '#922e39',
      width: 2.2,
    })
  })

  it('它應該讓碰到選取點的過期連線是 accent 透明度 0.55 乘 0.4、線寬 1', () => {
    expect(directLinkStyle({ ...base, hasFocus: true, touchesFocus: true, stale: true })).toEqual({
      color: red(0.22),
      width: 1,
    })
  })

  it('它應該讓沒有選取時被顯示層篩掉的連線淡成 0.22，過期的再乘 0.4', () => {
    expect(directLinkStyle({ ...base, filterDimmed: true })).toEqual({ color: gray(0.22), width: 1.5 })
    expect(directLinkStyle({ ...base, filterDimmed: true, stale: true })).toEqual({
      color: gray(0.088),
      width: 1,
    })
  })

  it('它應該讓碰到選取點但被顯示層篩掉的連線跟沒碰到的一樣淡', () => {
    const dimmed = { ...base, hasFocus: true, touchesFocus: true, filterDimmed: true }
    expect(directLinkStyle(dimmed)).toEqual({ color: gray(0.18), width: 1.5 })
    expect(directLinkStyle({ ...dimmed, stale: true })).toEqual({ color: gray(0.072), width: 1 })
  })

  it('它應該在沒有選取時忽略 touchesFocus', () => {
    expect(directLinkStyle({ ...base, touchesFocus: true })).toEqual(directLinkStyle(base))
    expect(directLinkStyle({ ...base, touchesFocus: true, stale: true })).toEqual(
      directLinkStyle({ ...base, stale: true }),
    )
  })
})
