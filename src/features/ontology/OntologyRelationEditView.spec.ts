import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import OntologyRelationEditView from './OntologyRelationEditView.vue'
import { ApiValidationError } from '@/api/client'
import {
  createRelation,
  fetchRelation,
  fetchRelationCandidateList,
  fetchScopeList,
  updateRelation,
  type RelationCandidateDto,
  type RelationDetailDto,
} from '@/api/ontology'

vi.mock('@/api/ontology', async (original) => ({
  ...(await original<typeof import('@/api/ontology')>()),
  fetchScopeList: vi.fn(),
  fetchRelationCandidateList: vi.fn(),
  fetchRelation: vi.fn(),
  createRelation: vi.fn(),
  updateRelation: vi.fn(),
}))

// 兩個頂層分類：Documentation（0 族）與 Technique（1 族）。
const DOC = 1
const TECH = 2
const scopes = [
  { id: DOC, name: 'Documentation', full_call_number: '0000', parent_class: null },
  { id: TECH, name: 'Technique', full_call_number: '1000', parent_class: null },
]

function rel(
  id: number,
  name: string,
  subject: number,
  object: number,
  reverseId: number | null,
): RelationCandidateDto {
  return { id, name, subject, object, reverse_id: reverseId }
}

function detailOf(r: RelationCandidateDto): RelationDetailDto {
  return {
    ...r,
    class_number: '00',
    call_number: '10',
    note: '',
    reverse: null,
    is_referenced: false,
    referenced_via: null,
    locked_fields: [],
    own_edges_count: 0,
    reverse_edges_count: 0,
  } as unknown as RelationDetailDto
}

/** 載入清單後掛載編輯頁；`editing` 為 null 時是新增頁。 */
async function mountView(all: RelationCandidateDto[], editing: RelationCandidateDto | null) {
  vi.mocked(fetchScopeList).mockResolvedValue(scopes as never)
  vi.mocked(fetchRelationCandidateList).mockResolvedValue(all)
  if (editing) vi.mocked(fetchRelation).mockResolvedValue(detailOf(editing))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/ontology/relations/new',
        name: 'ontology-relation-new',
        component: OntologyRelationEditView,
      },
      {
        path: '/ontology/relations/:id/edit',
        name: 'ontology-relation-edit',
        component: OntologyRelationEditView,
      },
      { path: '/ontology/relations/:id', name: 'ontology-relation', component: { template: '<div />' } },
      { path: '/ontology/scopes', name: 'ontology-scopes', component: { template: '<div />' } },
    ],
  })
  await router.push(editing ? `/ontology/relations/${editing.id}/edit` : '/ontology/relations/new')
  await router.isReady()
  const wrapper = mount(OntologyRelationEditView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

const saveButton = (w: Wrapper) => w.findAll('button').find((b) => b.text() === '儲存')!
const reverseCheckbox = (w: Wrapper) => w.get('input[type="checkbox"]')
/** 第三個 select 才是反向對象（前兩個是主詞、受詞）。 */
const reverseSelect = (w: Wrapper) => w.findAll('select')[2]

async function save(w: Wrapper) {
  await saveButton(w).trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.mocked(updateRelation).mockReset().mockResolvedValue({ data: { id: 1 }, message: '' } as never)
  vi.mocked(createRelation).mockReset().mockResolvedValue({ data: { id: 99 }, message: '' } as never)
})

