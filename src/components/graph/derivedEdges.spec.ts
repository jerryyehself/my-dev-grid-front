import { describe, expect, it } from 'vitest'
import { computeDerivedEdges, derivedStrength } from './derivedEdges'

const n = (id: string, domainType: 'documentation' | 'technique' | 'implementation') => ({
  id,
  domainType,
})

describe('computeDerivedEdges', () => {
  it('兩份文件連到同一項技術就推出一條間接關聯，via 記錄共同鄰居', () => {
    const nodes = [n('d1', 'documentation'), n('d2', 'documentation'), n('t1', 'technique')]
    const links = [
      { source: 'd1', target: 't1' },
      { source: 'd2', target: 't1' },
    ]
    expect(computeDerivedEdges(nodes, links)).toEqual([
      { source: 'd1', target: 'd2', predicate: null, derived: true, via: ['t1'] },
    ])
  })

  it('實作要共用至少 3 項技術才算', () => {
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

  it('技術之間不推導；已有真實同類關係的配對跳過', () => {
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

  it('力模擬改寫成物件的端點也認得', () => {
    const nodes = [n('d1', 'documentation'), n('d2', 'documentation'), n('t1', 'technique')]
    const links = [
      { source: { id: 'd1' }, target: { id: 't1' } },
      { source: { id: 'd2' }, target: { id: 't1' } },
    ]
    expect(computeDerivedEdges(nodes, links)).toHaveLength(1)
  })
})

describe('derivedStrength', () => {
  it('剛好壓線是 0，門檻 +3 封頂是 1', () => {
    expect(derivedStrength(1, 'documentation')).toBe(0)
    expect(derivedStrength(4, 'documentation')).toBe(1)
    expect(derivedStrength(3, 'implementation')).toBe(0)
    expect(derivedStrength(9, 'implementation')).toBe(1)
    expect(derivedStrength(4, 'implementation')).toBeCloseTo(1 / 3)
  })
})
