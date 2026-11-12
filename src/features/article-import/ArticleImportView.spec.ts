import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ArticleImportView from './ArticleImportView.vue'
import { ApiHttpError, ApiRequestError, ApiValidationError } from '@/api/client'
import { fetchArticles, type ArticleDto } from '@/api/articles'
import { fetchArticleSources, importArticleSources } from './articleImportApi'
import {
  ALL_ITEMS,
  CHANGED_ITEM,
  COMMIT,
  CONFLICT_ITEM,
  MATCH_ITEM,
  NEW_ITEM,
  WARNING_ITEM,
  listingOf,
} from './articleImportFixtures'

vi.mock('@/api/articles', async (original) => ({
  ...(await original<typeof import('@/api/articles')>()),
  fetchArticles: vi.fn(),
}))
vi.mock('./articleImportApi', async (original) => ({
  ...(await original<typeof import('./articleImportApi')>()),
  fetchArticleSources: vi.fn(),
  importArticleSources: vi.fn(),
}))

function article(id: number, title: string): ArticleDto {
  return {
    id,
    type: 3,
    title,
    body: null,
    status: 1,
    creation_date: '2026-10-01',
    created_at: null,
    updated_at: null,
    scope: null,
    techniques: [],
    implementations: [],
  }
}

// 站上文章：12、13、14 連著還在的來源檔案；21 是標題相同的；31 沒有任何連結
const SITE_ARTICLES = [
  article(12, '站上的更新筆記'),
  article(13, '站上的衝突筆記'),
  article(21, '標題相同的筆記'),
  article(31, '還沒連結的舊文章'),
]

