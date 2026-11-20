import { describe, it, expect } from 'vitest'
import type { ArticleDto } from '@/api/articles'
import type { Project } from '@/api/projects'
import { latestEntries } from './homeNewEntries'

const article = (id: number, title: string, date: string | null, status: number | null = 1): ArticleDto => ({
  id,
  type: 30,
  title,
  body: null,
  status,
  creation_date: date,
  created_at: null,
  updated_at: null,
  scope: null,
  techniques: [],
  implementations: [],
})
const project = (id: string, title: string, createdDate: string, started = ''): Project => ({
  id,
  title,
  desc: '',
  tags: [],
  started,
  createdDate,
  repo: title,
})

describe('latestEntries：首頁「最新收錄」', () => {
  it('它應該把文章與實作依日期混排，取最新的 3 筆', () => {
    const out = latestEntries(
      [article(1, 'A', '2026-11-05'), article(2, 'B', '2026-09-25')],
      [project('7', 'p-new', '2026-10-04'), project('8', 'p-old', '2026-01-01')],
    )

    expect(out.map((e) => e.title)).toEqual(['A', 'p-new', 'B'])
    expect(out.map((e) => e.kind)).toEqual(['article', 'project', 'article'])
  })

  it('它應該略過未發布的文章', () => {
    const out = latestEntries([article(1, 'draft', '2026-11-05', 0), article(2, 'live', '2026-01-01', 1)], [])

    expect(out.map((e) => e.title)).toEqual(['live'])
  })

  it('它應該在專案沒有 createdDate（舊快照）時用 started 的當月 1 日排序，沒有任何日期的排最後', () => {
    const out = latestEntries(
      [],
      [project('1', 'none', '', ''), project('2', 'old-snapshot', '', '2026.10'), project('3', 'dated', '2026-09-01')],
    )

    expect(out.map((e) => e.title)).toEqual(['old-snapshot', 'dated', 'none'])
  })

  it('它應該在沒有任何資料時回空陣列（整列不顯示）', () => {
    expect(latestEntries([], [])).toEqual([])
  })
})
