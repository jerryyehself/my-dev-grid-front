import { describe, expect, it } from 'vitest'
import { extractHeadings } from '@/components/markdown/headings'
import type { MindmapNode } from './articleMindmapTypes'
import { unitLinksOf } from './mindmapUnits'

const node = (units: MindmapNode['units']): MindmapNode => ({
  id: 'n1',
  parent: 'n0',
  label: 'force-graph',
  res_id: null,
  strength: 'primary',
  weight: 0.5,
  units,
})

const headings = [
  { slug: '1-背景', text: '1. 背景' },
  { slug: '5-相關文獻', text: '5. 相關文獻' },
  { slug: '7-結論', text: '7. 結論' },
]

describe('unitLinksOf', () => {
  it('它應該照標題在文章裡的順序排，帶上標題文字與次數', () => {
    const units = unitLinksOf(
      node([
        { unit_id: '7-結論', count: 1 },
        { unit_id: '1-背景', count: 3 },
      ]),
      headings,
    )
    expect(units).toEqual([
      { slug: '1-背景', text: '1. 背景', count: 3 },
      { slug: '7-結論', text: '7. 結論', count: 1 },
    ])
  })

  it('它應該略過對不上內文標題的出處（連過去不會動）', () => {
    expect(unitLinksOf(node([{ unit_id: '不存在', count: 2 }]), headings)).toEqual([])
    // 只差一個字也不算
    expect(unitLinksOf(node([{ unit_id: '1-背', count: 2 }]), headings)).toEqual([])
  })

  it.each([
    ['沒有出處', [], headings],
    ['文章沒有標題', [{ unit_id: '1-背景', count: 1 }], []],
  ])('它應該在%s時回空陣列', (...[, units, hs]) => {
    expect(unitLinksOf(node(units), hs)).toEqual([])
  })

  describe('標題後來補上明確 ID（`{#id}`）', () => {
    // 同一篇文章重新匯入後：標題文字不變，id 從文字推出來的 slug 換成作者寫的 s1、s2……
    const withIds = extractHeadings('## 1. 背景 {#s1}\n\n## 5. 相關文獻 {#s2}\n\n## 7. 結論 {#s3}\n')

    it('它應該用標題文字推出來的 slug 對到段落，連結用標題現在的 id', () => {
      expect(
        unitLinksOf(
          node([
            { unit_id: '7-結論', count: 1 },
            { unit_id: '1-背景', count: 3 },
          ]),
          withIds,
        ),
      ).toEqual([
        { slug: 's1', text: '1. 背景', count: 3 },
        { slug: 's3', text: '7. 結論', count: 1 },
      ])
    })

    it('它應該也認明確 ID 本身', () => {
      expect(unitLinksOf(node([{ unit_id: 's2', count: 2 }]), withIds)).toEqual([
        { slug: 's2', text: '5. 相關文獻', count: 2 },
      ])
    })

    it('它應該讓同一個段落只列一次（明確 ID 與文字 slug 指到同一段）', () => {
      expect(
        unitLinksOf(
          node([
            { unit_id: 's1', count: 2 },
            { unit_id: '1-背景', count: 5 },
          ]),
          withIds,
        ),
      ).toEqual([{ slug: 's1', text: '1. 背景', count: 2 }])
    })

    it.each([
      ['只差一個字', '1-背'],
      ['多一個字', '1-背景x'],
      ['原始標題文字（沒轉成 slug）', '1. 背景'],
      ['別的文章的明確 ID', 's9'],
      ['空字串', ''],
    ])('它應該略過%s的出處', (...[, unitId]) => {
      expect(unitLinksOf(node([{ unit_id: unitId, count: 1 }]), withIds)).toEqual([])
    })

    it('它應該讓同名標題的第二個（帶流水號的 slug）對不到，不會誤連到第一個', () => {
      const dup = extractHeadings('## 結論 {#s1}\n\n## 結論 {#s2}\n')
      expect(unitLinksOf(node([{ unit_id: '結論-2', count: 1 }]), dup)).toEqual([])
      expect(unitLinksOf(node([{ unit_id: '結論', count: 1 }]), dup)).toEqual([
        { slug: 's1', text: '結論', count: 1 },
      ])
    })
  })
})