async function mountView(items = ALL_ITEMS, { articlesFail = false } = {}) {
  vi.mocked(fetchArticleSources).mockResolvedValue(listingOf(items))
  if (articlesFail) vi.mocked(fetchArticles).mockRejectedValue(new Error('down'))
  else vi.mocked(fetchArticles).mockResolvedValue(SITE_ARTICLES)
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/articles/manage', name: 'article-manage', component: stub },
      { path: '/articles/:id/edit', name: 'article-editor', component: stub },
    ],
  })
  await router.push('/articles/manage')
  await router.isReady()
  const wrapper = mount(ArticleImportView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

const row = (w: VueWrapper, title: string) =>
  w.findAll('li[data-status]').find((r) => r.text().includes(title))!

async function pick(w: VueWrapper, title: string, label: string) {
  await row(w, title)
    .findAll('button')
    .find((b) => b.text() === label)!
    .trigger('click')
}

const actionLabels = (w: VueWrapper, title: string) =>
  row(w, title)
    .find('[role="group"]')
    .findAll('button')
    .map((b) => b.text())

async function showAll(w: VueWrapper) {
  await w
    .findAll('button')
    .find((b) => b.text().startsWith('全部'))!
    .trigger('click')
}

const submitButton = (w: VueWrapper) => w.get('[data-test="submit"]')

beforeEach(() => {
  vi.mocked(fetchArticleSources).mockReset()
  vi.mocked(importArticleSources).mockReset()
  vi.mocked(fetchArticles).mockReset()
})

describe('ArticleImportView 清單', () => {
  it('它應該每個來源檔案一列，顯示標題、來源路徑與中文狀態標籤', async () => {
    const w = await mountView()
    await showAll(w)

    const rows = w.findAll('li[data-status]')
    expect(rows).toHaveLength(ALL_ITEMS.length)
    const badges = rows.map((r) => r.get('[data-test="status-badge"]').text())
    expect(badges).toEqual([
      '新檔案',
      '來源有更新',
      '站上也改過',
      '可能已存在',
      '沒有變動',
      '來源已移除',
      '站上已刪除',
      '無法匯入',
      '新檔案',
    ])
    expect(w.text()).toContain('notes/new-note.md')
    expect(w.text()).toContain('example/notes')
    expect(w.text()).toContain('ccccccc') // 版本只顯示前 7 碼
    expect(w.text()).not.toContain(COMMIT)
  })

  it('它應該預設只列可處理的列，切到「全部」才看到資訊性的列', async () => {
    const w = await mountView()
    // 可處理：new、changed、conflict、possible_match、帶警告的 new
    expect(w.findAll('li[data-status]')).toHaveLength(5)
    expect(w.findAll('li[data-status="unchanged"]')).toHaveLength(0)

    await showAll(w)
    expect(w.findAll('li[data-status]')).toHaveLength(9)
  })

  it('它應該在沒有任何可處理的列時直接列全部，不顯示篩選', async () => {
    const w = await mountView(ALL_ITEMS.filter((i) => ['unchanged', 'removed'].includes(i.status)))
    expect(w.findAll('li[data-status]')).toHaveLength(2)
    expect(w.text()).not.toContain('待處理')
  })

  it('它應該顯示對應的站上文章（連到編輯頁）與發布狀態；文章清單載入失敗時只顯示編號', async () => {
    const w = await mountView()
    const link = row(w, '有更新的筆記').get('a')
    expect(link.text()).toBe('站上的更新筆記')
    expect(link.attributes('href')).toBe('/articles/12/edit')
    expect(row(w, '有更新的筆記').text()).toContain('已發布')
    expect(row(w, '兩邊都改過的筆記').text()).toContain('草稿')
    expect(row(w, '新的筆記').text()).not.toContain('站上文章')

    const failed = await mountView(ALL_ITEMS, { articlesFail: true })
    expect(row(failed, '有更新的筆記').get('a').text()).toBe('#12')
  })

  it('它應該顯示警告的說明與行號，不顯示任何比對到的內容', async () => {
    const w = await mountView()
    const warnings = row(w, '有警告的筆記').get('[data-test="warnings"]')
    expect(warnings.text()).toContain('第 7 行：email 地址')
    expect(warnings.text()).toContain('發布前請確認')
  })

  it('它應該對 invalid 的列顯示原因，而且沒有動作可選', async () => {
    const w = await mountView()
    await showAll(w)
    const invalid = row(w, 'notes/broken.md')
    expect(invalid.get('[data-test="invalid-reason"]').text()).toBe('front matter 缺少 slug。')
    expect(invalid.findAll('button')).toHaveLength(0)
  })

  it('它應該對 unchanged、removed、site_deleted 只顯示資訊、沒有動作', async () => {
    const w = await mountView()
    await showAll(w)
    for (const title of ['沒變的筆記', '來源已移除的筆記', '站上刪掉的筆記']) {
      expect(row(w, title).findAll('button'), title).toHaveLength(0)
    }
  })
})

describe('ArticleImportView 每種狀態能選的動作', () => {
  it.each([
    ['新的筆記', ['不處理', '新增為草稿', '連結既有文章']],
    ['標題相同的筆記', ['不處理', '新增為草稿', '連結既有文章']],
    ['有更新的筆記', ['不處理', '更新']],
    ['兩邊都改過的筆記', ['不處理', '更新']],
  ])('它應該讓「%s」只出現 %j', async (title, labels) => {
    const w = await mountView()
    expect(actionLabels(w, title)).toEqual(labels)
  })
})

describe('ArticleImportView 送出', () => {
  it('它應該在沒選任何動作時停用送出', async () => {
    const w = await mountView()
    expect(submitButton(w).attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('已選 0 項')
  })

  it('它應該把整批選擇用一次請求送出，帶清單的 commit 與各檔案的 blob SHA', async () => {
    vi.mocked(importArticleSources).mockResolvedValue({
      commit_sha: COMMIT,
      message: 'ok',
      data: [],
    })
    const w = await mountView()
    await pick(w, '新的筆記', '新增為草稿')
    await pick(w, '有更新的筆記', '更新')

    expect(w.text()).toContain('已選 2 項')
    await submitButton(w).trigger('click')
    await flushPromises()

    expect(importArticleSources).toHaveBeenCalledTimes(1)
    expect(importArticleSources).toHaveBeenCalledWith({
      commit_sha: COMMIT,
      items: [
        { key: 'new-note', expected_blob_sha: NEW_ITEM.blob_sha, action: 'create' },
        { key: 'changed-note', expected_blob_sha: CHANGED_ITEM.blob_sha, action: 'update' },
      ],
    })
  })

  it('它應該提醒更新已發布的文章會直接換成來源內容', async () => {
    const w = await mountView()
    expect(w.find('[data-test="published-note"]').exists()).toBe(false)
    await pick(w, '有更新的筆記', '更新')
    expect(row(w, '有更新的筆記').get('[data-test="published-note"]').text()).toContain('已發布')
    // 草稿的 conflict 列不顯示這句
    await pick(w, '兩邊都改過的筆記', '更新')
    expect(row(w, '兩邊都改過的筆記').find('[data-test="published-note"]').exists()).toBe(false)
  })
})

describe('ArticleImportView conflict 覆蓋確認', () => {
  it('它應該在 conflict 選更新卻沒確認覆蓋時擋住送出，說明原因', async () => {
    const w = await mountView()
    await pick(w, '兩邊都改過的筆記', '更新')

    expect(submitButton(w).attributes('disabled')).toBeDefined()
    expect(w.get('[data-test="problems"]').text()).toContain('要覆蓋站上的修改，請先勾選確認')
    expect(importArticleSources).not.toHaveBeenCalled()
  })

  it('它應該在確認「覆蓋站上的修改」後才送出，並帶 overwrite_site_edits: true', async () => {
    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    const w = await mountView()
    await pick(w, '兩邊都改過的筆記', '更新')

    await row(w, '兩邊都改過的筆記').get('[role="switch"]').trigger('click')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
    await submitButton(w).trigger('click')
    await flushPromises()

    expect(importArticleSources).toHaveBeenCalledWith({
      commit_sha: COMMIT,
      items: [
        {
          key: 'conflict-note',
          expected_blob_sha: CONFLICT_ITEM.blob_sha,
          action: 'update',
          overwrite_site_edits: true,
        },
      ],
    })
  })

  it('它應該在改回「不處理」之後不再要求確認', async () => {
    const w = await mountView()
    await pick(w, '兩邊都改過的筆記', '更新')
    await pick(w, '兩邊都改過的筆記', '不處理')
    expect(w.find('[data-test="problems"]').exists()).toBe(false)
  })
})

describe('ArticleImportView 連結既有文章', () => {
  it('它應該替 possible_match 預先選好標題相同的文章，選項排除已連著來源檔案的文章', async () => {
    const w = await mountView()
    await pick(w, '標題相同的筆記', '連結既有文章')

    const select = row(w, '標題相同的筆記').get('select')
    expect((select.element as HTMLSelectElement).value).toBe('21')
    const options = select.findAll('option').map((o) => o.text())
    expect(options.some((t) => t.includes('標題相同的筆記'))).toBe(true)
    expect(options.some((t) => t.includes('還沒連結的舊文章'))).toBe(true)
    // 12、13 已連到還在的來源檔案，不能再被連結
    expect(options.some((t) => t.includes('站上的更新筆記'))).toBe(false)
    expect(options.some((t) => t.includes('站上的衝突筆記'))).toBe(false)

    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importArticleSources).toHaveBeenCalledWith({
      commit_sha: COMMIT,
      items: [
        { key: 'match-note', expected_blob_sha: MATCH_ITEM.blob_sha, action: 'link', documentation_id: 21 },
      ],
    })
  })

  it('它應該讓沒有對應的列手動挑一篇既有文章；沒挑之前不能送出', async () => {
    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    const w = await mountView()
    await pick(w, '有警告的筆記', '連結既有文章')

    expect(submitButton(w).attributes('disabled')).toBeDefined()
    expect(w.get('[data-test="problems"]').text()).toContain('還沒選要連結的文章')

    await row(w, '有警告的筆記').get('select').setValue('31')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
    await submitButton(w).trigger('click')
    await flushPromises()

    expect(importArticleSources).toHaveBeenCalledWith({
      commit_sha: COMMIT,
      items: [
        {
          key: WARNING_ITEM.key,
          expected_blob_sha: WARNING_ITEM.blob_sha,
          action: 'link',
          documentation_id: 31,
        },
      ],
    })
  })

  it('它應該在文章清單載入失敗時停用選單並說明', async () => {
    const w = await mountView([NEW_ITEM], { articlesFail: true })
    await pick(w, '新的筆記', '連結既有文章')
    expect(w.get('select').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('站上文章清單載入失敗')
  })

  it('它應該擋下兩列連到同一篇文章', async () => {
    const w = await mountView()
    await pick(w, '新的筆記', '連結既有文章')
    await row(w, '新的筆記').get('select').setValue('31')
    await pick(w, '有警告的筆記', '連結既有文章')
    await row(w, '有警告的筆記').get('select').setValue('31')

    expect(submitButton(w).attributes('disabled')).toBeDefined()
    expect(w.get('[data-test="problems"]').text()).toContain('只能連結一個來源檔案')
  })
})

describe('ArticleImportView 匯入成功', () => {
  it('它應該顯示新增、更新、連結各幾篇，標題連到編輯頁，並附上警告', async () => {
    vi.mocked(importArticleSources).mockResolvedValue({
      commit_sha: COMMIT,
      message: 'ok',
      data: [
        { key: 'new-note', action: 'create', documentation_id: 40, title: '新的筆記', published: false, warnings: [{ code: 'email', message: 'email 地址', line: 7 }] },
        { key: 'changed-note', action: 'update', documentation_id: 12, title: '有更新的筆記', published: true, warnings: [] },
        { key: 'match-note', action: 'link', documentation_id: 21, title: '標題相同的筆記', published: true, warnings: [] },
      ],
    })
    const w = await mountView()
    await pick(w, '新的筆記', '新增為草稿')
    await submitButton(w).trigger('click')
    await flushPromises()

    const result = w.get('[data-test="result"]')
    expect(result.text()).toContain('已匯入 3 篇')
    expect(result.text()).toContain('新增 1、更新 1、連結 1')
    const hrefs = result.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['/articles/40/edit', '/articles/12/edit', '/articles/21/edit'])
    expect(result.get('[data-test="result-warnings"]').text()).toContain('第 7 行，email 地址')
    expect(result.text()).toContain('草稿')
  })

  it('它應該在成功後重新讀清單並清掉選擇，結果摘要留在畫面上', async () => {
    vi.mocked(importArticleSources).mockResolvedValue({
      commit_sha: COMMIT,
      message: 'ok',
      data: [{ key: 'new-note', action: 'create', documentation_id: 40, title: '新的筆記', published: false, warnings: [] }],
    })
    const w = await mountView()
    await pick(w, '新的筆記', '新增為草稿')
    await submitButton(w).trigger('click')
    await flushPromises()

    expect(fetchArticleSources).toHaveBeenCalledTimes(2)
    expect(w.text()).toContain('已選 0 項')
    expect(w.find('[data-test="result"]').exists()).toBe(true)
  })

  it('它應該在手動重新整理時收掉上一次的結果', async () => {
    vi.mocked(importArticleSources).mockResolvedValue({
      commit_sha: COMMIT,
      message: 'ok',
      data: [{ key: 'new-note', action: 'create', documentation_id: 40, title: '新的筆記', published: false, warnings: [] }],
    })
    const w = await mountView()
    await pick(w, '新的筆記', '新增為草稿')
    await submitButton(w).trigger('click')
    await flushPromises()

    await w.findAll('button').find((b) => b.text() === '重新整理清單')!.trigger('click')
    await flushPromises()
    expect(w.find('[data-test="result"]').exists()).toBe(false)
  })
})

describe('ArticleImportView 匯入失敗', () => {
  async function failWith(error: unknown) {
    vi.mocked(importArticleSources).mockRejectedValue(error)
    const w = await mountView()
    await pick(w, '新的筆記', '新增為草稿')
    await submitButton(w).trigger('click')
    await flushPromises()
    return w
  }

  it.each(['stale', 'conflict'])(
    '它應該在 409 %s 時說明整批沒寫入，並提供「重新整理清單」重新讀取',
    async (reason) => {
      const w = await failWith(new ApiRequestError(409, '/article-sources/import', 'POST', { reason }))

      const box = w.get('[data-test="submit-error"]')
      expect(box.text()).toContain('沒有任何文章被寫入')
      const refresh = box.findAll('button').find((b) => b.text() === '重新整理清單')!
      expect(refresh).toBeDefined()
      // 失敗後選擇還在，沒有被偷偷清掉
      expect(w.text()).toContain('已選 1 項')

      await refresh.trigger('click')
      await flushPromises()
      expect(fetchArticleSources).toHaveBeenCalledTimes(2)
      expect(w.find('[data-test="submit-error"]').exists()).toBe(false)
      expect(w.text()).toContain('已選 0 項')
    },
  )

  it.each([
    [503, 'not_configured', '尚未設定文章來源。'],
    [503, 'github_rate_limited', 'GitHub 的請求次數已達上限，請稍後再試。'],
    [503, 'post_scope_missing', '找不到 post 分類，無法新增文章。'],
    [502, 'github_unauthorized', 'GitHub token 無效或已過期。'],
    [502, 'github_not_found', '找不到來源 repo 或分支，或 token 沒有權限。'],
  ])('它應該把 %i %s 顯示成中文，而且不提供「重新整理清單」（重讀也不會好）', async (status, reason, text) => {
    const w = await failWith(new ApiRequestError(status, '/article-sources/import', 'POST', { reason }))

    const box = w.get('[data-test="submit-error"]')
    expect(box.text()).toBe(text)
    expect(box.text()).not.toContain(reason)
    expect(box.findAll('button')).toHaveLength(0)
  })

  it('它應該顯示 422 的欄位訊息', async () => {
    const w = await failWith(
      new ApiValidationError({ 'items.0.documentation_id': '要連結的文章不存在或已刪除。' }),
    )
    expect(w.get('[data-test="submit-error"]').text()).toBe('要連結的文章不存在或已刪除。')
  })

  it('它應該在失敗後允許再送出一次（不卡在送出中）', async () => {
    const w = await failWith(new TypeError('Failed to fetch'))
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
    expect(submitButton(w).text()).toBe('匯入 1 篇')
  })
})

describe('ArticleImportView 清單載入失敗', () => {
  it.each([
    [503, 'not_configured', '尚未設定文章來源。'],
    [502, 'github_forbidden', 'GitHub token 沒有讀取來源的權限。'],
    [502, 'github_tree_truncated', '來源的檔案太多，GitHub 只回傳了部分清單，所以不列出結果。'],
  ])('它應該把 %i %s 顯示成中文，並提供重新整理', async (status, reason, text) => {
    vi.mocked(fetchArticleSources).mockRejectedValue(new ApiHttpError(status, '/article-sources', 'GET', { reason }))
    vi.mocked(fetchArticles).mockResolvedValue(SITE_ARTICLES)
    const stub = { template: '<div />' }
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/articles/manage', name: 'article-manage', component: stub }] })
    const w = mount(ArticleImportView, { global: { plugins: [router] } })
    await flushPromises()

    const box = w.get('[data-test="load-error"]')
    expect(box.text()).toContain(text)
    expect(box.text()).not.toContain(reason)
    expect(w.find('li[data-status]').exists()).toBe(false)

    vi.mocked(fetchArticleSources).mockResolvedValue(listingOf([NEW_ITEM]))
    await box.get('button').trigger('click')
    await flushPromises()
    expect(w.findAll('li[data-status]')).toHaveLength(1)
  })
})
