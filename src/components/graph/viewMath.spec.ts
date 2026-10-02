import { describe, expect, it } from 'vitest'
import {
  centerForAnchor,
  clampZoom,
  pinchView,
  wheelZoomFactor,
  MAX_ZOOM,
  MIN_ZOOM,
} from './viewMath'

// 世界座標 → 螢幕座標（force-graph 的鏡頭模型），拿來驗證錨點真的沒動
const toScreen = (
  p: { x: number; y: number },
  c: { x: number; y: number },
  k: number,
  w: number,
  h: number,
) => ({
  x: (p.x - c.x) * k + w / 2,
  y: (p.y - c.y) * k + h / 2,
})

describe('centerForAnchor', () => {
  it('縮放後錨點仍在同一個螢幕位置', () => {
    const world = { x: 40, y: -12 }
    const screen = { x: 120, y: 300 }
    const c = centerForAnchor(world, screen, 2.5, 800, 460)
    const back = toScreen(world, c, 2.5, 800, 460)
    expect(back.x).toBeCloseTo(screen.x)
    expect(back.y).toBeCloseTo(screen.y)
  })
})

describe('wheelZoomFactor', () => {
  it('滾輪往前（deltaY 負）放大、往後縮小，滑鼠一格不會一次縮放好幾倍', () => {
    expect(wheelZoomFactor(-100, 0)).toBeGreaterThan(1)
    expect(wheelZoomFactor(100, 0)).toBeLessThan(1)
    expect(wheelZoomFactor(100, 0)).toBeGreaterThan(0.8)
    expect(wheelZoomFactor(-3, 1)).toBeCloseTo(2 ** 0.15)
  })
})

describe('pinchView', () => {
  it('兩指張開一倍就放大一倍，中點底下的點跟著手指', () => {
    const start = { world: { x: 10, y: 10 }, dist: 100, k: 1 }
    const { k, center } = pinchView(start, { x: 250, y: 200 }, 200, 500, 400)
    expect(k).toBe(2)
    const back = toScreen(start.world, center, k, 500, 400)
    expect(back.x).toBeCloseTo(250)
    expect(back.y).toBeCloseTo(200)
  })

  it('倍率夾在上下限內', () => {
    expect(
      pinchView({ world: { x: 0, y: 0 }, dist: 10, k: 1 }, { x: 0, y: 0 }, 10000, 100, 100).k,
    ).toBe(MAX_ZOOM)
    expect(clampZoom(0.0001)).toBe(MIN_ZOOM)
  })
})
