// 匯入頁測試共用的清單資料：每種狀態各一列，欄位照後端 GET /article-sources 的回應。
// 只給 *.spec.ts 用。
import type { SourceItem, SourceListing } from './articleImportApi'

export const COMMIT = 'c'.repeat(40)

const sha = (c: string) => c.repeat(40)

export function sourceItem(overrides: Partial<SourceItem> & Pick<SourceItem, 'status'>): SourceItem {
  return {
    key: 'a-note',
    path: 'notes/a-note.md',
    blob_sha: sha('a'),
    title: '一篇筆記',
    documentation_id: null,
    published: null,
    reason: null,
    reason_message: null,
    warnings: [],
    ...overrides,
  }
}

export const NEW_ITEM = sourceItem({ status: 'new', key: 'new-note', path: 'notes/new-note.md', title: '新的筆記', blob_sha: sha('1') })
export const CHANGED_ITEM = sourceItem({
  status: 'changed',
  key: 'changed-note',
  path: 'notes/changed-note.md',
  title: '有更新的筆記',
  blob_sha: sha('2'),
  documentation_id: 12,
  published: true,
})
export const CONFLICT_ITEM = sourceItem({
  status: 'conflict',
  key: 'conflict-note',
  path: 'notes/conflict-note.md',
  title: '兩邊都改過的筆記',
  blob_sha: sha('3'),
  documentation_id: 13,
  published: false,
})
export const MATCH_ITEM = sourceItem({
  status: 'possible_match',
  key: 'match-note',
  path: 'notes/match-note.md',
  title: '標題相同的筆記',
  blob_sha: sha('4'),
  documentation_id: 21,
  published: true,
})
export const UNCHANGED_ITEM = sourceItem({
  status: 'unchanged',
  key: 'same-note',
  path: 'notes/same-note.md',
  title: '沒變的筆記',
  blob_sha: sha('5'),
  documentation_id: 14,
  published: true,
})
export const REMOVED_ITEM = sourceItem({
  status: 'removed',
  key: 'gone-note',
  path: 'notes/gone-note.md',
  title: '來源已移除的筆記',
  blob_sha: null,
  documentation_id: 15,
  published: true,
})
export const DELETED_ITEM = sourceItem({
  status: 'site_deleted',
  key: 'deleted-note',
  path: 'notes/deleted-note.md',
  title: '站上刪掉的筆記',
  blob_sha: sha('6'),
  documentation_id: 16,
  published: null,
})
export const INVALID_ITEM = sourceItem({
  status: 'invalid',
  key: null,
  path: 'notes/broken.md',
  title: null,
  blob_sha: sha('7'),
  reason: 'slug_missing',
  reason_message: 'front matter 缺少 slug。',
})
export const WARNING_ITEM = sourceItem({
  status: 'new',
  key: 'warn-note',
  path: 'notes/warn-note.md',
  title: '有警告的筆記',
  blob_sha: sha('8'),
  warnings: [{ code: 'email', message: 'email 地址', line: 7 }],
})

export const ALL_ITEMS: SourceItem[] = [
  NEW_ITEM,
  CHANGED_ITEM,
  CONFLICT_ITEM,
  MATCH_ITEM,
  UNCHANGED_ITEM,
  REMOVED_ITEM,
  DELETED_ITEM,
  INVALID_ITEM,
  WARNING_ITEM,
]

export function listingOf(items: SourceItem[]): SourceListing {
  return { repo: 'example/notes', commit_sha: COMMIT, fetched_at: '2026-11-12 09:30:00', items }
}
