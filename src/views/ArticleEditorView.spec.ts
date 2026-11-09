import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ArticleEditorView from './ArticleEditorView.vue'
import { ApiValidationError, apiPut } from '@/api/client'
import { fetchArticle, updateArticle } from '@/api/articles'

const defaultArticle = vi.hoisted(() => ({
  id: 1, type: 3, title: '文章', body: '內文', status: 0,
  creation_date: null, created_at: null, updated_at: null,
  scope: { id: 3, name: 'post', full_call_number: '0030' },
  techniques: [{ id: 8, title: '技術一', relation_id: 1 }, { id: 9, title: '技術二', relation_id: 1 }],
  implementations: [{ id: 10, title: '實作一', relation_id: 1 }],
}))

vi.mock('@/api/articles', () => ({
  fetchArticle: vi.fn().mockResolvedValue(defaultArticle),
  updateArticle: vi.fn(), createArticle: vi.fn(),
}))
vi.mock('@/api/ontology', async (original) => ({
  ...await original<typeof import('@/api/ontology')>(),
  fetchRelations: vi.fn().mockResolvedValue([{ id: 1, name: 'documents', reverse_id: 2 }, { id: 2, name: 'documentedBy', reverse_id: 1 }]),
  fetchScopes: vi.fn().mockResolvedValue([{ id: 3, name: 'post', full_call_number: '0030' }]),
  fetchTechniqueOptions: vi.fn().mockResolvedValue([]),
}))

async function mountView() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/articles/:id/edit', name: 'article-editor', component: ArticleEditorView },
    { path: '/articles/:id', name: 'article-detail', component: { template: '<div />' } },
  ] })
  await router.push('/articles/1/edit')
  await router.isReady()
  const wrapper = mount(ArticleEditorView, { global: { plugins: [router], stubs: { MarkdownBody: true, GraphLinkPicker: {
    emits: ['create'],
    template: `<button @click="$emit('create', { family: 'technique', entity: { id: 11, title: '技術三', scope: null }, predicate: 'documents', reverse: 'documentedBy' })">建立測試連結</button>`,
  } } } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(fetchArticle).mockReset().mockResolvedValue(defaultArticle)
  vi.mocked(updateArticle).mockReset()
})

afterEach(() => { vi.unstubAllGlobals() })

