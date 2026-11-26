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

  // 瀏覽器解析網址時會丟掉 tab、換行與開頭的空白，反斜線也當成斜線，這些寫法解析後都會變成別的網域。
  it.each([
    '/\n/evil.com',
    '/\r/evil.com',
    '/\t/evil.com',
    ' //evil.com',
    '\\\\evil.com',
    '\\\\/evil.com',
    '\\/evil.com',
    '/\\\\evil.com',
    '/\\/evil.com',
  ])('它應該拒絕解析後會離開本站的值 %j', (value) => {
    expect(safeRedirect(value, '/admin')).toBe('/admin')
  })

  // 控制字元不論解析後在不在本站都拒絕，檢查的字串才會跟瀏覽器解析的一樣。
  it.each([
    '/\tevil.com',
    '/articles\n',
    '/articles\u0000',
    '/articles\u001F',
    '/articles\u007F',
  ])('它應該拒絕含控制字元的值 %j', (value) => {
    expect(safeRedirect(value, '/admin')).toBe('/admin')
  })

  // 編碼過的斜線、中間的空白不會被瀏覽器還原成網域分隔，解析後仍在本站，原樣保留。
  it.each([
    '/%2F%2Fevil.com',
    '/%5C%5Cevil.com',
    '/ /evil.com',
    '/articles?tab=1#top',
  ])('它應該保留解析後仍在本站的路徑 %j', (value) => {
    expect(safeRedirect(value, '/admin')).toBe(value)
  })
})
