import { describe, expect, it } from 'vitest'
import { articleIdOfGraphNode, graphNodeLink } from './graphNodeLink'

describe('graphNodeLink', () => {
  it('自己寫的文章連到站內文章頁', () => {
    expect(graphNodeLink({ id: 'documentation-8', domainType: 'documentation', subtype: 'post', url: null })).toEqual({
      kind: 'internal',
      to: { name: 'article-detail', params: { id: 8 } },
      text: '閱讀這篇文章 →',
    })
  })

  it('有網址的參考資料連到外部網址', () => {
    expect(
      graphNodeLink({ id: 'documentation-1', domainType: 'documentation', subtype: 'sourcesite', url: 'https://www.php.net/docs.php' }),
    ).toEqual({ kind: 'external', href: 'https://www.php.net/docs.php', text: '前往原始網站 ↗' })
  })

  it('沒有 subtype 也沒有網址的文章（舊的示範資料）不給連結', () => {
    expect(graphNodeLink({ id: 'documentation-3', domainType: 'documentation' })).toBeNull()
  })

  it('專案用後端 id 連到專案頁', () => {
    expect(graphNodeLink({ id: 'implementation-12', domainType: 'implementation' })).toEqual({
      kind: 'internal',
      to: { path: '/projects', query: { implementation: '12' } },
      text: '看這個專案 →',
    })
  })

  it('技術沒有自己的頁面，不給連結', () => {
    expect(graphNodeLink({ id: 'technique-4', domainType: 'technique' })).toBeNull()
  })

  it('id 格式不對時不給連結', () => {
    expect(graphNodeLink({ id: 'implementation-x', domainType: 'implementation' })).toBeNull()
  })
})

describe('articleIdOfGraphNode', () => {
  it('站上自己的文章回文章 id（給登入後的「編輯這篇」用）', () => {
    expect(articleIdOfGraphNode({ id: 'documentation-8', domainType: 'documentation', subtype: 'post' })).toBe(8)
  })

  it('外部參考資料、技術、專案都不是能編的文章', () => {
    expect(
      articleIdOfGraphNode({ id: 'documentation-1', domainType: 'documentation', subtype: 'sourcesite', url: 'https://www.php.net/docs.php' }),
    ).toBeNull()
    expect(articleIdOfGraphNode({ id: 'technique-4', domainType: 'technique' })).toBeNull()
    expect(articleIdOfGraphNode({ id: 'implementation-12', domainType: 'implementation' })).toBeNull()
  })

  it('沒有 subtype 的舊示範資料、id 格式不對時都回 null', () => {
    expect(articleIdOfGraphNode({ id: 'documentation-3', domainType: 'documentation' })).toBeNull()
    expect(articleIdOfGraphNode({ id: 'documentation-x', domainType: 'documentation', subtype: 'post' })).toBeNull()
  })
})
