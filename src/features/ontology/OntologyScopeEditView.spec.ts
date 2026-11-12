import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import OntologyScopeEditView from './OntologyScopeEditView.vue'
import { ApiValidationError } from '@/api/client'
import { createScope, fetchScope, fetchScopeList, updateScope } from '@/api/ontology'

vi.mock('@/api/ontology', async (original) => ({
  ...(await original<typeof import('@/api/ontology')>()),
  fetchScopeList: vi.fn(),
  fetchScope: vi.fn(),
  createScope: vi.fn(),
  updateScope: vi.fn(),
}))

const top = {
  id: 1,
  name: 'Documentation',
  class_number: '0',
  call_number: '00',
  parent_class: null,
  full_call_number: '000',
  comment: null,
  note: null,
}
const child = {
  ...top,
  id: 5,
  name: 'post',
  call_number: '30',
  parent_class: 1,
  comment: '文章',
  note: '舊註釋',
}

async function mountView(editing: boolean, detail?: typeof child) {
  vi.mocked(fetchScopeList).mockResolvedValue([top, child] as never)
  vi.mocked(fetchScope).mockResolvedValue(
    (editing ? (detail ?? child) : { ...top, new_child_call_number: null }) as never,
  )
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/ontology/scopes/new', name: 'ontology-scope-new', component: OntologyScopeEditView },
      {
        path: '/ontology/scopes/:id/edit',
        name: 'ontology-scope-edit',
        component: OntologyScopeEditView,
      },
      { path: '/ontology/scopes/:id', name: 'ontology-scope', component: { template: '<div />' } },
      { path: '/ontology/scopes', name: 'ontology-scopes', component: { template: '<div />' } },
    ],
  })
  await router.push(editing ? '/ontology/scopes/5/edit' : '/ontology/scopes/new')
  await router.isReady()
  const wrapper = mount(OntologyScopeEditView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

async function save(w: Wrapper) {
  await w
    .findAll('button')
    .find((b) => b.text() === '儲存')!
    .trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.mocked(createScope).mockReset()
  vi.mocked(updateScope).mockReset()
})

describe('OntologyScopeEditView 儲存失敗', () => {
  it('它應該在新增時 422 沒有任何欄位錯誤，顯示整頁錯誤並保留已輸入的內容', async () => {
    const { wrapper, router } = await mountView(false)
    vi.mocked(createScope).mockRejectedValue(new ApiValidationError({}))

    await wrapper.get('select').setValue(1)
    await flushPromises()
    const [callNumber, name] = wrapper.findAll('input')
    await callNumber!.setValue('40')
    await name!.setValue('新分類')
    const [comment, note] = wrapper.findAll('textarea')
    await comment!.setValue('說明')
    await note!.setValue('註釋')
    await save(wrapper)

    expect(createScope).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[role="alert"]').text()).toBe('輸入內容未通過驗證')
    expect((name!.element as HTMLInputElement).value).toBe('新分類')
    expect((comment!.element as HTMLTextAreaElement).value).toBe('說明')
    expect((note!.element as HTMLTextAreaElement).value).toBe('註釋')
    expect(router.currentRoute.value.name).toBe('ontology-scope-new')
  })

  it('它應該在編輯時 422 沒有任何欄位錯誤，顯示整頁錯誤並保留已輸入的內容', async () => {
    const { wrapper, router } = await mountView(true)
    vi.mocked(updateScope).mockRejectedValue(new ApiValidationError({}))

    const [, name] = wrapper.findAll('input')
    await name!.setValue('改過的名稱')
    await save(wrapper)

    expect(updateScope).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[role="alert"]').text()).toBe('輸入內容未通過驗證')
    expect((name!.element as HTMLInputElement).value).toBe('改過的名稱')
    expect(router.currentRoute.value.name).toBe('ontology-scope-edit')
  })

  it('它應該在 422 只有欄位錯誤時把訊息放在欄位上，不重複顯示整頁錯誤', async () => {
    const { wrapper } = await mountView(true)
    vi.mocked(updateScope).mockRejectedValue(new ApiValidationError({ name: '名稱已被使用' }))

    await save(wrapper)

    expect(wrapper.text()).toContain('名稱已被使用')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})

describe('OntologyScopeEditView 父類已被刪除', () => {
  // 清單裡沒有 id 9，就像後端軟刪除之後的 GET /scopes。
  const orphan = { ...child, parent_class: 9 }
  const saveButton = (w: Wrapper) => w.findAll('button').find((b) => b.text() === '儲存')!

  it('它應該在父類不在頂層清單時顯示 placeholder、已刪除的提示，並停用儲存鈕', async () => {
    const { wrapper } = await mountView(true, orphan)

    const select = wrapper.get('select').element as HTMLSelectElement
    expect(select.selectedIndex).toBe(0)
    expect(select.options[0]!.text).toBe('選一個頂層分類')
    expect(wrapper.text()).toContain('原本的父類已被刪除，請重新選擇')
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()

    await save(wrapper)
    expect(updateScope).not.toHaveBeenCalled()
  })

  it('它應該在重選頂層分類後啟用儲存鈕，並送出重選的 id', async () => {
    const { wrapper } = await mountView(true, orphan)

    await wrapper.get('select').setValue(1)
    expect(wrapper.text()).not.toContain('原本的父類已被刪除')
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    vi.mocked(updateScope).mockResolvedValue({ data: { id: 5 }, message: '' } as never)
    await save(wrapper)

    expect(updateScope).toHaveBeenCalledTimes(1)
    expect(vi.mocked(updateScope).mock.calls[0]![1]).toMatchObject({ parent_class: 1 })
  })

  it('它應該在父類仍在頂層清單時不顯示已刪除的提示', async () => {
    const { wrapper } = await mountView(true)

    expect(wrapper.text()).not.toContain('已被刪除')
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
  })
})
