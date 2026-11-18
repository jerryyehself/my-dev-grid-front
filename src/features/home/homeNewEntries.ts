import type { ArticleDto } from '@/api/articles'
import type { Project } from '@/api/projects'

// 首頁「最新收錄」列：文章與實作（專案）混排，依內容日期取最新的幾筆。
// 只混排文章與實作，不會出現官方文件。

export interface NewEntry {
  kind: 'article' | 'project'
  id: string
  title: string
  /** YYYY-MM-DD，只用來排序，首頁不印日期 */
  date: string
}

/** 首頁最多列幾筆 */
export const NEW_ENTRY_COUNT = 3

function articleDate(a: ArticleDto): string {
  const raw = a.creation_date ?? a.created_at
  return raw ? raw.slice(0, 10) : ''
}

// 舊快照沒有 createdDate，只有 started（YYYY.MM）：補成當月 1 日排序；兩個都沒有就排到最後
function projectDate(p: Project): string {
  if (p.createdDate) return p.createdDate
  return p.started ? `${p.started.replace('.', '-')}-01` : ''
}

/**
 * 最新的 count 筆：只取已發布的文章（status === 1，跟文章頁同一條規則）；沒有日期的排到最後；
 * 日期相同時文章在前（穩定、可預期）。
 */
export function latestEntries(
  articles: ArticleDto[],
  projects: Project[],
  count = NEW_ENTRY_COUNT,
): NewEntry[] {
  const all: NewEntry[] = [
    ...articles
      .filter((a) => a.status === 1)
      .map((a) => ({ kind: 'article' as const, id: String(a.id), title: a.title, date: articleDate(a) })),
    ...projects.map((p) => ({ kind: 'project' as const, id: p.id, title: p.title, date: projectDate(p) })),
  ]
  return all
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.date.localeCompare(a.e.date) || a.i - b.i)
    .slice(0, count)
    .map(({ e }) => e)
}
