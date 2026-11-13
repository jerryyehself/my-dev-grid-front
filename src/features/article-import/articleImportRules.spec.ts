import { describe, expect, it } from 'vitest'
import {
  ApiHttpError,
  ApiRequestError,
  ApiValidationError,
  AuthSessionChangedError,
} from '@/api/client'
import type { SourceStatus } from './articleImportApi'
import {
  REASON_TEXT,
  STATUS_LABEL,
  allowedActions,
  buildImportRequest,
  defaultChoice,
  describeImportError,
  describeProblem,
  linkableArticleIds,
  overwritesPublished,
  rowId,
  selectionProblems,
  type RowChoice,
} from './articleImportRules'
import {
  ALL_ITEMS,
  CHANGED_ITEM,
  COMMIT,
  CONFLICT_ITEM,
  INVALID_ITEM,
  MATCH_ITEM,
  NEW_ITEM,
  REMOVED_ITEM,
  UNCHANGED_ITEM,
  WARNING_ITEM,
  listingOf,
} from './articleImportFixtures'

// 後端 ArticleSourceService 的八種狀態，逐一列出，不靠「我想到的幾種」
const STATUSES: SourceStatus[] = [
  'new',
  'changed',
  'unchanged',
  'removed',
  'site_deleted',
  'conflict',
  'possible_match',
  'invalid',
]

const choice = (over: Partial<RowChoice>): RowChoice => ({
  action: 'none',
  documentationId: null,
  overwrite: false,
  ...over,
})

describe('allowedActions', () => {
  it.each([
    ['new', ['create', 'link']],
    ['possible_match', ['create', 'link']],
    ['changed', ['update']],
    ['conflict', ['update']],
    ['unchanged', []],
    ['removed', []],
    ['site_deleted', []],
    ['invalid', []],
  ] as [SourceStatus, string[]][])('它應該讓 %s 只能選 %j', (status, expected) => {
    expect(allowedActions(status)).toEqual(expected)
  })

  it('它應該對每一種狀態都有中文標籤', () => {
    for (const status of STATUSES) expect(STATUS_LABEL[status]).toMatch(/\S/)
  })
})

describe('defaultChoice', () => {
  it('它應該預設不處理，並替 possible_match 預先選好標題相同的文章', () => {
    expect(defaultChoice(NEW_ITEM)).toEqual({ action: 'none', documentationId: null, overwrite: false })
    expect(defaultChoice(MATCH_ITEM)).toEqual({ action: 'none', documentationId: 21, overwrite: false })
    expect(defaultChoice(CHANGED_ITEM).documentationId).toBeNull()
  })
})

describe('buildImportRequest', () => {
  const listing = listingOf(ALL_ITEMS)

  it('它應該只帶有選動作的列，欄位照各動作的需要', () => {
    const request = buildImportRequest(listing, {
      [rowId(NEW_ITEM)]: choice({ action: 'create' }),
      [rowId(CHANGED_ITEM)]: choice({ action: 'update' }),
      [rowId(MATCH_ITEM)]: choice({ action: 'link', documentationId: 21 }),
      [rowId(CONFLICT_ITEM)]: choice({ action: 'update', overwrite: true }),
    })

    expect(request).toEqual({
      commit_sha: COMMIT,
      items: [
        { key: 'new-note', expected_blob_sha: NEW_ITEM.blob_sha, action: 'create' },
        { key: 'changed-note', expected_blob_sha: CHANGED_ITEM.blob_sha, action: 'update' },
        { key: 'conflict-note', expected_blob_sha: CONFLICT_ITEM.blob_sha, action: 'update', overwrite_site_edits: true },
        { key: 'match-note', expected_blob_sha: MATCH_ITEM.blob_sha, action: 'link', documentation_id: 21 },
      ],
    })
  })

  it('它應該不替 changed 的更新帶 overwrite_site_edits，也不替 create 帶 documentation_id', () => {
    const request = buildImportRequest(listing, {
      [rowId(CHANGED_ITEM)]: choice({ action: 'update', overwrite: true }),
      [rowId(NEW_ITEM)]: choice({ action: 'create', documentationId: 99 }),
    })
    for (const item of request.items) {
      expect(item).not.toHaveProperty('overwrite_site_edits')
      expect(item).not.toHaveProperty('documentation_id')
    }
  })

  it('它應該丟掉狀態不允許的動作與沒有 key 或 blob 的列（失敗時往關閉的方向）', () => {
    const request = buildImportRequest(listing, {
      [rowId(UNCHANGED_ITEM)]: choice({ action: 'update' }),
      [rowId(NEW_ITEM)]: choice({ action: 'update' }),
      [rowId(INVALID_ITEM)]: choice({ action: 'create' }),
      [rowId(REMOVED_ITEM)]: choice({ action: 'update' }),
    })
    expect(request.items).toEqual([])
  })
})

