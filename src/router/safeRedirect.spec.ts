import { describe, expect, it } from 'vitest'
import { safeRedirect } from './safeRedirect'

describe('safeRedirect', () => {
  it('它應該接受站內路徑', () => {
    expect(safeRedirect('/articles/manage', '/admin')).toBe('/articles/manage')
  })

  it('它應該在沒有值時回到預設頁', () => {
    expect(safeRedirect(undefined, '/admin')).toBe('/admin')
    expect(safeRedirect(null, '/admin')).toBe('/admin')
  })

  it('它應該在空字串時回到預設頁', () => {
    expect(safeRedirect('', '/admin')).toBe('/admin')
  })

  it('它應該拒絕雙斜線開頭的網址', () => {
    expect(safeRedirect('//example.com', '/admin')).toBe('/admin')
  })

  it('它應該拒絕斜線加反斜線開頭的網址', () => {
    expect(safeRedirect('/\\example.com', '/admin')).toBe('/admin')
  })

  it('它應該拒絕完整的外部網址', () => {
    expect(safeRedirect('https://example.com', '/admin')).toBe('/admin')
  })

  it('它應該在參數重複出現成陣列時回到預設頁', () => {
    expect(safeRedirect(['/articles', '/admin'], '/admin')).toBe('/admin')
  })
})