describe('OntologyRelationEditView 反向關係', () => {
  it('它應該在同型別的兩條述詞互為反向時，只改註釋也保留原本的配對', async () => {
    // Technique→Technique 的 A、B 互指，不是對稱關係。
    const a = rel(10, '先於', TECH, TECH, 11)
    const b = rel(11, '後於', TECH, TECH, 10)
    const { wrapper } = await mountView([a, b], a)

    await wrapper.get('textarea').setValue('只改註釋')
    await save(wrapper)

    expect(updateRelation).toHaveBeenCalledTimes(1)
    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({
      note: '只改註釋',
      reverse_id: 11,
    })
  })

  it('它應該在同型別的對稱述詞（反向是自己）只改註釋時保留指向自己', async () => {
    const a = rel(10, '伴隨', TECH, TECH, 10)
    const { wrapper } = await mountView([a], a)

    await wrapper.get('textarea').setValue('只改註釋')
    await save(wrapper)

    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: 10 })
  })

  it('它應該在主詞受詞不同、有多個候選時，只改註釋也保留原本的配對', async () => {
    // 編輯 1（Doc→Tech），它的反向是 3；2 是另一條還沒配對的候選。
    const a = rel(1, 'documents', DOC, TECH, 3)
    const b = rel(2, 'explains', TECH, DOC, null)
    const c = rel(3, 'documentedBy', TECH, DOC, 1)
    const { wrapper } = await mountView([a, b, c], a)

    await wrapper.get('textarea').setValue('只改註釋')
    await save(wrapper)

    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: 3 })
  })

  it('它應該在同型別時讓使用者把另一條述詞選成反向，而不是只能指向自己', async () => {
    const a = rel(10, '先於', TECH, TECH, null)
    const b = rel(11, '後於', TECH, TECH, null)
    const { wrapper } = await mountView([a, b], a)

    await reverseCheckbox(wrapper).setValue(true)
    // 候選有兩個（另一條、自己），沒挑之前不能存檔。
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
    await reverseSelect(wrapper)!.setValue(11)
    await save(wrapper)

    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: 11 })
  })

  it('它應該在多個合法候選時顯示下拉，並送出使用者選的那一條', async () => {
    const a = rel(1, 'documents', DOC, TECH, null)
    const b = rel(2, 'explains', TECH, DOC, null)
    const c = rel(3, 'describes', TECH, DOC, null)
    const { wrapper } = await mountView([a, b, c], a)

    // 勾選前不顯示下拉。
    expect(reverseSelect(wrapper)).toBeUndefined()
    await reverseCheckbox(wrapper).setValue(true)

    const options = reverseSelect(wrapper)!
      .findAll('option')
      .map((o) => o.text())
    expect(options).toEqual(expect.arrayContaining(['explains', 'describes']))
    // 沒替使用者選第一個，也不能在沒選時存檔。
    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()

    await reverseSelect(wrapper)!.setValue(3)
    await save(wrapper)

    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: 3 })
  })

  it('它應該在只有一個候選時自動採用，不顯示下拉', async () => {
    const a = rel(1, 'documents', DOC, TECH, null)
    const b = rel(2, 'documentedBy', TECH, DOC, null)
    const { wrapper } = await mountView([a, b], a)

    await reverseCheckbox(wrapper).setValue(true)
    expect(reverseSelect(wrapper)).toBeUndefined()
    await save(wrapper)

    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: 2 })
  })

  it('它應該在沒有候選時停用勾選並送出 reverse_id 為 null', async () => {
    const a = rel(1, 'documents', DOC, TECH, null)
    const { wrapper } = await mountView([a], a)

    expect(reverseCheckbox(wrapper).attributes('disabled')).toBeDefined()
    await save(wrapper)

    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: null })
  })

  it('它應該在取消勾選後送出 reverse_id 為 null', async () => {
    const a = rel(1, 'documents', DOC, TECH, 2)
    const b = rel(2, 'documentedBy', TECH, DOC, 1)
    const { wrapper } = await mountView([a, b], a)

    await reverseCheckbox(wrapper).setValue(false)
    await save(wrapper)

    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: null })
  })

  it('它應該在新增同型別述詞時列出尚未配對的同型別述詞當候選', async () => {
    const other = rel(11, '後於', TECH, TECH, null)
    const { wrapper } = await mountView([other], null)

    const [subject, object] = wrapper.findAll('select')
    await subject!.setValue(TECH)
    await object!.setValue(TECH)
    await wrapper.findAll('input')[0]!.setValue('先於')
    await reverseCheckbox(wrapper).setValue(true)
    await save(wrapper)

    expect(createRelation).toHaveBeenCalledTimes(1)
    expect(vi.mocked(createRelation).mock.calls[0]![0]).toMatchObject({
      name: '先於',
      reverse_id: 11,
    })
  })
})

