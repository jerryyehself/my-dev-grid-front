import { describe, expect, it } from 'vitest'
import {
  controlsBottomInset,
  fitTransform,
  fitTransformInBand,
  fitTransformWithInset,
  screenExtent,
  type FitItem,
} from './fitView'

const node = (x: number, y: number, labelW = 0): FitItem => ({ x, y, r: 5, labelW, labelH: 18 })

describe('fitTransform', () => {
  it('它應該讓寬的那一邊剛好貼齊可用寬度，當沒有標籤時', () => {
    const items = [node(0, 0), node(200, 0)]
    const fit = fitTransform(items, 420, 400, 10)!
    // 寬度 = (200 + 2×5) × k = 400
    expect(fit.k).toBeCloseTo(400 / 210, 3)
    expect(fit.cx).toBeCloseTo(100, 3)
  })

  it('它應該讓長標籤只佔固定螢幕寬度，不會像舊做法一樣讓四邊都留一半標籤寬', () => {
    const items = [node(0, 0, 240), node(400, 0), node(0, 300), node(400, 300)]
    const fit = fitTransform(items, 1000, 460, 16)!
    const e = screenExtent(items, fit.k)
    expect(e.maxX - e.minX).toBeLessThanOrEqual(1000 - 32 + 1e-6)
    expect(e.maxY - e.minY).toBeLessThanOrEqual(460 - 32 + 1e-6)
    // 舊做法的 padding = 240/2+10 = 130，可用高度只剩 200 → k ≈ 0.64；新做法高度才是限制，k ≈ 1.3
    expect(fit.k).toBeGreaterThan(1.2)
  })

  it('它應該讓框景中心把標籤的螢幕範圍也算進去', () => {
    const items = [node(0, 0, 300), node(100, 0)]
    const fit = fitTransform(items, 2000, 500, 0)!
    const e = screenExtent(items, fit.k)
    expect(fit.cx * fit.k).toBeCloseTo((e.minX + e.maxX) / 2, 6)
  })

  it('它應該避免小圖無限放大', () => {
    expect(fitTransform([node(0, 0)], 800, 600, 10, 3)!.k).toBe(3)
  })

  it('它應該在沒有節點時回傳 null', () => {
    expect(fitTransform([], 800, 600, 10)).toBeNull()
  })
})

describe('fitTransformWithInset', () => {
  it('它應該讓整張圖（含標籤）落在上方剩下的區域裡，當底邊被蓋住時', () => {
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

  it('它應該在寬畫布不留底邊', () => {
    expect(controlsBottomInset(976, 16)).toBe(0)
  })
})

describe('fitTransformInBand', () => {
  // 畫布 976×460，視窗只露出上面 330px：路線的終點在畫布下半（y 在 330 以下）就看不到
  const W = 976
  const H = 460
  const items = [node(-200, -150), node(-100, 60), node(150, 200)]
  const screenY = (worldY: number, fit: { k: number; cy: number }) => (worldY - fit.cy) * fit.k + H / 2

  it('它應該讓每個節點都落在橫帶內（不只在畫布內）', () => {
    const fit = fitTransformInBand(items, W, H, 0, 330, 48, 3)!

    for (const it of items) {
      const y = screenY(it.y, fit)
      expect(y - it.r * fit.k).toBeGreaterThanOrEqual(0)
      expect(y + it.r * fit.k).toBeLessThanOrEqual(330)
    }
  })

  it('它應該不超過 maxK（不比整張圖更近），放得下時維持 maxK', () => {
    const fit = fitTransformInBand(items, W, H, 0, 330, 48, 0.5)!

    expect(fit.k).toBeCloseTo(0.5, 6)
  })

  it('它應該在橫帶放不下時縮小，而不是讓節點跑出橫帶', () => {
    const tall = [node(0, -400), node(0, 400)]
    const fit = fitTransformInBand(tall, W, H, 0, 300, 48, 3)!

    expect(fit.k).toBeLessThan(0.4)
    expect(screenY(400, fit) + tall[1]!.r * fit.k).toBeLessThanOrEqual(300)
  })

  it('它應該支援橫帶不從畫布頂端開始（頁面已經捲過一段）', () => {
    const fit = fitTransformInBand(items, W, H, 100, 300, 48, 3)!

    for (const it of items) {
      const y = screenY(it.y, fit)
      expect(y - it.r * fit.k).toBeGreaterThanOrEqual(100)
      expect(y + it.r * fit.k).toBeLessThanOrEqual(400)
    }
  })

  it('它應該在沒有節點時回 null', () => {
    expect(fitTransformInBand([], W, H, 0, 300, 48, 3)).toBeNull()
  })

  it('它應該在給 fixedCx 時固定水平中心，只讓垂直方向追著節點組走', () => {
    // 路線的節點全擠在整張圖的左側：沒固定時 cx 會跟著節點組走，整張圖被拉向右邊
    const routeItems = [node(-300, -150), node(-250, 60)]
    const free = fitTransformInBand(routeItems, W, H, 0, 330, 48, 0.5)!
    const fixed = fitTransformInBand(routeItems, W, H, 0, 330, 48, 0.5, 40)!

    expect(free.cx).toBeCloseTo(-275, 0)
    expect(fixed.cx).toBe(40)
    // 垂直方向不受 fixedCx 影響
    expect(fixed.cy).toBeCloseTo(free.cy, 6)
    expect(fixed.k).toBeCloseTo(free.k, 6)
  })

  it('它應該在固定水平中心後，節點仍落在畫布寬度內（整張圖放得進去，路線只會更小）', () => {
    const all = [node(-300, -150), node(300, 200), node(-250, 60)]
    const wholeFit = fitTransform(all, 360, 360, 16)!
    const route = [node(-300, -150), node(-250, 60)]
    const fit = fitTransformInBand(route, 360, 360, 0, 200, 48, wholeFit.k, wholeFit.cx)!

    expect(fit.k).toBeLessThanOrEqual(wholeFit.k + 1e-9)
    for (const it of route) {
      const x = (it.x - fit.cx) * fit.k + 360 / 2
      expect(x - it.r * fit.k).toBeGreaterThanOrEqual(0)
      expect(x + it.r * fit.k).toBeLessThanOrEqual(360)
    }
  })

  it('它應該在沒給 fixedCx 時維持原本的行為（cx 是節點組的中心）', () => {
    const fit = fitTransformInBand(items, W, H, 0, 330, 48, 3)!

    expect(fit.cx).toBeCloseTo(fitTransform(items, W, 330, 48, 3)!.cx, 6)
  })
})
