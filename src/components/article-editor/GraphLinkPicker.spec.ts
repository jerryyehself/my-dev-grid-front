import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GraphLinkPicker from './GraphLinkPicker.vue'
import { fetchEntityOptions } from '@/api/ontology'

vi.mock('@/api/ontology', async (original) => ({
  ...await original<typeof import('@/api/ontology')>(),
  fetchRelationCandidateList: vi.fn().mockResolvedValue([
    { id: 1, name: 'documents', reverse_id: 2, subject: 1, object: 10 },
    { id: 2, name: 'documentedBy', reverse_id: 1, subject: 10, object: 1 },
    { id: 3, name: 'specs', reverse_id: 4, subject: 2, object: 10 },
    { id: 4, name: 'specifiedBy', reverse_id: 3, subject: 10, object: 2 },
    { id: 5, name: 'precedes', reverse_id: 5, subject: 1, object: 1 },
  ]),
  fetchScopeList: vi.fn().mockResolvedValue([
    { id: 1, parent_class: null }, { id: 2, parent_class: null },
    { id: 10, parent_class: null }, { id: 11, parent_class: 10 },
    { id: 20, parent_class: null },
  ]),
  fetchEntityOptions: vi.fn(),
}))

const button = (wrapper: ReturnType<typeof mount>, text: string) => wrapper.findAll('button').find((b) => b.text().replace(/\s+/g, ' ').trim() === text)!

beforeEach(() => {
  vi.mocked(fetchEntityOptions).mockReset().mockResolvedValue([
    { id: 8, title: 'Vue 3', scope: '1040 framework', scopeId: 11 },
    { id: 9, title: '其他技術', scope: null, scopeId: 20 },
  ])
})

afterEach(() => { vi.unstubAllGlobals() })

describe('GraphLinkPicker', () => {
  it('它應該在選取技術後只列出文章為主詞且符合兩端分類的述詞', async () => {
    const wrapper = mount(GraphLinkPicker, { props: { existingKeys: [], subjectScopeId: 1 } })
    await flushPromises()
    expect(button(wrapper, 'documentedBy')).toBeDefined()
    await wrapper.findAll('button').find((b) => b.text().startsWith('Vue 3'))!.trigger('click')
    expect(button(wrapper, 'documents')).toBeDefined()
    expect(button(wrapper, 'documentedBy')).toBeUndefined()
    expect(button(wrapper, 'specs')).toBeUndefined()
    await button(wrapper, 'documents').trigger('click')
    await button(wrapper, '建立關聯').trigger('click')
    expect(wrapper.emitted('create')?.[0]?.[0]).toMatchObject({ predicate: 'documents', reverse: 'documentedBy' })
    await wrapper.setProps({ subjectScopeId: 2 })
    expect(button(wrapper, '建立關聯').element.disabled).toBe(true)
    expect(button(wrapper, 'specs')).toBeDefined()
    await button(wrapper, 'specs').trigger('click')
    await button(wrapper, '其他技術').trigger('click')
    expect(button(wrapper, '建立關聯').element.disabled).toBe(true)
    wrapper.unmount()
  })
  it('它應該保留文章對文章的述詞選單', async () => {
    const wrapper = mount(GraphLinkPicker, { props: { existingKeys: [], presetFamily: 'documentation' } })
    await flushPromises()
    expect(button(wrapper, 'precedes')).toBeDefined()
    expect(button(wrapper, 'documents')).toBeUndefined()
    wrapper.unmount()
  })
  it('它應該在換族後丟棄晚回來的舊實體清單', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchEntityOptions>>) => void
    vi.mocked(fetchEntityOptions).mockImplementationOnce(() => new Promise((r) => { resolve = r }))
    const wrapper = mount(GraphLinkPicker, { props: { existingKeys: [], subjectScopeId: 1 } })
    await button(wrapper, 'IMPLEMENTATION 2000').trigger('click')
    await flushPromises()
    resolve([{ id: 99, title: '舊技術', scope: null }])
    await flushPromises()
    expect(wrapper.text()).not.toContain('舊技術')
    expect(wrapper.text()).toContain('Vue 3')
    wrapper.unmount()
  })
  it.each(['technique', 'implementation'] as const)('它應該讀取 %s API 的 type 分類外鍵，即使 scope 沒有載入', async (family) => {
    const actual = await vi.importActual<typeof import('@/api/ontology')>('@/api/ontology')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [
      { id: 8, type: 11, title: 'API 實體', scope: null },
    ] }) }))
    vi.mocked(fetchEntityOptions).mockImplementation(actual.fetchEntityOptions)
    const wrapper = mount(GraphLinkPicker, { props: { existingKeys: [], subjectScopeId: 1, presetFamily: family } })
    await flushPromises()
    await button(wrapper, 'API 實體').trigger('click')
    expect(button(wrapper, 'documents')).toBeDefined()
    expect(button(wrapper, 'documentedBy')).toBeUndefined()
    await button(wrapper, 'documents').trigger('click')
    await button(wrapper, '建立關聯').trigger('click')
    expect(wrapper.emitted('create')?.[0]?.[0]).toMatchObject({ entity: { scopeId: 11 } })
    wrapper.unmount()
  })

  describe('沒有任何述詞可用時', () => {
    const notice = (wrapper: ReturnType<typeof mount>) => wrapper.find('[role="status"]')
    const entity = (wrapper: ReturnType<typeof mount>, title: string) => wrapper.findAll('button').find((b) => b.text().startsWith(title))!

    it('它應該說明這個組合沒有適用的述詞，並建議換對象或改文章分類', async () => {
      const wrapper = mount(GraphLinkPicker, { props: { existingKeys: [], subjectScopeId: 1 } })
      await flushPromises()
      expect(notice(wrapper).exists()).toBe(false)
      await entity(wrapper, '其他技術').trigger('click')
      expect(button(wrapper, 'documents')).toBeUndefined()
      expect(notice(wrapper).text()).toBe(
        '沒有述詞適用這個組合：述詞限定了兩端的分類，「其他技術」跟這篇文章對不上。換一個對象，或改這篇文章的分類號。',
      )
      await entity(wrapper, 'Vue 3').trigger('click')
      expect(notice(wrapper).exists()).toBe(false)
      expect(button(wrapper, 'documents')).toBeDefined()
      wrapper.unmount()
    })
    it('它應該在文章還沒選分類號時請使用者先選分類號', async () => {
      const wrapper = mount(GraphLinkPicker, { props: { existingKeys: [] } })
      await flushPromises()
      await entity(wrapper, 'Vue 3').trigger('click')
      expect(notice(wrapper).text()).toBe('這篇文章還沒選分類號，判斷不出哪些述詞適用。先選好分類號再來挑。')
      wrapper.unmount()
    })
    it('它應該在對象沒有分類時說明原因而不是留白', async () => {
      vi.mocked(fetchEntityOptions).mockResolvedValue([{ id: 7, title: '無分類技術', scope: null }])
      const wrapper = mount(GraphLinkPicker, { props: { existingKeys: [], subjectScopeId: 1 } })
      await flushPromises()
      await entity(wrapper, '無分類技術').trigger('click')
      expect(notice(wrapper).text()).toBe('「無分類技術」沒有分類，判斷不出哪些述詞適用。換一個對象試試。')
      wrapper.unmount()
    })
  })
})
