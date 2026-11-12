import { describe, expect, it } from 'vitest'
import { placeLabels, truncateLabel } from './labels'

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
