import { describe, it, expect } from 'vitest'
import { filterPredicates } from './predicateFilter'

const scopes = [
  { id: 0, parent_class: null },
  { id: 1, parent_class: 0 },
  { id: 2, parent_class: 1 },
  { id: 10, parent_class: null },
  { id: 11, parent_class: 10 },
  { id: 12, parent_class: 11 },
]
const predicate = { id: 5, subject_id: 1, object_id: 11 }

describe('filterPredicates', () => {
  it.each([[1, 11], [2, 11], [1, 12], [2, 12]])('它應該保留符合兩端分類與子分類的述詞（%i、%i）', (subject, object) => {
    expect(filterPredicates([predicate], scopes, subject, object)).toEqual([predicate])
  })
  it.each([[0, 11], [1, 10], [10, 1], [1, 1], [10, 11]])('它應該濾掉任一端不符或方向相反的述詞（%i、%i）', (subject, object) => {
    expect(filterPredicates([predicate], scopes, subject, object)).toEqual([])
  })
  it('它應該允許孫分類符合祖父分類並保留輸入順序與額外欄位', () => {
    const root = { ...predicate, id: 6, subject_id: 0, object_id: 10 }
    expect(filterPredicates([root, predicate], scopes, 2, 12)).toEqual([root, predicate])
  })
  it.each([null, undefined, 99])('它應該在任一端分類缺失時濾掉述詞（%s）', (id) => {
    expect(filterPredicates([predicate], scopes, id, 11)).toEqual([])
    expect(filterPredicates([predicate], scopes, 1, id)).toEqual([])
  })
  it.each([
    { cycle: [{ id: 1, parent_class: 1 }] },
    { cycle: [{ id: 1, parent_class: 2 }, { id: 2, parent_class: 1 }] },
  ])('它應該拒絕含有要求分類的父鏈環', ({ cycle }) => {
    expect(filterPredicates([predicate], [...scopes.filter((s) => s.id > 2), ...cycle], 1, 11)).toEqual([])
    expect(filterPredicates([{ subject_id: 11, object_id: 1 }], [...scopes.filter((s) => s.id > 2), ...cycle], 11, 1)).toEqual([])
  })
  it('它應該在清單為空或述詞分類缺失時回傳空清單', () => {
    expect(filterPredicates([], scopes, 1, 11)).toEqual([])
    expect(filterPredicates([predicate], [], 1, 11)).toEqual([])
    expect(filterPredicates([{ subject_id: null, object_id: 11 }, { subject_id: 1, object_id: null }], scopes, 1, 11)).toEqual([])
  })
})
