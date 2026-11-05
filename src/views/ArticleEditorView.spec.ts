import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ArticleEditorView from './ArticleEditorView.vue'
import { ApiValidationError, apiPut } from '@/api/client'
import { updateArticle } from '@/api/articles'

vi.mock('@/api/articles', () => ({
  fetchArticle: vi.fn().mockResolvedValue({
    id: 1, title: '文章', body: '內文', status: 0, scope: { full_call_number: '0030' },
    techniques: [{ id: 8, title: '技術一', relation_id: 1 }, { id: 9, title: '技術二', relation_id: 1 }],
    implementations: [{ id: 10, title: '實作一', relation_id: 1 }],
  }),
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
  vi.mocked(updateArticle).mockReset()
})

afterEach(() => { vi.unstubAllGlobals() })

describe('ArticleEditorView', () => {
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

})