describe('selectionProblems', () => {
  const listing = listingOf(ALL_ITEMS)

  it('它應該在沒有問題的選擇上回傳空陣列', () => {
    expect(
      selectionProblems(listing, {
        [rowId(NEW_ITEM)]: choice({ action: 'create' }),
        [rowId(CONFLICT_ITEM)]: choice({ action: 'update', overwrite: true }),
      }),
    ).toEqual([])
  })

  it('它應該擋下沒確認覆蓋的 conflict 更新', () => {
    const problems = selectionProblems(listing, {
      [rowId(CONFLICT_ITEM)]: choice({ action: 'update', overwrite: false }),
    })
    expect(problems).toEqual([{ kind: 'overwrite_unconfirmed', path: CONFLICT_ITEM.path }])
  })

  it('它應該擋下沒選目標的連結', () => {
    const problems = selectionProblems(listing, { [rowId(NEW_ITEM)]: choice({ action: 'link' }) })
    expect(problems).toEqual([{ kind: 'missing_target', path: NEW_ITEM.path }])
  })

  it('它應該擋下兩列連到同一篇文章', () => {
    const problems = selectionProblems(listing, {
      [rowId(NEW_ITEM)]: choice({ action: 'link', documentationId: 5 }),
      [rowId(WARNING_ITEM)]: choice({ action: 'link', documentationId: 5 }),
    })
    expect(problems).toEqual([{ kind: 'duplicate_target', documentationId: 5 }])
  })

  it('它應該擋下超過 50 篇', () => {
    const many = [...Array(51).keys()].map((i) => ({
      ...NEW_ITEM,
      key: `n-${i}`,
      path: `notes/n-${i}.md`,
    }))
    const big = listingOf(many)
    const choices = Object.fromEntries(many.map((m) => [rowId(m), choice({ action: 'create' })]))
    expect(selectionProblems(big, choices)).toEqual([{ kind: 'too_many', max: 50 }])
  })

  it('它應該不理會沒選動作的列', () => {
    expect(selectionProblems(listing, { [rowId(CONFLICT_ITEM)]: choice({ action: 'none' }) })).toEqual([])
  })

  it('它應該把每種問題說成中文', () => {
    const titleOf = (path: string) => `T:${path}`
    expect(describeProblem({ kind: 'too_many', max: 50 }, titleOf)).toContain('50')
    expect(describeProblem({ kind: 'missing_target', path: 'p' }, titleOf)).toContain('T:p')
    expect(describeProblem({ kind: 'duplicate_target', documentationId: 5 }, titleOf)).toContain('#5')
    expect(describeProblem({ kind: 'overwrite_unconfirmed', path: 'p' }, titleOf)).toContain('覆蓋')
  })
})

describe('overwritesPublished', () => {
  it('它應該只在更新已發布的文章時提醒', () => {
    expect(overwritesPublished(CHANGED_ITEM, choice({ action: 'update' }))).toBe(true)
    expect(overwritesPublished(CONFLICT_ITEM, choice({ action: 'update' }))).toBe(false) // 草稿
    expect(overwritesPublished(CHANGED_ITEM, choice({ action: 'none' }))).toBe(false)
  })
})

describe('linkableArticleIds', () => {
  it('它應該排除已連到還在的來源檔案的文章，保留 removed 與 possible_match 的對應文章', () => {
    const listing = listingOf(ALL_ITEMS)
    // 12/13/14 連著還在的檔案、16 是 site_deleted 的列；15（removed）與 21（possible_match）可以連
    expect(linkableArticleIds(listing, [11, 12, 13, 14, 15, 16, 21])).toEqual([11, 15, 21])
  })
})

