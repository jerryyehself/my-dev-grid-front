import { describe, expect, it } from 'vitest'
import { OVERLAY_WINDOW_START, recencyScore, viridis, withAlpha } from './colorScale'

describe('colorScale', () => {
  it('viridis 兩端是第一個與最後一個色點，超出範圍會夾住', () => {
    expect(viridis(0)).toBe('rgb(68,1,84)')
    expect(viridis(1)).toBe('rgb(253,231,37)')
    expect(viridis(-1)).toBe(viridis(0))
    expect(viridis(2)).toBe(viridis(1))
  })

  it('withAlpha 把 hex 轉成 rgba', () => {
    expect(withAlpha('#ff8000', 0.5)).toBe('rgba(255,128,0,0.5)')
  })

  it('recencyScore 以 2025-01-01 為 0、時間窗終點為 1', () => {
    const end = OVERLAY_WINDOW_START + 1000
    expect(recencyScore('2025-01-01', end)).toBe(0)
    expect(recencyScore(new Date(end).toISOString(), end)).toBe(1)
  })
})
