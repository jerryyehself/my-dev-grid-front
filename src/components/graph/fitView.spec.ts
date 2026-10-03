import { describe, expect, it } from 'vitest'
import {
  controlsBottomInset,
  fitTransform,
  fitTransformWithInset,
  screenExtent,
  type FitItem,
} from './fitView'

const node = (x: number, y: number, labelW = 0): FitItem => ({ x, y, r: 5, labelW, labelH: 18 })

describe('fitTransform', () => {
  it('沒有標籤時，寬的那一邊剛好貼齊可用寬度', () => {
    const items = [node(0, 0), node(200, 0)]
    const fit = fitTransform(items, 420, 400, 10)!
    // 寬度 = (200 + 2×5) × k = 400
    expect(fit.k).toBeCloseTo(400 / 210, 3)
    expect(fit.cx).toBeCloseTo(100, 3)
  })

  it('長標籤只佔固定螢幕寬度，不會像舊做法一樣讓四邊都留一半標籤寬', () => {
    const items = [node(0, 0, 240), node(400, 0), node(0, 300), node(400, 300)]
    const fit = fitTransform(items, 1000, 460, 16)!
    const e = screenExtent(items, fit.k)
    expect(e.maxX - e.minX).toBeLessThanOrEqual(1000 - 32 + 1e-6)
    expect(e.maxY - e.minY).toBeLessThanOrEqual(460 - 32 + 1e-6)
    // 舊做法的 padding = 240/2+10 = 130，可用高度只剩 200 → k ≈ 0.64；新做法高度才是限制，k ≈ 1.3
    expect(fit.k).toBeGreaterThan(1.2)
  })

  it('框景中心把標籤的螢幕範圍也算進去', () => {
    const items = [node(0, 0, 300), node(100, 0)]
    const fit = fitTransform(items, 2000, 500, 0)!
    const e = screenExtent(items, fit.k)
    expect(fit.cx * fit.k).toBeCloseTo((e.minX + e.maxX) / 2, 6)
  })

  it('小圖不會無限放大', () => {
    expect(fitTransform([node(0, 0)], 800, 600, 10, 3)!.k).toBe(3)
  })

  it('沒有節點回傳 null', () => {
    expect(fitTransform([], 800, 600, 10)).toBeNull()
  })
})

describe('fitTransformWithInset', () => {
  it('底邊被蓋住時，整張圖（含標籤）落在上方剩下的區域裡', () => {
    const items = [node(0, 0), node(100, 0), node(0, 300), node(100, 300, 80)]
    const W = 358
    const H = 358
    const pad = 16
    const inset = controlsBottomInset(W, pad)
    expect(inset).toBe(46)
    const fit = fitTransformWithInset(items, W, H, pad, inset)!
    const e = screenExtent(items, fit.k)
    // 世界 → 螢幕：(p - c) × k + H / 2；最下緣不能進入底邊被蓋住的區域
    const bottom = e.maxY - fit.cy * fit.k + H / 2
    const top = e.minY - fit.cy * fit.k + H / 2
    expect(bottom).toBeLessThanOrEqual(H - inset - pad + 1e-6)
    expect(top).toBeGreaterThanOrEqual(pad - 1e-6)
  })

  it('寬畫布不留底邊', () => {
    expect(controlsBottomInset(976, 16)).toBe(0)
  })
})
