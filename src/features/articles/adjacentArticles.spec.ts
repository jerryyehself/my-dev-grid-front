import { describe, expect, it } from 'vitest'
import { displayDate, sortArticlesByDateDesc, type ArticleDto } from '@/api/articles'
import { adjacentArticles } from './adjacentArticles'

function post(id: number, title: string, creationDate: string): ArticleDto {
  return {
    id,
    type: 4,
    title,
    body: null,
    status: 1,
    creation_date: `${creationDate} 00:00:00`,
    created_at: '2026-11-14 21:03:53',
    updated_at: null,
    scope: null,
    techniques: [],
    implementations: [],
  }
}

// 正式站的文章（2026-11-25 的 /api/documentations），照 API 回傳的順序（依 title，不是日期）
const API_ORDER = [
  post(16, 'Claude Code 協作開發的省 token 機制盤點', '2026-09-04'),
  post(12, 'Vue SPA 部署到 Cloudflare Workers：設定與錯誤排除紀錄', '2026-09-25'),
  post(13, '前端建置工具與部署概念問答整理', '2026-09-22'),
  post(15, '技術標誌與商標：各家官方政策整理', '2026-11-05'),
  post(17, '文章列表與內頁放哪些資訊：讀者資訊行為研究整理', '2026-11-17'),
  post(14, '首頁知識網路採用節點連結圖：設計決策紀錄', '2026-09-02'),
]

// 文章列表（ArticlesView）用的同一個排序函式
const LIST = sortArticlesByDateDesc(API_ORDER)
const idsOf = (a: ArticleDto | null) => a?.id ?? null

describe('adjacentArticles', () => {
  it('它應該讓列表的順序是日期由新到舊（依 creation_date）', () => {
    expect(LIST.map((a) => a.id)).toEqual([17, 15, 12, 13, 16, 14])
  })

  it('它應該讓 09-02 那篇沒有上一篇、下一篇是 09-04 那篇（最舊的一篇）', () => {
    const { previous, next } = adjacentArticles(LIST, 14)
    expect(idsOf(previous)).toBeNull()
    expect(idsOf(next)).toBe(16)
  })

  it('它應該讓 09-04 那篇的上一篇是 09-02、下一篇是 09-22', () => {
    const { previous, next } = adjacentArticles(LIST, 16)
    expect(idsOf(previous)).toBe(14)
    expect(idsOf(next)).toBe(13)
  })

  it('它應該讓最新的一篇沒有下一篇、上一篇是次新的那篇', () => {
    const { previous, next } = adjacentArticles(LIST, 17)
    expect(idsOf(previous)).toBe(15)
    expect(idsOf(next)).toBeNull()
  })

  it('它應該對每一篇都讓上一篇的日期不晚於本篇、下一篇的日期不早於本篇', () => {
    for (const current of LIST) {
      const { previous, next } = adjacentArticles(LIST, current.id)
      if (previous) expect(displayDate(previous) <= displayDate(current)).toBe(true)
      if (next) expect(displayDate(next) >= displayDate(current)).toBe(true)
    }
  })

  it('它應該讓從列表由上往下走（下一筆）的每一步，剛好是「上一篇」那一步', () => {
    const ids = LIST.map((a) => a.id)
    for (let i = 0; i < ids.length - 1; i++) {
      expect(idsOf(adjacentArticles(LIST, ids[i]).previous)).toBe(ids[i + 1])
      expect(idsOf(adjacentArticles(LIST, ids[i + 1]).next)).toBe(ids[i])
    }
  })

  it('它應該在文章不在清單裡（草稿、不存在、id 還沒載入）時兩邊都是空', () => {
    expect(adjacentArticles(LIST, 999)).toEqual({ previous: null, next: null })
    expect(adjacentArticles(LIST, null)).toEqual({ previous: null, next: null })
    expect(adjacentArticles(LIST, undefined)).toEqual({ previous: null, next: null })
    expect(adjacentArticles([], 14)).toEqual({ previous: null, next: null })
  })

  it('它應該在只有一篇時兩邊都是空', () => {
    expect(adjacentArticles(LIST.slice(0, 1), 17)).toEqual({ previous: null, next: null })
  })
})
