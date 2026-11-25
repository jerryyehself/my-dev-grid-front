import { describe, expect, it } from 'vitest'
import {
  ApiHttpError,
  ApiRequestError,
  ApiValidationError,
  AuthSessionChangedError,
} from '@/api/client'
import type { ImportRequest, SourceItem, SourceStatus } from './articleImportApi'
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
  parseUnverifiedCommits,
  reconcileImport,
  rowId,
  selectedRowIds,
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
  RENAMED_NEW_ITEM,
  RENAMED_OLD_ITEM,
  SITE_VERSION,
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
  confirmUnverified: false,
  ...over,
})

describe('rowId', () => {
  it('它應該讓清單裡每一列都有不同的識別，包含改 slug 後共用同一個路徑的新舊兩列', () => {
    const items = [...ALL_ITEMS, RENAMED_NEW_ITEM, RENAMED_OLD_ITEM]
    expect(RENAMED_NEW_ITEM.path).toBe(RENAMED_OLD_ITEM.path)
    expect(new Set(items.map(rowId)).size).toBe(items.length)
  })

  it('它應該不論兩列的順序都讓新舊兩列的選擇各自獨立', () => {
    for (const items of [
      [RENAMED_NEW_ITEM, RENAMED_OLD_ITEM],
      [RENAMED_OLD_ITEM, RENAMED_NEW_ITEM],
    ]) {
      const request = buildImportRequest(listingOf(items), {
        [rowId(RENAMED_NEW_ITEM)]: choice({ action: 'link', documentationId: 21 }),
        [rowId(RENAMED_OLD_ITEM)]: choice({ action: 'none' }),
      })
      expect(request.items).toEqual([
        { key: 'renamed-new', expected_blob_sha: RENAMED_NEW_ITEM.blob_sha, action: 'link', documentation_id: 21 },
      ])
    }
  })

  it('它應該不把 key 為 null 的 invalid 列和同路徑的其他列混在一起', () => {
    const same = { ...INVALID_ITEM, key: null }
    const other = { ...INVALID_ITEM, key: 'x' }
    expect(rowId(same)).not.toBe(rowId(other))
  })
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
    expect(defaultChoice(NEW_ITEM)).toEqual({ action: 'none', documentationId: null, overwrite: false, confirmUnverified: false })
    expect(defaultChoice(MATCH_ITEM)).toEqual({ action: 'none', documentationId: 21, overwrite: false, confirmUnverified: false })
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
        {
          key: 'conflict-note',
          expected_blob_sha: CONFLICT_ITEM.blob_sha,
          action: 'update',
          overwrite_site_edits: true,
          expected_site_version: SITE_VERSION,
        },
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
      expect(item).not.toHaveProperty('expected_site_version')
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

describe('buildImportRequest 的 expected_site_version', () => {
  it('它應該把清單上的 site_version 原樣帶在確認覆蓋的 conflict 更新上', () => {
    const request = buildImportRequest(listingOf([CONFLICT_ITEM]), {
      [rowId(CONFLICT_ITEM)]: choice({ action: 'update', overwrite: true }),
    })
    expect(request.items[0]).toMatchObject({ overwrite_site_edits: true, expected_site_version: SITE_VERSION })
  })

  it('它應該在沒確認覆蓋、或不是 conflict 時都不帶 expected_site_version', () => {
    const withVersion = { ...CHANGED_ITEM, site_version: SITE_VERSION } // 就算清單給了也不該帶
    const request = buildImportRequest(listingOf([CONFLICT_ITEM, withVersion, NEW_ITEM]), {
      [rowId(CONFLICT_ITEM)]: choice({ action: 'update', overwrite: false }),
      [rowId(withVersion)]: choice({ action: 'update', overwrite: true }),
      [rowId(NEW_ITEM)]: choice({ action: 'create' }),
    })
    expect(request.items).toHaveLength(3)
    for (const item of request.items) {
      expect(item).not.toHaveProperty('expected_site_version')
      expect(item).not.toHaveProperty('overwrite_site_edits')
    }
  })

  it.each([
    { label: 'null', value: null },
    { label: '欄位不存在（後端還沒更新）', value: undefined },
    { label: '空字串', value: '' },
  ])('它應該在 conflict 的 site_version 是 $label 時不送覆蓋', ({ value }) => {
    const item = { ...CONFLICT_ITEM, site_version: value as never }
    const request = buildImportRequest(listingOf([item]), {
      [rowId(item)]: choice({ action: 'update', overwrite: true }),
    })
    expect(request.items[0]).not.toHaveProperty('overwrite_site_edits')
    expect(request.items[0]).not.toHaveProperty('expected_site_version')
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

  it.each([null, undefined, ''])('它應該擋下確認覆蓋、但清單沒給 site_version（%s）的 conflict 更新', (value) => {
    const item = { ...CONFLICT_ITEM, site_version: value as never }
    const problems = selectionProblems(listingOf([item]), {
      [rowId(item)]: choice({ action: 'update', overwrite: true }),
    })
    expect(problems).toEqual([{ kind: 'site_version_missing', path: item.path }])
  })

  it('它應該不因為缺 site_version 擋下沒選更新、或沒確認覆蓋的列', () => {
    const item = { ...CONFLICT_ITEM, site_version: null }
    expect(selectionProblems(listingOf([item]), { [rowId(item)]: choice({ action: 'none' }) })).toEqual([])
    // 沒確認覆蓋時只報「請先勾選確認」，不重複報缺版本
    expect(
      selectionProblems(listingOf([item]), { [rowId(item)]: choice({ action: 'update', overwrite: false }) }),
    ).toEqual([{ kind: 'overwrite_unconfirmed', path: item.path }])
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
    expect(describeProblem({ kind: 'site_version_missing', path: 'p' }, titleOf)).toContain('T:p')
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

describe('describeImportError（列清單）', () => {
  const inList = (e: unknown) => describeImportError(e, 'list')

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
    const error = inList(new ApiHttpError(status, '/article-sources', 'GET', { reason }))
    expect(error.kind).toBe('unavailable')
    expect(error.message).toBe(REASON_TEXT[reason])
    expect(error.message).not.toContain(reason)
  })

  it('它應該對沒看過的 reason 退回帶狀態碼的說明，不顯示代號', () => {
    const error = inList(new ApiRequestError(503, '/x', 'POST', { reason: 'brand_new' }))
    expect(error).toEqual({ kind: 'unavailable', message: '來源暫時無法使用（HTTP 503）。' })
  })

  it('它應該對沒有回應內容的 502 一樣退回通用說明', () => {
    expect(inList(new ApiHttpError(502, '/article-sources')).message).toBe(
      '來源暫時無法使用（HTTP 502）。',
    )
  })

  it.each(['stale', 'conflict'])('它應該把 409 %s 說成整批沒寫入並要求重新整理', (reason) => {
    const error = inList(new ApiRequestError(409, '/x', 'POST', { reason }))
    expect(error.kind).toBe('stale')
    expect(error.message).toContain('沒有任何文章被寫入')
    expect(error.message).toContain('重新整理清單')
  })

  it('它應該把 409 的 errors 攤平、去掉重複，接在 reason 說明後面', () => {
    const error = inList(
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
    const error = inList(new ApiRequestError(409, '/x', 'POST', { errors } as never))
    expect(error.message).toBe('沒有任何文章被寫入。請重新整理清單，再選一次。')
  })

  describe('409 的 items.N.expected_site_version', () => {
    const SITE_MESSAGE = '站上的標題、日期或內文在列出清單之後又改過，請重新整理清單，確認後再決定要不要覆蓋。'
    const TAIL = '沒有任何文章被寫入。請重新整理清單，確認站上現在的內容後，再決定要不要覆蓋。'

    it('它應該說成站上內容在清單載入之後又改過，不重複後端原文與 reason 說明', () => {
      const error = inList(
        new ApiRequestError(409, '/x', 'POST', {
          reason: 'conflict',
          errors: { 'items.0.expected_site_version': [SITE_MESSAGE] },
        }),
      )
      expect(error).toEqual({
        kind: 'stale',
        message: `站上的標題、日期或內文在清單載入之後又改過。${TAIL}`,
      })
    })

    it('它應該對多個項目只說一次，其他項目的原因照舊列在後面', () => {
      const error = inList(
        new ApiRequestError(409, '/x', 'POST', {
          reason: 'conflict',
          errors: {
            'items.0.expected_site_version': [SITE_MESSAGE],
            'items.3.expected_site_version': [SITE_MESSAGE],
            'items.1.documentation_id': ['這篇文章已經連結到其他來源檔案。'],
          },
        }),
      )
      expect(error.message).toBe(
        `站上的標題、日期或內文在清單載入之後又改過。這篇文章已經連結到其他來源檔案。${TAIL}`,
      )
    })

    it.each([
      'items.0.expected_site_versions',
      'items.x.expected_site_version',
      'expected_site_version',
      'items.0.expected_blob_sha',
    ])('它應該不把近似的 key（%s）當成站上內容改過', (key) => {
      const error = inList(
        new ApiRequestError(409, '/x', 'POST', { reason: 'conflict', errors: { [key]: ['別的原因。'] } }),
      )
      expect(error.message).toBe(`${REASON_TEXT.conflict}別的原因。沒有任何文章被寫入。請重新整理清單，再選一次。`)
    })
  })

  it('它應該把沒有 reason 的 409 也當成要重新整理', () => {
    expect(inList(new ApiRequestError(409, '/x', 'POST')).kind).toBe('stale')
  })

  it('它應該把 422 的欄位訊息串起來', () => {
    const error = inList(
      new ApiValidationError({ 'items.0.documentation_id': '要連結的文章不存在或已刪除。' }),
    )
    expect(error).toEqual({
      kind: 'validation',
      message: '要連結的文章不存在或已刪除。沒有任何文章被寫入。',
    })
    const empty = inList(new ApiValidationError({}))
    expect(empty.kind).toBe('validation')
    expect(empty.message).toContain('沒有任何文章被寫入')
  })

  it('它應該處理 403、登入狀態改變、網路失敗與未知錯誤', () => {
    expect(inList(new ApiHttpError(403, '/x')).message).toContain('權限')
    expect(inList(new ApiRequestError(500, '/x', 'POST')).message).toContain('HTTP 500')
    expect(inList(new AuthSessionChangedError()).message).toBe(new AuthSessionChangedError().message)
    expect(inList(new TypeError('Failed to fetch'))).toEqual({
      kind: 'network',
      message: '連不上後端 API，請稍後再試。',
    })
    expect(inList('boom').kind).toBe('other')
  })
})

const SHA_A = 'a'.repeat(40)
const SHA_B = 'b'.repeat(40)

describe('buildImportRequest 的 confirm_unverified_base', () => {
  const listing = listingOf(ALL_ITEMS)
  const unverified = { [rowId(CHANGED_ITEM)]: SHA_A, [rowId(CONFLICT_ITEM)]: SHA_B }

  it('它應該只在後端要求確認、而且使用者已確認的 update 上，帶後端給的 commit_sha', () => {
    const request = buildImportRequest(
      listing,
      {
        [rowId(CHANGED_ITEM)]: choice({ action: 'update', confirmUnverified: true }),
        [rowId(CONFLICT_ITEM)]: choice({ action: 'update', overwrite: true, confirmUnverified: true }),
        [rowId(NEW_ITEM)]: choice({ action: 'create', confirmUnverified: true }),
      },
      unverified,
    )
    const byKey = Object.fromEntries(request.items.map((i) => [i.key, i]))
    expect(byKey['changed-note']!.confirm_unverified_base).toBe(SHA_A)
    // 兩輪合在一起：確認、覆蓋、站上版本三個值都帶齊
    expect(byKey['conflict-note']).toMatchObject({
      confirm_unverified_base: SHA_B,
      overwrite_site_edits: true,
      expected_site_version: SITE_VERSION,
    })
    expect(byKey['new-note']).not.toHaveProperty('confirm_unverified_base')
  })

  it('它應該在沒確認、後端沒要求（不在名單裡）、或不是 update 時都不帶', () => {
    const request = buildImportRequest(
      listing,
      {
        [rowId(CHANGED_ITEM)]: choice({ action: 'update', confirmUnverified: false }),
        [rowId(CONFLICT_ITEM)]: choice({ action: 'update', overwrite: true, confirmUnverified: true }),
        [rowId(MATCH_ITEM)]: choice({ action: 'link', documentationId: 21, confirmUnverified: true }),
      },
      { [rowId(CHANGED_ITEM)]: SHA_A, [rowId(MATCH_ITEM)]: SHA_A },
    )
    for (const item of request.items) expect(item).not.toHaveProperty('confirm_unverified_base')
  })

  it('它應該在沒有傳名單時一個都不帶（第一次送出）', () => {
    const request = buildImportRequest(listing, {
      [rowId(CHANGED_ITEM)]: choice({ action: 'update', confirmUnverified: true }),
    })
    expect(request.items[0]).not.toHaveProperty('confirm_unverified_base')
  })
})

describe('selectedRowIds', () => {
  it('它應該跟 buildImportRequest 的 items 同一個順序（後端用項目索引指出是哪一項）', () => {
    const listing = listingOf(ALL_ITEMS)
    const choices = {
      [rowId(MATCH_ITEM)]: choice({ action: 'link', documentationId: 21 }),
      [rowId(NEW_ITEM)]: choice({ action: 'create' }),
      [rowId(CHANGED_ITEM)]: choice({ action: 'update' }),
      [rowId(UNCHANGED_ITEM)]: choice({ action: 'update' }), // 丟掉的列不佔索引
    }
    const ids = selectedRowIds(listing, choices)
    const keys = buildImportRequest(listing, choices).items.map((i) => i.key)
    expect(ids.map((id) => ALL_ITEMS.find((i) => rowId(i) === id)!.key)).toEqual(keys)
    expect(ids).toHaveLength(3)
  })
})

describe('selectionProblems 的 unverified_unconfirmed', () => {
  const listing = listingOf(ALL_ITEMS)
  const unverified = { [rowId(CHANGED_ITEM)]: SHA_A }

  it('它應該擋下後端要求確認、還沒確認的 update', () => {
    expect(selectionProblems(listing, { [rowId(CHANGED_ITEM)]: choice({ action: 'update' }) }, unverified)).toEqual([
      { kind: 'unverified_unconfirmed', path: CHANGED_ITEM.path },
    ])
  })

  it('它應該在確認之後、改成不處理、或沒有名單時都不擋', () => {
    expect(
      selectionProblems(listing, { [rowId(CHANGED_ITEM)]: choice({ action: 'update', confirmUnverified: true }) }, unverified),
    ).toEqual([])
    expect(selectionProblems(listing, { [rowId(CHANGED_ITEM)]: choice({ action: 'none' }) }, unverified)).toEqual([])
    expect(selectionProblems(listing, { [rowId(CHANGED_ITEM)]: choice({ action: 'update' }) })).toEqual([])
  })

  it('它應該跟覆蓋確認各自獨立地擋（兩個都沒做就報兩個）', () => {
    const both = { [rowId(CONFLICT_ITEM)]: SHA_A }
    expect(
      selectionProblems(listing, { [rowId(CONFLICT_ITEM)]: choice({ action: 'update' }) }, both).map((p) => p.kind),
    ).toEqual(['overwrite_unconfirmed', 'unverified_unconfirmed'])
  })

  it('它應該把問題說成中文', () => {
    expect(describeProblem({ kind: 'unverified_unconfirmed', path: 'p' }, (p) => `T:${p}`)).toContain('T:p')
  })
})

describe('parseUnverifiedCommits', () => {
  it('它應該讀出 [{index, commit_sha}]', () => {
    expect(
      parseUnverifiedCommits({ unverified_commits: [{ index: 0, commit_sha: SHA_A }, { index: 2, commit_sha: SHA_B }] }),
    ).toEqual([
      { index: 0, commit_sha: SHA_A },
      { index: 2, commit_sha: SHA_B },
    ])
  })

  it.each([
    { label: '沒有這個欄位', body: {} },
    { label: 'body 是 null', body: null },
    { label: '舊格式（以索引為 key 的物件）', body: { unverified_commits: { '0': SHA_A } } },
    { label: '不是陣列', body: { unverified_commits: 'x' } },
  ])('它應該在 $label 時回空陣列', ({ body }) => {
    expect(parseUnverifiedCommits(body)).toEqual([])
  })

  it.each([
    { label: '大寫', entry: { index: 0, commit_sha: SHA_A.toUpperCase() } },
    { label: '39 碼', entry: { index: 0, commit_sha: 'a'.repeat(39) } },
    { label: '41 碼', entry: { index: 0, commit_sha: 'a'.repeat(41) } },
    { label: '不是十六進位', entry: { index: 0, commit_sha: 'g'.repeat(40) } },
    { label: '索引是負數', entry: { index: -1, commit_sha: SHA_A } },
    { label: '索引是小數', entry: { index: 1.5, commit_sha: SHA_A } },
    { label: '索引是字串', entry: { index: '0', commit_sha: SHA_A } },
    { label: '沒有 commit_sha', entry: { index: 0 } },
    { label: '不是物件', entry: SHA_A },
    { label: 'null', entry: null },
  ])('它應該丟掉格式不對的項目（$label）', ({ entry }) => {
    expect(parseUnverifiedCommits({ unverified_commits: [entry] })).toEqual([])
  })

  it('它應該只留同一個索引的第一筆', () => {
    expect(
      parseUnverifiedCommits({ unverified_commits: [{ index: 0, commit_sha: SHA_A }, { index: 0, commit_sha: SHA_B }] }),
    ).toEqual([{ index: 0, commit_sha: SHA_A }])
  })
})

describe('describeImportError（匯入）', () => {
  const inImport = (e: unknown) => describeImportError(e, 'import')
  const url = '/article-sources/import'
  const NOT_WRITTEN = '沒有任何文章被寫入'

  it('它應該把連不上後端說成結果不明，不說沒有寫入，出路是重新整理並核對', () => {
    const error = inImport(new TypeError('Failed to fetch'))
    expect(error.kind).toBe('uncertain')
    expect(error.message).toContain('不確定這批有沒有寫入')
    expect(error.message).toContain('重新整理清單並核對')
    expect(error.message).not.toContain(NOT_WRITTEN)
  })

  it.each([500, 501, 504, 599])('它應該把 HTTP %i 說成結果不明', (status) => {
    const error = inImport(new ApiRequestError(status, url, 'POST'))
    expect(error.kind).toBe('uncertain')
    expect(error.message).toContain(`HTTP ${status}`)
    expect(error.message).not.toContain(NOT_WRITTEN)
  })

  it.each([502, 503])('它應該把沒有原因、或原因不認得的 %i（可能是閘道回的）說成結果不明', (status) => {
    expect(inImport(new ApiRequestError(status, url, 'POST')).kind).toBe('uncertain')
    expect(inImport(new ApiRequestError(status, url, 'POST', { reason: 'brand_new' })).kind).toBe('uncertain')
    expect(inImport(new ApiRequestError(status, url, 'POST', {})).kind).toBe('uncertain')
  })

  it.each([
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
  ])('它應該把後端說了原因的 %s（HTTP %i）維持成確定沒寫入的 unavailable', (reason, status) => {
    const error = inImport(new ApiRequestError(status, url, 'POST', { reason }))
    expect(error).toEqual({ kind: 'unavailable', message: REASON_TEXT[reason] })
  })

  it('它應該讀不出回應、或收到沒看過的例外時也當成結果不明', () => {
    expect(inImport(new SyntaxError('Unexpected token')).kind).toBe('uncertain')
    expect(inImport('boom').kind).toBe('uncertain')
    expect(inImport(undefined).kind).toBe('uncertain')
  })

  it('它應該讓確定沒寫入的失敗維持原樣：409、422、403、其他 4xx、登入狀態改變', () => {
    expect(inImport(new ApiRequestError(409, url, 'POST', { reason: 'stale' })).kind).toBe('stale')
    expect(inImport(new ApiValidationError({ a: '不行' })).kind).toBe('validation')
    expect(inImport(new ApiRequestError(403, url, 'POST')).kind).toBe('other')
    expect(inImport(new ApiRequestError(404, url, 'POST')).kind).toBe('other')
    expect(inImport(new ApiRequestError(413, url, 'POST')).kind).toBe('other')
    expect(inImport(new AuthSessionChangedError()).kind).toBe('other')
  })

  describe('409 的 items.N.confirm_unverified_base', () => {
    const CONFIRM_MESSAGE = '無法確認這個版本是否比站上上次匯入的新。請帶上 confirm_unverified_base。'
    const body = (extra: object = {}) => ({
      reason: 'conflict',
      errors: { 'items.1.confirm_unverified_base': [CONFIRM_MESSAGE] },
      unverified_commits: [{ index: 1, commit_sha: SHA_A }],
      ...extra,
    })

    it('它應該說成無法確認新舊、整批沒寫入，附上要確認的項目，不顯示後端原文與欄位名', () => {
      const error = inImport(new ApiRequestError(409, url, 'POST', body()))
      expect(error.kind).toBe('unverified')
      expect(error.unverified).toEqual([{ index: 1, commit_sha: SHA_A }])
      expect(error.message).toBe(
        '無法確認來源這一版是否比站上上次匯入的新（來源的歷史可能被改寫過）。沒有任何文章被寫入。請確認要用這一版更新的項目後再送出，或重新整理清單。',
      )
      expect(error.message).not.toContain('confirm_unverified_base')
    })

    it('它應該把其他項目的原因與站上內容改過一起說出來', () => {
      const error = inImport(
        new ApiRequestError(
          409,
          url,
          'POST',
          body({
            errors: {
              'items.1.confirm_unverified_base': [CONFIRM_MESSAGE],
              'items.0.documentation_id': ['這篇文章已經連結到其他來源檔案。'],
              'items.2.expected_site_version': ['站上又改過。'],
            },
          }),
        ),
      )
      expect(error.kind).toBe('unverified')
      expect(error.message).toBe(
        '無法確認來源這一版是否比站上上次匯入的新（來源的歷史可能被改寫過）。站上的標題、日期或內文在清單載入之後又改過。這篇文章已經連結到其他來源檔案。沒有任何文章被寫入。請確認要用這一版更新的項目後再送出，或重新整理清單。',
      )
    })

    it('它應該在同一項又判斷不出新舊、又站上內容改過時只給重新整理清單，不開放確認', () => {
      const error = inImport(
        new ApiRequestError(
          409,
          url,
          'POST',
          body({
            errors: {
              'items.1.confirm_unverified_base': [CONFIRM_MESSAGE],
              'items.1.expected_site_version': ['站上又改過。'],
              'items.0.documentation_id': ['這篇文章已經連結到其他來源檔案。'],
            },
          }),
        ),
      )
      expect(error.kind).toBe('stale')
      expect(error.unverified).toBeUndefined()
      expect(error.refreshOnly).toEqual([1])
      expect(error.message).toBe(
        '站上的標題、日期或內文在清單載入之後又改過。這篇文章已經連結到其他來源檔案。沒有任何文章被寫入。請重新整理清單，確認站上現在的內容後，再決定要不要覆蓋。',
      )
      expect(error.message).not.toContain('請確認要用這一版更新')
      expect(error.message).not.toContain('confirm_unverified_base')
    })

    it('它應該在站上改過的是另一項（索引不同）時，仍照原樣給確認', () => {
      const error = inImport(
        new ApiRequestError(409, url, 'POST', body({ errors: { 'items.1.confirm_unverified_base': [CONFIRM_MESSAGE], 'items.2.expected_site_version': ['x'] } })),
      )
      expect(error.kind).toBe('unverified')
      expect(error.refreshOnly).toBeUndefined()
    })

    it.each([
      { label: '沒有 unverified_commits', extra: { unverified_commits: undefined } },
      { label: 'unverified_commits 是空陣列', extra: { unverified_commits: [] } },
      { label: 'unverified_commits 的 commit_sha 格式不對', extra: { unverified_commits: [{ index: 1, commit_sha: 'abc' }] } },
      { label: 'unverified_commits 是舊格式', extra: { unverified_commits: { '1': SHA_A } } },
    ])('它應該在 $label 時不給確認（帶不回去的值不能確認），退回要重新整理的 409', ({ extra }) => {
      const error = inImport(new ApiRequestError(409, url, 'POST', body(extra)))
      expect(error.kind).toBe('stale')
      expect(error.unverified).toBeUndefined()
      expect(error.message).toContain(NOT_WRITTEN)
    })

    it.each([
      'items.1.confirm_unverified_bases',
      'items.x.confirm_unverified_base',
      'confirm_unverified_base',
      'items.1.expected_blob_sha',
    ])('它應該不把近似的 key（%s）當成要確認', (key) => {
      const error = inImport(new ApiRequestError(409, url, 'POST', body({ errors: { [key]: ['別的原因。'] } })))
      expect(error.kind).toBe('stale')
    })

    it('它應該只有 409 才給確認：同樣的 body 放在 500 上是結果不明', () => {
      expect(inImport(new ApiRequestError(500, url, 'POST', body())).kind).toBe('uncertain')
    })
  })

  it('它應該把 items.N.overwrite_site_edits（確認之後才輪到的覆蓋提示）也說成站上內容改過', () => {
    const error = inImport(
      new ApiRequestError(409, url, 'POST', {
        reason: 'conflict',
        errors: { 'items.0.overwrite_site_edits': ['要覆蓋請明確設定 overwrite_site_edits。'] },
      }),
    )
    expect(error.kind).toBe('stale')
    expect(error.message).toBe(
      '站上的標題、日期或內文在清單載入之後又改過。沒有任何文章被寫入。請重新整理清單，確認站上現在的內容後，再決定要不要覆蓋。',
    )
  })
})

describe('reconcileImport', () => {
  const sha = (c: string) => c.repeat(40)
  const request = (...items: ImportRequest['items']): ImportRequest => ({ commit_sha: COMMIT, items })
  const created = { key: NEW_ITEM.key!, expected_blob_sha: NEW_ITEM.blob_sha!, action: 'create' as const }
  const updated = { key: CHANGED_ITEM.key!, expected_blob_sha: CHANGED_ITEM.blob_sha!, action: 'update' as const }
  const linked = {
    key: MATCH_ITEM.key!,
    expected_blob_sha: MATCH_ITEM.blob_sha!,
    action: 'link' as const,
    documentation_id: 21,
  }
  /** 把某一列換成別的狀態。 */
  const as = (item: SourceItem, over: Partial<SourceItem>): SourceItem => ({ ...item, ...over })

  it('它應該在整批每一項都已經是沒有變動、內容也是送出的那一版時，說已寫入，並列出文章', () => {
    const outcome = reconcileImport(
      request(created, updated, linked),
      listingOf([
        as(NEW_ITEM, { status: 'unchanged', documentation_id: 40, published: false }),
        as(CHANGED_ITEM, { status: 'unchanged' }),
        as(MATCH_ITEM, { status: 'unchanged' }),
      ]),
    )
    expect(outcome).toEqual({
      kind: 'applied',
      items: [
        { key: 'new-note', documentationId: 40, title: '新的筆記' },
        { key: 'changed-note', documentationId: 12, title: '有更新的筆記' },
        { key: 'match-note', documentationId: 21, title: '標題相同的筆記' },
      ],
    })
  })

  it('它應該在整批每一項都還是可以做那個動作的狀態、內容也沒變時，說沒寫入', () => {
    // conflict 也算可以 update；possible_match 也算可以 create
    const outcome = reconcileImport(
      request(created, updated, linked),
      listingOf([as(NEW_ITEM, { status: 'possible_match' }), as(CHANGED_ITEM, { status: 'conflict' }), MATCH_ITEM]),
    )
    expect(outcome).toEqual({ kind: 'not_applied' })
  })

  it('它應該在寫入的和沒寫入的混在一起時說看不出來（整批是原子的，不該發生）', () => {
    expect(
      reconcileImport(
        request(created, updated),
        listingOf([as(NEW_ITEM, { status: 'unchanged', documentation_id: 40 }), CHANGED_ITEM]),
      ),
    ).toEqual({ kind: 'unknown' })
  })

  it.each([
    { label: '來源又有新版本（blob 變了）', items: [as(NEW_ITEM, { blob_sha: sha('f') })] },
    { label: '清單上找不到這一項', items: [] },
    { label: '站上已刪除', items: [as(NEW_ITEM, { status: 'site_deleted', documentation_id: 40 })] },
    { label: '變成無法匯入', items: [as(NEW_ITEM, { status: 'invalid' })] },
    { label: '變成來源已移除', items: [as(NEW_ITEM, { status: 'removed', blob_sha: null })] },
    { label: '同一個 key 同一版出現兩列', items: [NEW_ITEM, NEW_ITEM] },
    { label: '沒有變動、但沒有對應的文章', items: [as(NEW_ITEM, { status: 'unchanged', documentation_id: null })] },
    // create 不能在 changed 的狀態下做：就算內容一樣也不算「沒寫入」
    { label: '狀態不允許送出的動作', items: [as(NEW_ITEM, { status: 'changed' })] },
  ])('它應該在 $label 時說看不出來', ({ items }) => {
    expect(reconcileImport(request(created), listingOf(items))).toEqual({ kind: 'unknown' })
  })

  it('它應該在 link 的對應文章跟送出的不同時說看不出來', () => {
    const other = as(MATCH_ITEM, { status: 'unchanged', documentation_id: 99 })
    expect(reconcileImport(request(linked), listingOf([other]))).toEqual({ kind: 'unknown' })
  })

  it('它應該對空的請求說看不出來', () => {
    expect(reconcileImport(request(), listingOf([NEW_ITEM]))).toEqual({ kind: 'unknown' })
  })

  it('它應該在整批有一項對不上時整批說看不出來，就算其他項目都已寫入', () => {
    expect(
      reconcileImport(
        request(created, updated),
        listingOf([as(NEW_ITEM, { status: 'unchanged', documentation_id: 40 }), as(CHANGED_ITEM, { blob_sha: sha('f') })]),
      ),
    ).toEqual({ kind: 'unknown' })
  })
})
