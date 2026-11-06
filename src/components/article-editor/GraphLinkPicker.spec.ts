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

})
