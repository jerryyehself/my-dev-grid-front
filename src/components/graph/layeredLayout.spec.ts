import { describe, expect, it } from 'vitest'
import {
  clampToLayer,
  countByType,
  layerTargets,
  MIN_LAYER_RADIUS,
  RADIUS_PER_SQRT_NODE,
} from './layeredLayout'

describe('layeredLayout', () => {
  it('三層中心沿對角線錯開，技術在畫布正中', () => {
    const t = layerTargets(1000, 500, { documentation: 4, technique: 9, implementation: 16 })
    expect(t.technique).toEqual({
      cx: 500,
      cy: 250,
      r: MIN_LAYER_RADIUS + 3 * RADIUS_PER_SQRT_NODE,
    })
    expect(t.documentation.cx).toBeLessThan(500)
    expect(t.documentation.cy).toBeLessThan(250)
    expect(t.implementation.cx).toBeGreaterThan(500)
    expect(t.implementation.cy).toBeGreaterThan(250)
  })

  it('countByType 依類別計數', () => {
    expect(
      countByType([
        { domainType: 'technique' },
        { domainType: 'technique' },
        { domainType: 'documentation' },
      ]),
    ).toEqual({
      documentation: 1,
      technique: 2,
      implementation: 0,
    })
  })

  it('clampToLayer 把超出圓框的節點拉回框內，框內的不動', () => {
    const target = { cx: 0, cy: 0, r: 100 }
    const out = { x: 300, y: 0, domainType: 'technique' as const }
    clampToLayer(out, target, 10)
    expect(out.x).toBeCloseTo(88)
    const inside = { x: 10, y: 10, domainType: 'technique' as const }
    clampToLayer(inside, target, 10)
    expect(inside).toMatchObject({ x: 10, y: 10 })
  })
})
