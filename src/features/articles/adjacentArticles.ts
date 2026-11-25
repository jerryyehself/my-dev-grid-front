// 文章內頁的上一篇／下一篇。
//
// 順序依據：publishedList 要傳「已發布、依 displayDate（creation_date，沒有才用 created_at）
// 由新到舊」排好的清單，也就是文章列表（ArticlesView）用的同一個 sortArticlesByDateDesc 的結果，
// 不在這裡另外排序。
// 方向照時間：上一篇 = 日期較早的那篇，下一篇 = 日期較晚的那篇。列表由新到舊，所以清單裡
// 「下面一筆」是上一篇、「上面一筆」是下一篇；最舊的一篇沒有上一篇，最新的一篇沒有下一篇。
import type { ArticleDto } from '@/api/articles'

export function adjacentArticles(
  newestFirst: ArticleDto[],
  currentId: number | null | undefined,
): { previous: ArticleDto | null; next: ArticleDto | null } {
  const index = currentId == null ? -1 : newestFirst.findIndex((item) => item.id === currentId)
  if (index === -1) return { previous: null, next: null }
  return {
    previous: newestFirst[index + 1] ?? null,
    next: (index > 0 ? newestFirst[index - 1] : null) ?? null,
  }
}