describe('describeImportError', () => {
  const backendReasons: [string, number][] = [
    ['not_configured', 503],
    ['misconfigured', 503],
    ['post_scope_missing', 503],
    ['github_rate_limited', 503],
    ['github_unauthorized', 502],
    ['github_forbidden', 502],
    ['github_not_found', 502],
    ['github_unreachable', 502],
    ['github_error', 502],
    ['github_bad_response', 502],
    ['github_tree_truncated', 502],
  ]

  it.each(backendReasons)('它應該把 %s（HTTP %i）對成中文說明', (reason, status) => {
    const error = describeImportError(new ApiHttpError(status, '/article-sources', 'GET', { reason }))
    expect(error.kind).toBe('unavailable')
    expect(error.message).toBe(REASON_TEXT[reason])
    expect(error.message).not.toContain(reason)
  })

  it('它應該對沒看過的 reason 退回帶狀態碼的說明，不顯示代號', () => {
    const error = describeImportError(new ApiRequestError(503, '/x', 'POST', { reason: 'brand_new' }))
    expect(error).toEqual({ kind: 'unavailable', message: '來源暫時無法使用（HTTP 503）。' })
  })

  it('它應該對沒有回應內容的 502 一樣退回通用說明', () => {
    expect(describeImportError(new ApiHttpError(502, '/article-sources')).message).toBe(
      '來源暫時無法使用（HTTP 502）。',
    )
  })

  it.each(['stale', 'conflict'])('它應該把 409 %s 說成整批沒寫入並要求重新整理', (reason) => {
    const error = describeImportError(new ApiRequestError(409, '/x', 'POST', { reason }))
    expect(error.kind).toBe('stale')
    expect(error.message).toContain('沒有任何文章被寫入')
    expect(error.message).toContain('重新整理清單')
  })

  it('它應該把 409 的 errors 攤平、去掉重複，接在 reason 說明後面', () => {
    const error = describeImportError(
      new ApiRequestError(409, '/x', 'POST', {
        reason: 'stale',
        errors: { a: ['甲。', '乙。'], b: ['甲。'], c: '丙' },
      }),
    )
    expect(error.message).toBe(
      `${REASON_TEXT.stale}甲。乙。丙。沒有任何文章被寫入。請重新整理清單，再選一次。`,
    )
  })

  it.each([
    { label: '沒有 errors', errors: undefined },
    { label: 'errors 是空物件', errors: {} },
    { label: 'errors 的值是空陣列', errors: { a: [] } },
    { label: 'errors 的值不是字串', errors: { a: [1, null] } },
  ])('它應該在 409 $label 時只顯示原本的說明', ({ errors }) => {
    const error = describeImportError(new ApiRequestError(409, '/x', 'POST', { errors } as never))
    expect(error.message).toBe('沒有任何文章被寫入。請重新整理清單，再選一次。')
  })

  it('它應該把沒有 reason 的 409 也當成要重新整理', () => {
    expect(describeImportError(new ApiRequestError(409, '/x', 'POST')).kind).toBe('stale')
  })

  it('它應該把 422 的欄位訊息串起來', () => {
    const error = describeImportError(
      new ApiValidationError({ 'items.0.documentation_id': '要連結的文章不存在或已刪除。' }),
    )
    expect(error).toEqual({
      kind: 'validation',
      message: '要連結的文章不存在或已刪除。沒有任何文章被寫入。',
    })
    const empty = describeImportError(new ApiValidationError({}))
    expect(empty.kind).toBe('validation')
    expect(empty.message).toContain('沒有任何文章被寫入')
  })

  it('它應該處理 403、登入狀態改變、網路失敗與未知錯誤', () => {
    expect(describeImportError(new ApiHttpError(403, '/x')).message).toContain('權限')
    expect(describeImportError(new ApiRequestError(500, '/x', 'POST')).message).toContain('HTTP 500')
    expect(describeImportError(new AuthSessionChangedError()).message).toBe(new AuthSessionChangedError().message)
    expect(describeImportError(new TypeError('Failed to fetch'))).toEqual({
      kind: 'network',
      message: '連不上後端 API，請稍後再試。',
    })
    expect(describeImportError('boom').kind).toBe('other')
  })
})
