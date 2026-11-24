import { describe, expect, it } from 'vitest'
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
})
