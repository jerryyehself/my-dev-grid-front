import { describe, expect, it } from 'vitest'
import { labelRank, placeLabels, truncateLabel } from './labels'

// 假的量測：中日韓字 2 單位、其他 1 單位
const measure = (s: string) => Array.from(s).reduce((w, c) => w + (/[　-鿿＀-￯]/.test(c) ? 2 : 1), 0)

describe('truncateLabel', () => {
  it('它應該保持原樣，當標籤塞得下時', () => {
    expect(truncateLabel('Vue', 10, measure)).toBe('Vue')
  })
  it('它應該截斷加 … 且結果不超過上限，當標籤塞不下時', () => {
    const out = truncateLabel('my-dev-grid-front 部署到 Cloudflare 的完整流程', 20, measure)
    expect(out.endsWith('…')).toBe(true)
    expect(measure(out)).toBeLessThanOrEqual(20)
    expect(out).toBe('my-dev-grid-front…')
  })
  it('它應該依寬度截斷中文，不是依字數', () => {
    expect(truncateLabel('節省降變異度機制盤點', 9, measure)).toBe('節省降變…')
  })
})

describe('placeLabels', () => {
  const box = (x: number) => ({ x0: x, y0: 0, x1: x + 10, y1: 10 })
  it('它應該略過重疊的後來者，強制顯示的照畫', () => {
    const shown = placeLabels([
      { id: 'a', box: box(0), forced: false },
      { id: 'b', box: box(5), forced: false },
      { id: 'c', box: box(6), forced: true },
      { id: 'd', box: box(30), forced: false },
    ])
    expect([...shown]).toEqual(['a', 'c', 'd'])
  })
})

describe('labelRank', () => {
  const base = { forced: false, domainType: 'documentation', subtype: 'post', alwaysLabeled: true }
  it('它應該讓強制顯示最優先，其次是有名稱的文件（文章、官方文件、repo），再來是實作與樞紐技術', () => {
    expect(labelRank({ ...base, forced: true })).toBe(3)
    for (const subtype of ['post', 'sourcesite', 'repository']) {
      expect(labelRank({ ...base, subtype })).toBe(2)
    }
    expect(labelRank({ ...base, domainType: 'implementation', subtype: null })).toBe(1)
    expect(labelRank({ ...base, domainType: 'technique', subtype: null })).toBe(1)
  })
  it('它應該讓「未公開」文件（沒有 subtype）跟一般常駐節點同級，不提前', () => {
    expect(labelRank({ ...base, subtype: null })).toBe(1)
    expect(labelRank({ ...base, subtype: undefined })).toBe(1)
  })
  it('它應該讓不常駐的技術排最後', () => {
    expect(labelRank({ ...base, domainType: 'technique', subtype: null, alwaysLabeled: false })).toBe(0)
  })
  it('它應該讓有名稱的文件比關係數更多的實作先擺，不被擠掉', () => {
    // 文件 degree 1、實作 degree 6，名稱框重疊：排序後文件先擺、實作被略過
    const nodes = [
      { id: 'impl', degree: 6, domainType: 'implementation', subtype: null as string | null },
      { id: 'doc', degree: 1, domainType: 'documentation', subtype: 'post' as string | null },
    ]
    const rank = (n: (typeof nodes)[number]) => labelRank({ forced: false, alwaysLabeled: true, ...n })
    const ordered = [...nodes].sort((a, b) => rank(b) - rank(a) || b.degree - a.degree)
    const box = { x0: 0, y0: 0, x1: 10, y1: 10 }
    const shown = placeLabels(ordered.map((n) => ({ id: n.id, box, forced: false })))
    expect([...shown]).toEqual(['doc'])
  })
})
