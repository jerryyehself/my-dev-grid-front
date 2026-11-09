import { describe, expect, it } from 'vitest'
import { articleIdOfGraphNode, graphNodeLink } from './graphNodeLink'

describe('graphNodeLink', () => {
  it('它應該將自己寫的文章連到站內文章頁', () => {
    expect(graphNodeLink({ id: 'documentation-8', domainType: 'documentation', subtype: 'post', url: null })).toEqual({
      kind: 'internal',
      to: { name: 'article-detail', params: { id: 8 } },
      text: '閱讀這篇文章 →',
    })
  })

  it('它應該將有網址的參考資料連到外部網址', () => {
    expect(
      graphNodeLink({ id: 'documentation-1', domainType: 'documentation', subtype: 'sourcesite', url: 'https://www.php.net/docs.php' }),
    ).toEqual({ kind: 'external', href: 'https://www.php.net/docs.php', text: '前往原始網站 ↗' })
  })

  it('它應該在外部網址的協定不在白名單時不給連結', () => {
    expect(
      graphNodeLink({ id: 'documentation-2', domainType: 'documentation', subtype: 'sourcesite', url: 'javascript:alert(1)' }),
    ).toBeNull()
  })

  it('它應該在文章沒有 subtype 也沒有網址時不給連結（舊的示範資料）', () => {
    expect(graphNodeLink({ id: 'documentation-3', domainType: 'documentation' })).toBeNull()
  })

  it('它應該將專案用後端 id 連到專案頁', () => {
    expect(graphNodeLink({ id: 'implementation-12', domainType: 'implementation' })).toEqual({
      kind: 'internal',
      to: { path: '/projects', query: { implementation: '12' } },
      text: '看這個專案 →',
    })
  })

  it('它應該在技術沒有自己的頁面時不給連結', () => {
    expect(graphNodeLink({ id: 'technique-4', domainType: 'technique' })).toBeNull()
  })

  it('它應該在 id 格式不對時不給連結', () => {
    expect(graphNodeLink({ id: 'implementation-x', domainType: 'implementation' })).toBeNull()
  })
})

describe('articleIdOfGraphNode', () => {
  it('它應該在站上自己的文章回傳文章 id（給登入後的「編輯這篇」用）', () => {
    expect(articleIdOfGraphNode({ id: 'documentation-8', domainType: 'documentation', subtype: 'post' })).toBe(8)
  })

  it('它應該在外部參考資料、技術與專案不是能編的文章時回傳 null', () => {
    expect(
      articleIdOfGraphNode({ id: 'documentation-1', domainType: 'documentation', subtype: 'sourcesite', url: 'https://www.php.net/docs.php' }),
    ).toBeNull()
    expect(articleIdOfGraphNode({ id: 'technique-4', domainType: 'technique' })).toBeNull()
    expect(articleIdOfGraphNode({ id: 'implementation-12', domainType: 'implementation' })).toBeNull()
  })

  it('它應該在舊示範資料沒有 subtype 或 id 格式不對時回傳 null', () => {
    expect(articleIdOfGraphNode({ id: 'documentation-3', domainType: 'documentation' })).toBeNull()
    expect(articleIdOfGraphNode({ id: 'documentation-x', domainType: 'documentation', subtype: 'post' })).toBeNull()
  })
})