describe('ArticleEditorView', () => {
  it('它應該只採用最後選取且完成讀取的檔案', async () => {
    const readers: TestFileReader[] = []
    class TestFileReader {
      result: string | ArrayBuffer | null = null
      onload: (() => void) | null = null
      constructor() { readers.push(this) }
      readAsText() {}
    }
    vi.stubGlobal('FileReader', TestFileReader)
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    const wrapper = await mountView()
    const input = wrapper.get('input[type="file"]')
    const selectFile = async (name: string) => {
      Object.defineProperty(input.element, 'files', { value: [new File([''], name)], configurable: true })
      await input.trigger('change')
    }
    await selectFile('A.md')
    await selectFile('B.md')
    readers[1]!.result = 'B 的內容'
    readers[1]!.onload!()
    readers[0]!.result = 'A 的內容'
    readers[0]!.onload!()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('textarea').element.value).toBe('B 的內容')
    wrapper.unmount()
  })

  it('它應該在讀檔期間手動編輯後再次確認，取消時保留手動內容', async () => {
    const readers: TestFileReader[] = []
    class TestFileReader {
      result: string | ArrayBuffer | null = null
      onload: (() => void) | null = null
      constructor() { readers.push(this) }
      readAsText() {}
    }
    vi.stubGlobal('FileReader', TestFileReader)
    const confirm = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false)
    vi.stubGlobal('confirm', confirm)
    const wrapper = await mountView()
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File([''], 'A.md')], configurable: true })
    await input.trigger('change')
    await wrapper.get('textarea').setValue('手動內容')
    const reader = readers[0]!
    reader.result = 'A 的內容'
    reader.onload!()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('textarea').element.value).toBe('手動內容')
    expect(confirm).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('它應該在讀檔期間手動編輯後再次確認，確認時採用檔案內容', async () => {
    const readers: TestFileReader[] = []
    class TestFileReader {
      result: string | ArrayBuffer | null = null
      onload: (() => void) | null = null
      constructor() { readers.push(this) }
      readAsText() {}
    }
    vi.stubGlobal('FileReader', TestFileReader)
    const confirm = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirm)
    const wrapper = await mountView()
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File([''], 'A.md')], configurable: true })
    await input.trigger('change')
    await wrapper.get('textarea').setValue('手動內容')
    const reader = readers[0]!
    reader.result = 'A 的內容'
    reader.onload!()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('textarea').element.value).toBe('A 的內容')
    expect(confirm).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('它應該在述詞不存在時阻止送出並提示刪除連結，刪除後可以儲存', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      ...defaultArticle,
      techniques: [{ id: 8, title: '失效技術', relation_id: 999 }],
      implementations: [],
    })
    vi.mocked(updateArticle).mockResolvedValue({ data: { id: 1 } } as never)
    const wrapper = await mountView()
    await wrapper.get('textarea').setValue('更新後的內文')
    await wrapper.findAll('button').find((b) => b.text() === '存草稿')!.trigger('click')
    await flushPromises()
    const removeButton = wrapper.get('button[aria-label="移除跟 失效技術 的關聯"]')
    const row = removeButton.element.parentElement!.parentElement!
    expect(updateArticle).not.toHaveBeenCalled()
    expect(row.textContent).toContain('找不到這條連結的述詞，請刪除後重新建立')
    await removeButton.trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === '存草稿')!.trigger('click')
    await flushPromises()
    expect(updateArticle).toHaveBeenCalledTimes(1)
    expect(vi.mocked(updateArticle).mock.calls[0]?.[1]).toMatchObject({ techniques: [] })
    wrapper.unmount()
  })

  it('它應該將 422 的第二筆技術與第一筆實作錯誤放在各自連結旁並保留其他欄位錯誤', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 422, ok: false, json: async () => ({
      errors: { 'techniques.1.relation_id': ['技術述詞不符'], 'implementations.0.relation_id': ['實作述詞不符'], title: ['標題錯誤'] },
    }) }))
    vi.mocked(updateArticle).mockImplementation((id, payload) => apiPut(`/documentations/${id}`, payload))
    const wrapper = await mountView()
    await wrapper.findAll('button').find((b) => b.text() === '存草稿')!.trigger('click')
    await flushPromises()
    const row = (name: string) => wrapper.get(`button[aria-label="移除跟 ${name} 的關聯"]`).element.parentElement!.parentElement!
    expect(row('技術一').textContent).not.toContain('技術述詞不符')
    expect(row('技術二').textContent).toContain('技術述詞不符')
    expect(row('實作一').textContent).toContain('實作述詞不符')
    expect(wrapper.text()).toContain('標題錯誤')
    expect(vi.mocked(updateArticle).mock.calls[0]?.[1]).toMatchObject({ techniques: [{ id: 8, relation_id: 1 }, { id: 9, relation_id: 1 }] })
    await wrapper.get('button[aria-label="移除跟 技術一 的關聯"]').trigger('click')
    expect(row('技術二').textContent).toContain('技術述詞不符')
    wrapper.unmount()
  })
  it('它應該將一般儲存失敗照原方式顯示', async () => {
    vi.mocked(updateArticle).mockRejectedValue(new Error('連線失敗'))
    const wrapper = await mountView()
    await wrapper.findAll('button').find((b) => b.text() === '存草稿')!.trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('連線失敗')
    wrapper.unmount()
  })
  it('它應該依各族 payload 索引對應交錯新增的連結，且刪除後不錯置訊息', async () => {
    vi.mocked(updateArticle).mockRejectedValue(new ApiValidationError({ 'techniques.2.relation_id': '新增技術不符' }))
    const wrapper = await mountView()
    await wrapper.findAll('button').find((b) => b.text() === '新增關聯')!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === '建立測試連結')!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === '存草稿')!.trigger('click')
    await flushPromises()
    const row = (name: string) => wrapper.get(`button[aria-label="移除跟 ${name} 的關聯"]`).element.parentElement!.parentElement!
    expect(row('技術三').textContent).toContain('新增技術不符')
    expect(row('實作一').textContent).not.toContain('新增技術不符')
    await wrapper.get('button[aria-label="移除跟 技術一 的關聯"]').trigger('click')
    expect(row('技術三').textContent).toContain('新增技術不符')
    wrapper.unmount()
  })
  it('它應該不顯示 422 訊息裡的內部欄位名，對不上位置的欄位改放整頁訊息', async () => {
    vi.mocked(updateArticle).mockRejectedValue(new ApiValidationError({
      'techniques.1.relation_id': 'techniques.1：關係「documents」的主詞端必須屬於分類「post」，但這筆資料的分類是「framework」。',
      'implementations.0.relation_id': 'The selected implementations.0.relation id is invalid.',
      title: ' title 必填',
      type: 'The selected type is invalid.',
      'techniques.0.id': 'The selected techniques.0.id is invalid.',
      status: 'status 格式錯誤',
    }))
    const wrapper = await mountView()
    await wrapper.findAll('button').find((b) => b.text() === '存草稿')!.trigger('click')
    await flushPromises()
    const row = (name: string) => wrapper.get(`button[aria-label="移除跟 ${name} 的關聯"]`).element.parentElement!.parentElement!
    expect(row('技術二').textContent).toContain('關係「documents」的主詞端必須屬於分類「post」')
    expect(row('實作一').textContent).toContain('這個述詞不能用在這兩端的分類，請換一個述詞，或移除這條關聯。')
    expect(wrapper.text()).toContain('標題 必填')
    expect(wrapper.text()).toContain('分類號沒有通過檢查，請修正後再儲存。；這條關聯連到的對象已經找不到，請移除這條關聯後重新加入。；有欄位沒通過檢查，請確認內容後再儲存。')
    expect(wrapper.text()).not.toMatch(/(techniques|implementations)\.\d|relation id|title 必填|status 格式/i)
    wrapper.unmount()
  })
})