describe('OntologyRelationEditView 儲存失敗', () => {
  it('它應該在 422 沒有任何欄位錯誤時顯示整頁錯誤，且保留已輸入的內容', async () => {
    const a = rel(1, 'documents', DOC, TECH, null)
    const { wrapper, router } = await mountView([a], a)
    vi.mocked(updateRelation).mockRejectedValue(new ApiValidationError({}))

    await wrapper.get('textarea').setValue('我寫的註釋')
    await save(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toBe('輸入內容未通過驗證')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('我寫的註釋')
    expect(router.currentRoute.value.name).toBe('ontology-relation-edit')
  })

  it('它應該在 422 只有欄位錯誤時把訊息放在欄位上，不重複顯示整頁錯誤', async () => {
    const a = rel(1, 'documents', DOC, TECH, null)
    const { wrapper } = await mountView([a], a)
    vi.mocked(updateRelation).mockRejectedValue(new ApiValidationError({ name: '名稱已被使用' }))

    await save(wrapper)

    expect(wrapper.text()).toContain('名稱已被使用')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})

describe('OntologyRelationEditView 反向述詞已被刪除', () => {
  // 編輯 1（Doc→Tech）：詳情的 reverse_id 是 10，但清單裡沒有 id 10（已軟刪除）。
  const DELETED_HINT = '原本的反向述詞已被刪除'

  it('它應該在沒有其他候選時顯示已刪除的提示、取消勾選，並送出 reverse_id 為 null', async () => {
    const a = rel(1, 'documents', DOC, TECH, 10)
    const { wrapper } = await mountView([a], a)

    expect(wrapper.text()).toContain(DELETED_HINT)
    expect((reverseCheckbox(wrapper).element as HTMLInputElement).checked).toBe(false)
    await save(wrapper)

    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: null })
  })

  it('它應該在剛好有一條其他候選時不自動配對，使用者勾選後才套用那一條', async () => {
    const a = rel(1, 'documents', DOC, TECH, 10)
    const b = rel(2, 'documentedBy', TECH, DOC, null)
    const { wrapper } = await mountView([a, b], a)

    expect(wrapper.text()).toContain(DELETED_HINT)
    expect((reverseCheckbox(wrapper).element as HTMLInputElement).checked).toBe(false)
    await save(wrapper)
    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: null })

    await reverseCheckbox(wrapper).setValue(true)
    expect(wrapper.text()).not.toContain(DELETED_HINT)
    await save(wrapper)
    expect(vi.mocked(updateRelation).mock.calls[1]![1]).toMatchObject({ reverse_id: 2 })
  })

  it('它應該在有兩條以上其他候選時取消勾選、儲存鈕可按，並送出 reverse_id 為 null', async () => {
    const a = rel(1, 'documents', DOC, TECH, 10)
    const b = rel(2, 'explains', TECH, DOC, null)
    const c = rel(3, 'describes', TECH, DOC, null)
    const { wrapper } = await mountView([a, b, c], a)

    expect(wrapper.text()).toContain(DELETED_HINT)
    expect((reverseCheckbox(wrapper).element as HTMLInputElement).checked).toBe(false)
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    await save(wrapper)

    expect(vi.mocked(updateRelation).mock.calls[0]![1]).toMatchObject({ reverse_id: null })
  })

  it('它應該在反向仍在候選內時不顯示已刪除的提示', async () => {
    const a = rel(1, 'documents', DOC, TECH, 2)
    const b = rel(2, 'documentedBy', TECH, DOC, 1)
    const { wrapper } = await mountView([a, b], a)

    expect(wrapper.text()).not.toContain(DELETED_HINT)
    expect((reverseCheckbox(wrapper).element as HTMLInputElement).checked).toBe(true)
  })

  it('它應該在對稱述詞反向指向自己時不顯示已刪除的提示', async () => {
    // 清單不含自己也一樣：指向自己不算已刪除。
    const a = rel(10, '伴隨', TECH, TECH, 10)
    const { wrapper } = await mountView([], a)

    expect(wrapper.text()).not.toContain(DELETED_HINT)
    expect((reverseCheckbox(wrapper).element as HTMLInputElement).checked).toBe(true)
  })
})
