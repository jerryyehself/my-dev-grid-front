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
  RENAMED_NEW_ITEM,
  RENAMED_OLD_ITEM,
  SITE_VERSION,
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

describe('ArticleImportView 改 slug 的檔案', () => {
  // 新 slug 的來源列與舊 slug 的 removed 列共用同一個 path；兩種排列都要正常（後端依 path 排序，同路徑的順序不固定）
  const orders: [string, typeof ALL_ITEMS][] = [
    ['新 slug 在前', [RENAMED_NEW_ITEM, RENAMED_OLD_ITEM]],
    ['舊 slug 在前', [RENAMED_OLD_ITEM, RENAMED_NEW_ITEM]],
  ]
  for (const [label, items] of orders) {
    it(`它應該在${label}時兩列都顯示、沒有重複 key 警告，而且預選的連結目標不被另一列蓋掉`, async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const w = await mountView(items)
        await showAll(w)

        expect(w.findAll('li[data-status]')).toHaveLength(2)
        expect(warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('Duplicate keys'))).toEqual([])

        await pick(w, '改了 slug 的筆記', '連結既有文章')
        const select = row(w, '改了 slug 的筆記').get('select').element as HTMLSelectElement
        expect(select.value).toBe('21')
      } finally {
        warn.mockRestore()
      }
    })
  }
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

  it('它應該在重新整理清單進行中停用送出，讀完之後選擇被清掉所以仍然停用', async () => {
    const w = await mountView()
    await pick(w, '新的筆記', '新增為草稿')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()

    let finish!: (value: ReturnType<typeof listingOf>) => void
    vi.mocked(fetchArticleSources).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    await w.findAll('button').find((b) => b.text() === '重新整理清單')!.trigger('click')

    // 讀取中：選擇還在、也沒有問題，但不能送出
    expect(w.text()).toContain('已選 1 項')
    expect(submitButton(w).attributes('disabled')).toBeDefined()
    await submitButton(w).trigger('click')
    expect(importArticleSources).not.toHaveBeenCalled()

    finish(listingOf(ALL_ITEMS))
    await flushPromises()
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
          expected_site_version: SITE_VERSION,
        },
      ],
    })
  })

  it('它應該在清單沒給 site_version 時擋住覆蓋、說明原因，也不呼叫後端', async () => {
    const noVersion = { ...CONFLICT_ITEM, site_version: null }
    const w = await mountView([noVersion])
    await pick(w, '兩邊都改過的筆記', '更新')
    await row(w, '兩邊都改過的筆記').get('[role="switch"]').trigger('click')

    expect(submitButton(w).attributes('disabled')).toBeDefined()
    expect(w.get('[data-test="problems"]').text()).toContain('缺少站上版本')
    await submitButton(w).trigger('click')
    expect(importArticleSources).not.toHaveBeenCalled()
  })

  it('它應該不替其他動作帶 expected_site_version', async () => {
    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    const w = await mountView()
    await pick(w, '新的筆記', '新增為草稿')
    await pick(w, '有更新的筆記', '更新')
    await submitButton(w).trigger('click')
    await flushPromises()

    const sent = vi.mocked(importArticleSources).mock.calls[0]![0]
    expect(sent.items).toHaveLength(2)
    for (const item of sent.items) expect(item).not.toHaveProperty('expected_site_version')
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

  it('它應該把連結的選單放在帶有「標題＋要連結的文章」文字的 label 裡，讓選單有無障礙名稱', async () => {
    const w = await mountView()
    await pick(w, '有警告的筆記', '連結既有文章')
    await pick(w, '新的筆記', '連結既有文章')

    for (const title of ['有警告的筆記', '新的筆記']) {
      const label = row(w, title).get('select').element.closest('label')
      expect(label).not.toBeNull()
      expect(label!.textContent).toContain(`「${title}」要連結的文章`)
    }
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
  it('它應該在匯入前就有 aria-live 區塊，成功後把「已匯入 N 篇」放進同一個區塊', async () => {
    vi.mocked(importArticleSources).mockResolvedValue({
      commit_sha: COMMIT,
      message: 'ok',
      data: [
        { key: 'new-note', action: 'create', documentation_id: 40, title: '新的筆記', published: false, warnings: [] },
        { key: 'changed-note', action: 'update', documentation_id: 12, title: '有更新的筆記', published: true, warnings: [] },
      ],
    })
    const w = await mountView()
    const live = w.get('[aria-live="polite"]')
    expect(live.text()).toBe('')

    await pick(w, '新的筆記', '新增為草稿')
    await pick(w, '有更新的筆記', '更新')
    await submitButton(w).trigger('click')
    await flushPromises()

    // 同一個元素，不是新插入的區塊
    expect(w.get('[aria-live="polite"]').element).toBe(live.element)
    expect(live.text()).toContain('已匯入 2 篇')
  })

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
    expect(result.get('[data-test="result-warnings"]').text()).toContain('第 7 行：email 地址')
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

  it('它應該在 409 的訊息裡帶上後端列出的各項原因（不重複），並維持提供「重新整理清單」', async () => {
    const w = await failWith(
      new ApiRequestError(409, '/article-sources/import', 'POST', {
        reason: 'conflict',
        errors: {
          'items.0.documentation_id': ['這篇文章已經連結到其他來源檔案。'],
          'items.1.documentation_id': ['這篇文章已經連結到其他來源檔案。'],
          'items.2.expected_blob_sha': '檔案內容跟清單上的不同。',
        },
      }),
    )
    const box = w.get('[data-test="submit-error"]')
    expect(box.get('p').text()).toBe(
      '站上的文章在清單產生之後有變動。這篇文章已經連結到其他來源檔案。檔案內容跟清單上的不同。沒有任何文章被寫入。請重新整理清單，再選一次。',
    )
    expect(box.findAll('button').map((b) => b.text())).toEqual(['重新整理清單'])
  })

  it('它應該在 409 說站上內容於清單載入後又改過時，用固定說明取代後端原文，並維持提供「重新整理清單」', async () => {
    const w = await failWith(
      new ApiRequestError(409, '/article-sources/import', 'POST', {
        reason: 'conflict',
        errors: {
          'items.0.expected_site_version': [
            '站上的標題、日期或內文在列出清單之後又改過，請重新整理清單，確認後再決定要不要覆蓋。',
          ],
        },
      }),
    )
    const box = w.get('[data-test="submit-error"]')
    expect(box.get('p').text()).toBe(
      '站上的標題、日期或內文在清單載入之後又改過。沒有任何文章被寫入。請重新整理清單，確認站上現在的內容後，再決定要不要覆蓋。',
    )
    expect(box.findAll('button').map((b) => b.text())).toEqual(['重新整理清單'])
  })

  it('它應該在覆蓋被 409 退回後擋下同一份選擇，重新整理清單後才能再送', async () => {
    vi.mocked(importArticleSources).mockRejectedValue(
      new ApiRequestError(409, '/article-sources/import', 'POST', {
        reason: 'conflict',
        errors: { 'items.0.expected_site_version': ['站上又改過。'] },
      }),
    )
    const w = await mountView()
    await pick(w, '兩邊都改過的筆記', '更新')
    await row(w, '兩邊都改過的筆記').get('[role="switch"]').trigger('click')
    await submitButton(w).trigger('click')
    await flushPromises()

    expect(w.get('[data-test="submit-error"]').text()).toContain('清單載入之後又改過')
    expect(submitButton(w).attributes('disabled')).toBeDefined()
    await submitButton(w).trigger('click')
    expect(importArticleSources).toHaveBeenCalledTimes(1)

    // 重新整理後清單帶新的 site_version；重新選、重新確認覆蓋，送出的是新版本
    const newer = 'e'.repeat(64)
    vi.mocked(fetchArticleSources).mockResolvedValue(listingOf([{ ...CONFLICT_ITEM, site_version: newer }]))
    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    await w.get('[data-test="submit-error"]').findAll('button')[0]!.trigger('click')
    await flushPromises()
    expect(w.find('[data-test="submit-error"]').exists()).toBe(false)
    await pick(w, '兩邊都改過的筆記', '更新')
    await row(w, '兩邊都改過的筆記').get('[role="switch"]').trigger('click')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importArticleSources).toHaveBeenCalledTimes(2)
    expect(vi.mocked(importArticleSources).mock.calls[1]![0].items[0]).toMatchObject({
      overwrite_site_edits: true,
      expected_site_version: newer,
    })
  })

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
    const box = w.get('[data-test="submit-error"]')
    expect(box.text()).toContain('要連結的文章不存在或已刪除。')
    expect(box.text()).toContain('沒有任何文章被寫入。')
    // 選擇本身有問題，要重新讀清單再選
    expect(box.findAll('button').map((b) => b.text())).toEqual(['重新整理清單'])
  })

  it.each([
    { name: '409', error: new ApiRequestError(409, '/article-sources/import', 'POST', { reason: 'stale' }) },
    { name: '422', error: new ApiValidationError({ 'items.0.documentation_id': '要連結的文章不存在或已刪除。' }) },
  ])('它應該在 $name 被退回後擋下同一份選擇，改選或重新整理清單才能再送', async ({ error }) => {
    const w = await failWith(error)
    expect(importArticleSources).toHaveBeenCalledTimes(1)
    expect(submitButton(w).attributes('disabled')).toBeDefined()
    await submitButton(w).trigger('click')
    expect(importArticleSources).toHaveBeenCalledTimes(1)

    // 改選一列：請求不同了，可以再送
    await pick(w, '有更新的筆記', '更新')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
    // 改回原本的選擇：又是被退回過的同一份，再次擋下
    await pick(w, '有更新的筆記', '不處理')
    expect(submitButton(w).attributes('disabled')).toBeDefined()

    // 重新整理清單：擋下的記錄清掉，原本那份選擇重新選了可以送
    await w.findAll('button').find((b) => b.text() === '重新整理清單')!.trigger('click')
    await flushPromises()
    await pick(w, '新的筆記', '新增為草稿')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
  })

  it('它應該在 503 限流（後端說了原因，確定沒寫入）後不擋同一份選擇，可以再送', async () => {
    const w = await failWith(
      new ApiRequestError(503, '/article-sources/import', 'POST', { reason: 'github_rate_limited' }),
    )
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
    expect(submitButton(w).text()).toBe('匯入 1 篇')
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importArticleSources).toHaveBeenCalledTimes(2)
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

const importCall = (n: number) => vi.mocked(importArticleSources).mock.calls[n]![0]
const refreshButtons = (w: VueWrapper, label: string) => w.findAll('button').filter((b) => b.text() === label)

describe('ArticleImportView 結果不明（斷線、5xx）', () => {
  const url = '/article-sources/import'
  const uncertainErrors = [
    { name: '連不上後端', error: () => new TypeError('Failed to fetch') },
    { name: '500', error: () => new ApiRequestError(500, url, 'POST') },
    { name: '504', error: () => new ApiRequestError(504, url, 'POST') },
    { name: '沒有原因的 502', error: () => new ApiRequestError(502, url, 'POST') },
    { name: '沒有原因的 503', error: () => new ApiRequestError(503, url, 'POST') },
  ]

  async function sendNew(error: unknown) {
    vi.mocked(importArticleSources).mockRejectedValue(error)
    const w = await mountView()
    await pick(w, '新的筆記', '新增為草稿')
    await submitButton(w).trigger('click')
    await flushPromises()
    return w
  }

  it.each(uncertainErrors)(
    '它應該在 $name 之後說不確定有沒有寫入（不說沒有寫入），主要動作是「重新整理清單並核對」',
    async ({ error }) => {
      const w = await sendNew(error())
      const box = w.get('[data-test="submit-error"]')
      expect(box.text()).toContain('不確定這批有沒有寫入')
      expect(box.text()).not.toContain('沒有任何文章被寫入')
      expect(box.findAll('button').map((b) => b.text())).toEqual(['重新整理清單並核對'])
    },
  )

  it.each(uncertainErrors)('它應該在 $name 之後鎖住整頁，核對之前不能再送，改選別的也一樣', async ({ error }) => {
    const w = await sendNew(error())
    expect(importArticleSources).toHaveBeenCalledTimes(1)
    expect(submitButton(w).attributes('disabled')).toBeDefined()
    await submitButton(w).trigger('click')
    expect(importArticleSources).toHaveBeenCalledTimes(1)

    // 改選另一列：請求不同，但看不出上一批有沒有寫入，一樣不能送
    await pick(w, '有更新的筆記', '更新')
    expect(w.text()).toContain('已選 2 項')
    expect(submitButton(w).attributes('disabled')).toBeDefined()
    await submitButton(w).trigger('click')
    expect(importArticleSources).toHaveBeenCalledTimes(1)
  })

  it('它應該在核對得出上一批已經寫入時，列出文章並說不用重送', async () => {
    const w = await sendNew(new TypeError('Failed to fetch'))
    vi.mocked(fetchArticleSources).mockResolvedValue(
      listingOf([{ ...NEW_ITEM, status: 'unchanged', documentation_id: 40, published: false }]),
    )
    await refreshButtons(w, '重新整理清單並核對')[0]!.trigger('click')
    await flushPromises()

    const box = w.get('[data-test="reconcile"]')
    expect(box.attributes('data-reconcile')).toBe('applied')
    expect(box.text()).toContain('上一批已經寫入 1 篇')
    expect(box.text()).toContain('不用重送')
    expect(box.get('a').attributes('href')).toBe('/articles/40/edit')
    expect(box.get('a').text()).toBe('新的筆記')
    // 核對完成後解除鎖定，錯誤訊息收掉；結論在 aria-live 區塊裡
    expect(w.find('[data-test="submit-error"]').exists()).toBe(false)
    expect(w.get('[aria-live="polite"]').text()).toContain('上一批已經寫入')
  })

  it('它應該在核對得出上一批看起來沒有寫入時說可以重新選擇（不下定論），並解除鎖定', async () => {
    const w = await sendNew(new ApiRequestError(500, url, 'POST'))
    await refreshButtons(w, '重新整理清單並核對')[0]!.trigger('click')
    await flushPromises()

    expect(fetchArticleSources).toHaveBeenCalledTimes(2)
    const box = w.get('[data-test="reconcile"]')
    expect(box.attributes('data-reconcile')).toBe('not_applied')
    expect(box.text()).toContain('上一批看起來沒有寫入')
    expect(box.text()).not.toMatch(/上一批沒有寫入/)
    expect(box.text()).toContain('清單上的狀態跟送出前一樣')

    await pick(w, '新的筆記', '新增為草稿')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importArticleSources).toHaveBeenCalledTimes(2)
  })

  it('它應該在核對看不出來時說明，並仍然解除鎖定', async () => {
    const w = await sendNew(new TypeError('Failed to fetch'))
    vi.mocked(fetchArticleSources).mockResolvedValue(listingOf([{ ...NEW_ITEM, blob_sha: 'f'.repeat(40) }]))
    await refreshButtons(w, '重新整理清單並核對')[0]!.trigger('click')
    await flushPromises()

    const box = w.get('[data-test="reconcile"]')
    expect(box.attributes('data-reconcile')).toBe('unknown')
    expect(box.text()).toContain('看不出上一批有沒有寫入')
    await pick(w, '新的筆記', '新增為草稿')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
  })

  it('它應該讓上方的「重新整理清單」也先核對，不能繞過鎖定', async () => {
    const w = await sendNew(new TypeError('Failed to fetch'))
    await refreshButtons(w, '重新整理清單')[0]!.trigger('click')
    await flushPromises()
    expect(w.get('[data-test="reconcile"]').attributes('data-reconcile')).toBe('not_applied')
  })

  it('它應該在核對時讀清單失敗的話繼續鎖住，下次讀成功才核對', async () => {
    const w = await sendNew(new TypeError('Failed to fetch'))
    vi.mocked(fetchArticleSources).mockRejectedValueOnce(new ApiHttpError(503, '/article-sources', 'GET', { reason: 'not_configured' }))
    await refreshButtons(w, '重新整理清單並核對')[0]!.trigger('click')
    await flushPromises()

    expect(w.get('[data-test="load-error"]').text()).toContain('清單載入失敗')
    expect(w.get('[data-test="pending-note"]').text()).toContain('還沒核對')
    expect(w.find('[data-test="reconcile"]').exists()).toBe(false)

    // 讀回來之後才核對、才解鎖（清單讀失敗期間沒有送出鍵，重讀成功後再看）
    await w.get('[data-test="load-error"]').get('button').trigger('click')
    await flushPromises()
    expect(w.get('[data-test="reconcile"]').attributes('data-reconcile')).toBe('not_applied')
    await pick(w, '新的筆記', '新增為草稿')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
  })

  it('它應該只把結果不明的失敗鎖住：有說原因的 503 與 409 不鎖', async () => {
    for (const error of [
      new ApiRequestError(503, url, 'POST', { reason: 'github_unreachable' }),
      new ApiRequestError(409, url, 'POST', { reason: 'conflict' }),
    ]) {
      vi.mocked(importArticleSources).mockReset()
      vi.mocked(importArticleSources).mockRejectedValue(error)
      const w = await mountView()
      await pick(w, '新的筆記', '新增為草稿')
      await submitButton(w).trigger('click')
      await flushPromises()
      await pick(w, '有更新的筆記', '更新') // 換一份請求
      expect(submitButton(w).attributes('disabled')).toBeUndefined()
    }
  })

  it('它應該在列清單連不上時照舊說連不上後端 API，不當成結果不明', async () => {
    vi.mocked(fetchArticleSources).mockRejectedValue(new TypeError('Failed to fetch'))
    vi.mocked(fetchArticles).mockResolvedValue(SITE_ARTICLES)
    const stub = { template: '<div />' }
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/articles/manage', name: 'article-manage', component: stub }] })
    const w = mount(ArticleImportView, { global: { plugins: [router] } })
    await flushPromises()
    expect(w.get('[data-test="load-error"]').text()).toContain('連不上後端 API')
    expect(w.get('[data-test="load-error"]').text()).not.toContain('不確定')
  })
})

describe('ArticleImportView 判斷不出來源版本新舊（409 unverified_commits）', () => {
  const url = '/article-sources/import'
  const SHA_A = 'a'.repeat(40)
  const SHA_B = 'b'.repeat(40)
  const unverified409 = (...commits: { index: number; commit_sha: string }[]) =>
    new ApiRequestError(409, url, 'POST', {
      reason: 'conflict',
      errors: Object.fromEntries(
        commits.map((c) => [`items.${c.index}.confirm_unverified_base`, ['無法確認這個版本是否比站上上次匯入的新。']]),
      ),
      unverified_commits: commits,
    } as never)
  const confirmSwitch = (w: VueWrapper, title: string) =>
    row(w, title)
      .findAll('[role="switch"]')
      .find((b) => b.text() === '仍要用這一版更新')

  it('它應該列出無法確認的項目，確認前不能送，確認後只替那些項目帶回 commit_sha', async () => {
    // 請求項目的順序跟清單一樣：新的筆記 (0)、有更新的筆記 (1)
    vi.mocked(importArticleSources).mockRejectedValueOnce(unverified409({ index: 1, commit_sha: SHA_A }))
    const w = await mountView()
    await pick(w, '新的筆記', '新增為草稿')
    await pick(w, '有更新的筆記', '更新')
    expect(confirmSwitch(w, '有更新的筆記')).toBeUndefined() // 還沒被後端要求確認
    await submitButton(w).trigger('click')
    await flushPromises()

    const box = w.get('[data-test="submit-error"]')
    expect(box.text()).toContain('無法確認來源這一版是否比站上上次匯入的新')
    expect(box.text()).toContain('沒有任何文章被寫入')
    expect(box.get('[data-test="unverified-list"]').text()).toBe('有更新的筆記')
    expect(box.findAll('button').map((b) => b.text())).toEqual(['重新整理清單'])
    // 只有被列出的那一列出現確認開關與說明
    expect(confirmSwitch(w, '有更新的筆記')).toBeDefined()
    expect(row(w, '有更新的筆記').find('[data-test="unverified-note"]').exists()).toBe(true)
    expect(row(w, '新的筆記').find('[data-test="unverified-note"]').exists()).toBe(false)
    expect(confirmSwitch(w, '新的筆記')).toBeUndefined()
    // 沒確認前擋下
    expect(submitButton(w).attributes('disabled')).toBeDefined()
    expect(w.get('[data-test="problems"]').text()).toContain('「有更新的筆記」無法確認來源這一版是否比站上的新')
    await submitButton(w).trigger('click')
    expect(importArticleSources).toHaveBeenCalledTimes(1)

    await confirmSwitch(w, '有更新的筆記')!.trigger('click')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    await submitButton(w).trigger('click')
    await flushPromises()

    expect(importArticleSources).toHaveBeenCalledTimes(2)
    const items = importCall(1).items
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ key: 'new-note', expected_blob_sha: NEW_ITEM.blob_sha, action: 'create' })
    expect(items[1]).toMatchObject({ key: 'changed-note', action: 'update', confirm_unverified_base: SHA_A })
    expect(w.find('[data-test="unverified-list"]').exists()).toBe(false)
  })

  it('它應該在第一次送出時一律不帶 confirm_unverified_base', async () => {
    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    const w = await mountView()
    await pick(w, '有更新的筆記', '更新')
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importCall(0).items[0]).not.toHaveProperty('confirm_unverified_base')
  })

  it('它應該處理兩輪：先確認來源版本，再換成覆蓋站上修改的提示', async () => {
    // 第一輪：判斷不出新舊，覆蓋與站上版本的檢查要等確認之後才輪到
    vi.mocked(importArticleSources).mockRejectedValueOnce(unverified409({ index: 0, commit_sha: SHA_A }))
    const w = await mountView([CONFLICT_ITEM])
    await pick(w, '兩邊都改過的筆記', '更新')
    await row(w, '兩邊都改過的筆記').get('[role="switch"]').trigger('click') // 覆蓋站上的修改
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(w.get('[data-test="submit-error"]').text()).toContain('無法確認來源這一版')
    expect(importCall(0).items[0]).not.toHaveProperty('confirm_unverified_base')

    // 第二輪：確認後再送，三個值都帶；這次後端說站上內容在清單之後又改過
    vi.mocked(importArticleSources).mockRejectedValueOnce(
      new ApiRequestError(409, url, 'POST', {
        reason: 'conflict',
        errors: { 'items.0.expected_site_version': ['站上又改過。'] },
      }),
    )
    await confirmSwitch(w, '兩邊都改過的筆記')!.trigger('click')
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importCall(1).items[0]).toMatchObject({
      action: 'update',
      overwrite_site_edits: true,
      expected_site_version: SITE_VERSION,
      confirm_unverified_base: SHA_A,
    })
    const box = w.get('[data-test="submit-error"]')
    expect(box.text()).toContain('站上的標題、日期或內文在清單載入之後又改過')
    expect(box.text()).not.toContain('無法確認來源這一版')
    // 同一份請求不能原樣再送
    expect(submitButton(w).attributes('disabled')).toBeDefined()

    // 重新整理後清單帶新的站上版本，確認與覆蓋都要重來，這次後端接受
    const newer = 'e'.repeat(64)
    vi.mocked(fetchArticleSources).mockResolvedValue(listingOf([{ ...CONFLICT_ITEM, site_version: newer }]))
    await box.findAll('button')[0]!.trigger('click')
    await flushPromises()
    expect(confirmSwitch(w, '兩邊都改過的筆記')).toBeUndefined()
    await pick(w, '兩邊都改過的筆記', '更新')
    await row(w, '兩邊都改過的筆記').get('[role="switch"]').trigger('click')
    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importArticleSources).toHaveBeenCalledTimes(3)
    expect(importCall(2).items[0]).toMatchObject({ overwrite_site_edits: true, expected_site_version: newer })
    expect(importCall(2).items[0]).not.toHaveProperty('confirm_unverified_base')
  })

  it('它應該在同一項又判斷不出新舊、又站上內容改過時只給重新整理清單，不開放確認', async () => {
    vi.mocked(importArticleSources).mockRejectedValueOnce(
      new ApiRequestError(409, url, 'POST', {
        reason: 'conflict',
        errors: {
          'items.0.confirm_unverified_base': ['無法確認。'],
          'items.0.expected_site_version': ['站上又改過。'],
        },
        unverified_commits: [{ index: 0, commit_sha: SHA_A }],
      } as never),
    )
    const w = await mountView([CONFLICT_ITEM])
    await pick(w, '兩邊都改過的筆記', '更新')
    await row(w, '兩邊都改過的筆記').get('[role="switch"]').trigger('click') // 覆蓋站上的修改
    await submitButton(w).trigger('click')
    await flushPromises()

    const box = w.get('[data-test="submit-error"]')
    expect(box.text()).toContain('站上的標題、日期或內文在清單載入之後又改過')
    expect(box.text()).toContain('請重新整理清單')
    expect(box.text()).not.toContain('請確認要用這一版更新')
    expect(box.find('[data-test="unverified-list"]').exists()).toBe(false)
    // 那一列只提醒重新整理，沒有確認開關，也不是「確認後會用這一版更新」的說明
    const r = row(w, '兩邊都改過的筆記')
    expect(r.find('[data-test="refresh-only-note"]').text()).toContain('請先重新整理清單')
    expect(r.find('[data-test="unverified-note"]').exists()).toBe(false)
    expect(confirmSwitch(w, '兩邊都改過的筆記')).toBeUndefined()
    // 同一份請求不能原樣再送
    expect(submitButton(w).attributes('disabled')).toBeDefined()

    // 重新整理之後提醒收掉
    await box.findAll('button')[0]!.trigger('click')
    await flushPromises()
    expect(w.find('[data-test="refresh-only-note"]').exists()).toBe(false)
  })

  it('它應該在兩輪都成功時送出三個值並顯示結果', async () => {
    vi.mocked(importArticleSources).mockRejectedValueOnce(unverified409({ index: 0, commit_sha: SHA_A }))
    const w = await mountView([CONFLICT_ITEM])
    await pick(w, '兩邊都改過的筆記', '更新')
    await row(w, '兩邊都改過的筆記').get('[role="switch"]').trigger('click')
    await submitButton(w).trigger('click')
    await flushPromises()

    vi.mocked(importArticleSources).mockResolvedValue({
      commit_sha: COMMIT,
      message: 'ok',
      data: [{ key: 'conflict-note', action: 'update', documentation_id: 13, title: '兩邊都改過的筆記', published: false, warnings: [] }],
    })
    await confirmSwitch(w, '兩邊都改過的筆記')!.trigger('click')
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importCall(1).items[0]).toMatchObject({
      overwrite_site_edits: true,
      expected_site_version: SITE_VERSION,
      confirm_unverified_base: SHA_A,
    })
    expect(w.get('[data-test="result"]').text()).toContain('已匯入 1 篇')
  })

  it('它應該在確認的版本又換了（後端回新的 commit_sha）時關掉確認，重新要求確認，帶新的值', async () => {
    vi.mocked(importArticleSources).mockRejectedValueOnce(unverified409({ index: 0, commit_sha: SHA_A }))
    const w = await mountView([CHANGED_ITEM])
    await pick(w, '有更新的筆記', '更新')
    await submitButton(w).trigger('click')
    await flushPromises()

    vi.mocked(importArticleSources).mockRejectedValueOnce(unverified409({ index: 0, commit_sha: SHA_B }))
    await confirmSwitch(w, '有更新的筆記')!.trigger('click')
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importCall(1).items[0]!.confirm_unverified_base).toBe(SHA_A)
    // 站上又被匯入了別的版本：之前的確認不算，開關回到關閉
    expect(confirmSwitch(w, '有更新的筆記')!.attributes('aria-checked')).toBe('false')
    expect(submitButton(w).attributes('disabled')).toBeDefined()

    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    await confirmSwitch(w, '有更新的筆記')!.trigger('click')
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importCall(2).items[0]!.confirm_unverified_base).toBe(SHA_B)
  })

  it('它應該在改成不處理時不再要求確認，改回更新時又要確認', async () => {
    vi.mocked(importArticleSources).mockRejectedValueOnce(unverified409({ index: 0, commit_sha: SHA_A }))
    const w = await mountView([NEW_ITEM, CHANGED_ITEM])
    await pick(w, '有更新的筆記', '更新')
    await submitButton(w).trigger('click')
    await flushPromises()

    await pick(w, '有更新的筆記', '不處理')
    expect(confirmSwitch(w, '有更新的筆記')).toBeUndefined()
    await pick(w, '新的筆記', '新增為草稿')
    expect(submitButton(w).attributes('disabled')).toBeUndefined()
    await pick(w, '有更新的筆記', '更新')
    expect(submitButton(w).attributes('disabled')).toBeDefined()
  })

  it('它應該在重新整理清單後清掉要確認的標記與確認', async () => {
    vi.mocked(importArticleSources).mockRejectedValueOnce(unverified409({ index: 0, commit_sha: SHA_A }))
    const w = await mountView([CHANGED_ITEM])
    await pick(w, '有更新的筆記', '更新')
    await submitButton(w).trigger('click')
    await flushPromises()
    await confirmSwitch(w, '有更新的筆記')!.trigger('click')

    await refreshButtons(w, '重新整理清單')[0]!.trigger('click')
    await flushPromises()
    expect(w.find('[data-test="unverified-note"]').exists()).toBe(false)
    expect(w.find('[data-test="unverified-list"]').exists()).toBe(false)
    vi.mocked(importArticleSources).mockResolvedValue({ commit_sha: COMMIT, message: 'ok', data: [] })
    await pick(w, '有更新的筆記', '更新')
    await submitButton(w).trigger('click')
    await flushPromises()
    expect(importCall(1).items[0]).not.toHaveProperty('confirm_unverified_base')
  })

  it.each([
    { label: '索引超出請求項目的範圍', commits: [{ index: 5, commit_sha: SHA_A }] },
    { label: 'commit_sha 格式不對', commits: [{ index: 0, commit_sha: 'abc' }] },
    { label: '沒有 unverified_commits', commits: undefined },
  ])('它應該在 $label 時不開放確認，只能重新整理清單', async ({ commits }) => {
    vi.mocked(importArticleSources).mockRejectedValue(
      new ApiRequestError(409, url, 'POST', {
        reason: 'conflict',
        errors: { 'items.0.confirm_unverified_base': ['無法確認。'] },
        unverified_commits: commits,
      } as never),
    )
    const w = await mountView([CHANGED_ITEM])
    await pick(w, '有更新的筆記', '更新')
    await submitButton(w).trigger('click')
    await flushPromises()

    expect(confirmSwitch(w, '有更新的筆記')).toBeUndefined()
    expect(w.find('[data-test="unverified-note"]').exists()).toBe(false)
    expect(w.get('[data-test="submit-error"]').text()).toContain('沒有任何文章被寫入')
    // 同一份請求被退回，不能原樣再送
    expect(submitButton(w).attributes('disabled')).toBeDefined()
    await submitButton(w).trigger('click')
    expect(importArticleSources).toHaveBeenCalledTimes(1)
  })
})
