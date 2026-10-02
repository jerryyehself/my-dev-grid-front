import { describe, it, expect } from 'vitest'
import { documentTitle, SITE_TITLE } from './siteMeta'

describe('documentTitle', () => {
  it('一般頁面：頁面標題 — 站名', () => {
    expect(documentTitle('graph', '知識圖譜')).toBe('知識圖譜 — IN / ARCHIVE')
  })

  it('首頁：只用站名＋作者，不把「IN ARCHIVE」重複一次', () => {
    expect(documentTitle('home', 'IN ARCHIVE')).toBe(SITE_TITLE)
  })

  it('沒有頁面標題的路由（例如登入回呼）：退回站名＋作者', () => {
    expect(documentTitle('auth-callback', undefined)).toBe(SITE_TITLE)
  })
})
