import { describe, expect, it } from 'vitest'
import { computeDerivedEdges, derivedStrength } from './derivedEdges'

const n = (id: string, domainType: 'documentation' | 'technique' | 'implementation') => ({
  id,
  domainType,
})

describe('computeDerivedEdges', () => {
  it('它應該推出一條間接關聯並以 via 記錄共同鄰居，當兩份文件連到同一項技術時', () => {
    const nodes = [n('d1', 'documentation'), n('d2', 'documentation'), n('t1', 'technique')]
    const links = [
      { source: 'd1', target: 't1' },
      { source: 'd2', target: 't1' },
    ]
    expect(computeDerivedEdges(nodes, links)).toEqual([
      { source: 'd1', target: 'd2', predicate: null, derived: true, via: ['t1'] },
    ])
  })

  it('它應該在實作共用至少 3 項技術時才算間接關聯', () => {
    const nodes = [
      n('i1', 'implementation'),
      n('i2', 'implementation'),
      n('t1', 'technique'),
      n('t2', 'technique'),
      n('t3', 'technique'),
    ]
    const two = [
      { source: 't1', target: 'i1' },
      { source: 't1', target: 'i2' },
      { source: 't2', target: 'i1' },
      { source: 't2', target: 'i2' },
    ]
    expect(computeDerivedEdges(nodes, two)).toEqual([])
    const three = [...two, { source: 't3', target: 'i1' }, { source: 't3', target: 'i2' }]
    expect(computeDerivedEdges(nodes, three)).toHaveLength(1)
  })

  it('它應該不推導技術之間的關聯，並跳過已有真實同類關係的配對', () => {
    const nodes = [
      n('t1', 'technique'),
      n('t2', 'technique'),
      n('d1', 'documentation'),
      n('d2', 'documentation'),
    ]
    const links = [
      { source: 'd1', target: 't1' },
      { source: 'd2', target: 't1' },
      { source: 'd1', target: 'd2' },
      { source: 't1', target: 't2' },
    ]
    expect(computeDerivedEdges(nodes, links)).toEqual([])
  })

  it('它應該認得被力模擬改寫成物件的端點', () => {
    const nodes = [n('d1', 'documentation'), n('d2', 'documentation'), n('t1', 'technique')]
    const links = [
      { source: { id: 'd1' }, target: { id: 't1' } },
      { source: { id: 'd2' }, target: { id: 't1' } },
    ]
    expect(computeDerivedEdges(nodes, links)).toHaveLength(1)
  })
})

describe('computeDerivedEdges 與過期邊', () => {
  it('它應該不拿過期邊推導間接關聯，當其中一條共同連線是 stale', () => {
    const nodes = [n('d1', 'documentation'), n('d2', 'documentation'), n('t1', 'technique')]
    const fresh = { source: 'd1', target: 't1' }
    expect(
      computeDerivedEdges(nodes, [fresh, { source: 'd2', target: 't1', stale: true }]),
    ).toEqual([])
    // stale: false 或沒有欄位（舊版 API）照常推導
    expect(
      computeDerivedEdges(nodes, [fresh, { source: 'd2', target: 't1', stale: false }]),
    ).toHaveLength(1)
  })

  it('它應該只算沒過期的共同鄰居，過期的那條不計入門檻與 via', () => {
    const nodes = [
      n('i1', 'implementation'),
      n('i2', 'implementation'),
      n('t1', 'technique'),
      n('t2', 'technique'),
      n('t3', 'technique'),
    ]
    const links = [
      { source: 't1', target: 'i1' },
      { source: 't1', target: 'i2' },
      { source: 't2', target: 'i1' },
      { source: 't2', target: 'i2' },
      { source: 't3', target: 'i1' },
      { source: 't3', target: 'i2', stale: true },
    ]
    // 剛好 3 條共同連線，其中 1 條過期 → 剩 2 條，沒到門檻 3
    expect(computeDerivedEdges(nodes, links)).toEqual([])
    const withFourth = [
      ...links,
      { source: 't4', target: 'i1' },
      { source: 't4', target: 'i2' },
    ]
    const result = computeDerivedEdges([...nodes, n('t4', 'technique')], withFourth)
    expect(result).toHaveLength(1)
    expect(result[0]!.via).toEqual(['t1', 't2', 't4'])
  })

  it('它應該不讓過期的同類關係擋掉推導，因為過期邊不算真實事實', () => {
    const nodes = [n('d1', 'documentation'), n('d2', 'documentation'), n('t1', 'technique')]
    const links = [
      { source: 'd1', target: 't1' },
      { source: 'd2', target: 't1' },
      { source: 'd1', target: 'd2', stale: true },
    ]
    expect(computeDerivedEdges(nodes, links)).toHaveLength(1)
  })
})

describe('derivedStrength', () => {
  it('它應該在剛好壓線時為 0，門檻 +3 封頂時為 1', () => {
    expect(derivedStrength(1, 'documentation')).toBe(0)
    expect(derivedStrength(4, 'documentation')).toBe(1)
    expect(derivedStrength(3, 'implementation')).toBe(0)
    expect(derivedStrength(9, 'implementation')).toBe(1)
    expect(derivedStrength(4, 'implementation')).toBeCloseTo(1 / 3)
  })
})
