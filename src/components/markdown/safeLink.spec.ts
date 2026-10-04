import { describe, it, expect } from 'vitest'
import { safeLink } from './safeLink'

describe('safeLink：Markdown 連結網址白名單', () => {
  it.each([
    ['https://example.com/a?b=1#c', 'https://example.com/a?b=1#c'],
    ['http://example.com', 'http://example.com/'],
    ['HTTPS://Example.com/x', 'https://example.com/x'],
    ['mailto:someone@example.com', 'mailto:someone@example.com'],
    ['  https://example.com  ', 'https://example.com/'],
  ])('放行站外 http／https／mailto：%s', (raw, href) => {
    expect(safeLink(raw)).toEqual({ href, internal: false })
  })

  it.each([
    ['/projects/7', '/projects/7'],
    ['/articles/x#sec', '/articles/x#sec'],
    ['#section-2', '#section-2'],
  ])('站內路徑與錨點走 RouterLink：%s', (raw, href) => {
    expect(safeLink(raw)).toEqual({ href, internal: true })
  })

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    '\u0001javascript:alert(1)',
    '\u0000javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'java\rscript:alert(1)',
    '\tjavascript\t:alert(1)',
    'javascript:alert(1)\u0000',
    'data:text/html,<script>alert(1)</script>',
    'DATA:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox(1)',
    'VBScript:msgbox(1)',
    'file:///etc/passwd',
    'blob:https://example.com/uuid',
    'ftp://example.com',
    'foo:bar',
    '',
    '   ',
    null,
    undefined,
  ])('其他協定、混淆變形、空值一律拒絕：%j', (raw) => {
    expect(safeLink(raw)).toBeNull()
  })

  it('`//host`、`/\\host`、`\\\\host` 不算站內，正規化成完整的 https 網址', () => {
    expect(safeLink('//evil.example/x')).toEqual({ href: 'https://evil.example/x', internal: false })
    expect(safeLink('/\\evil.example/x')).toEqual({ href: 'https://evil.example/x', internal: false })
    expect(safeLink('\\\\evil.example')).toEqual({ href: 'https://evil.example/', internal: false })
    expect(safeLink('/\t/evil.example')).toEqual({ href: 'https://evil.example/', internal: false })
  })

  it('沒有協定的相對網址照舊放行（協定一定跟頁面相同）', () => {
    expect(safeLink('notes/readme')).toEqual({ href: 'notes/readme', internal: false })
    expect(safeLink('./a')).toEqual({ href: './a', internal: false })
  })
})
