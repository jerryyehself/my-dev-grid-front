import { describe, expect, it } from 'vitest'
import { STALE_EDGE_ALPHA, STALE_EDGE_FOCUS_ALPHA, isStaleLink, staleLinkColor } from './staleEdge'

const base = { edgeReal: '#6d7686', accent: '#922e39', hasFocus: false, touchesFocus: false, filterDimmed: false }

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

describe('staleLinkColor', () => {
  it('它應該在沒有選取時用 --edge-real 加 STALE_EDGE_ALPHA 淡化', () => {
    expect(staleLinkColor(base)).toBe(`rgba(109,118,134,${STALE_EDGE_ALPHA})`)
  })

  it('它應該讓被顯示層篩掉的過期邊比一般過期邊更淡', () => {
    expect(staleLinkColor({ ...base, filterDimmed: true })).toBe('rgba(109,118,134,0.22)')
  })

  it('它應該讓碰到選取點的過期邊提亮成 accent 但透明度減半', () => {
    expect(staleLinkColor({ ...base, hasFocus: true, touchesFocus: true })).toBe(
      `rgba(146,46,57,${STALE_EDGE_FOCUS_ALPHA})`,
    )
  })

  it('它應該讓沒碰到選取點、或碰到但被篩掉的過期邊跟一般連線一樣淡成 0.18', () => {
    expect(staleLinkColor({ ...base, hasFocus: true })).toBe('rgba(109,118,134,0.18)')
    expect(staleLinkColor({ ...base, hasFocus: true, touchesFocus: true, filterDimmed: true })).toBe(
      'rgba(109,118,134,0.18)',
    )
  })
})
