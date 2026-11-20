import { describe, expect, it, vi } from 'vitest'
import {
  aboutLinkCanvasMode,
  aboutMarkerStyle,
  directLinkStyle,
  drawAboutMarker,
  isAboutLink,
} from './linkStyle'

const base = {
  edgeReal: '#6d7686',
  accent: '#922e39',
  hasFocus: false,
  touchesFocus: false,
  filterDimmed: false,
}
const gray = (alpha: number) => `rgba(109,118,134,${alpha})`

describe('directLinkStyle', () => {
  it('它應該讓一般直接連線是不透明的 --edge-real、線寬 1.5', () => {
    expect(directLinkStyle(base)).toEqual({ color: '#6d7686', width: 1.5 })
  })

  it('它應該讓選取中沒碰到選取點的連線淡成 0.18、線寬維持 1.5', () => {
    expect(directLinkStyle({ ...base, hasFocus: true })).toEqual({ color: gray(0.18), width: 1.5 })
  })

  it('它應該讓碰到選取點的連線是不透明 accent、線寬 2.2', () => {
    expect(directLinkStyle({ ...base, hasFocus: true, touchesFocus: true })).toEqual({
      color: '#922e39',
      width: 2.2,
    })
  })

  it('它應該讓沒有選取時被顯示層篩掉的連線淡成 0.22', () => {
    expect(directLinkStyle({ ...base, filterDimmed: true })).toEqual({
      color: gray(0.22),
      width: 1.5,
    })
  })

  it('它應該讓碰到選取點但被顯示層篩掉的連線跟沒碰到的一樣淡', () => {
    const dimmed = { ...base, hasFocus: true, touchesFocus: true, filterDimmed: true }
    expect(directLinkStyle(dimmed)).toEqual({ color: gray(0.18), width: 1.5 })
  })

  it('它應該在沒有選取時忽略 touchesFocus', () => {
    expect(directLinkStyle({ ...base, touchesFocus: true })).toEqual(directLinkStyle(base))
  })
})

describe('isAboutLink', () => {
  it('它應該認得「關於」的兩個述詞（subjectOfProject、projectAbout）', () => {
    expect(isAboutLink('subjectOfProject')).toBe(true)
    expect(isAboutLink('projectAbout')).toBe(true)
  })

  it('它應該不把「使用」或其他述詞、空述詞當成「關於」', () => {
    expect(isAboutLink('usedBy')).toBe(false)
    expect(isAboutLink('about')).toBe(false)
    expect(isAboutLink(null)).toBe(false)
    expect(isAboutLink(undefined)).toBe(false)
  })
})

describe('aboutMarkerStyle', () => {
  const bg = '#e4ebf5'

  it('它應該畫半徑 3、描邊跟一般線一樣 1.5、填畫布底色的空心圈', () => {
    expect(aboutMarkerStyle({ line: directLinkStyle(base), canvasBg: bg })).toEqual({
      radius: 3,
      lineWidth: 1.5,
      stroke: '#6d7686',
      fill: bg,
    })
  })

  it('它應該讓 hover／選取時圈的描邊跟著線變 accent、寬度 2.2', () => {
    const line = directLinkStyle({ ...base, hasFocus: true, touchesFocus: true })
    const m = aboutMarkerStyle({ line, canvasBg: bg })
    expect(m.stroke).toBe('#922e39')
    expect(m.lineWidth).toBe(2.2)
  })

  it('它應該讓淡出時圈的描邊跟線一起淡出、寬度 1.5', () => {
    const faded = aboutMarkerStyle({
      line: directLinkStyle({ ...base, hasFocus: true }),
      canvasBg: bg,
    })
    expect(faded.stroke).toBe(gray(0.18))
    expect(faded.lineWidth).toBe(1.5)
    const filtered = aboutMarkerStyle({
      line: directLinkStyle({ ...base, filterDimmed: true }),
      canvasBg: bg,
    })
    expect(filtered.stroke).toBe(gray(0.22))
    expect(filtered.lineWidth).toBe(1.5)
  })
})

describe('aboutLinkCanvasMode', () => {
  it.each(['subjectOfProject', 'projectAbout'])(
    '它應該讓直接關係的 %s 連線在線之後畫圈',
    (predicate) => {
      expect(aboutLinkCanvasMode({ predicate })).toBe('after')
    },
  )

  it.each([
    { kind: '使用', link: { predicate: 'usedBy' } },
    { kind: '空述詞', link: { predicate: null } },
    { kind: '沒有述詞', link: {} },
    { kind: '推導邊（即使述詞是關於）', link: { predicate: 'subjectOfProject', derived: true } },
  ])('它應該不替$kind連線畫圈', ({ link }) => {
    expect(aboutLinkCanvasMode(link)).toBeUndefined()
  })
})

describe('drawAboutMarker', () => {
  const bg = '#e4ebf5'
  function fakeCtx() {
    const calls: string[] = []
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(() => calls.push('beginPath')),
      arc: vi.fn(() => calls.push('arc')),
      fill: vi.fn(() => calls.push(`fill:${ctx.fillStyle}`)),
      stroke: vi.fn(() => calls.push(`stroke:${ctx.strokeStyle}:${ctx.lineWidth}`)),
    }
    return { ctx: ctx as unknown as CanvasRenderingContext2D, raw: ctx, calls }
  }
  const link = { source: { x: 10, y: 20 }, target: { x: 30, y: 60 } }

  it('它應該在兩端點的中點畫半徑 3 的圈', () => {
    const { ctx, raw } = fakeCtx()
    drawAboutMarker(ctx, link, aboutMarkerStyle({ line: directLinkStyle(base), canvasBg: bg }))
    expect(raw.arc).toHaveBeenCalledWith(20, 40, 3, 0, 2 * Math.PI)
  })

  it('它應該先用畫布底色填滿、再描邊（填色在描邊之前才是空心）', () => {
    const { ctx, calls } = fakeCtx()
    drawAboutMarker(ctx, link, aboutMarkerStyle({ line: directLinkStyle(base), canvasBg: bg }))
    expect(calls).toEqual(['beginPath', 'arc', `fill:${bg}`, 'stroke:#6d7686:1.5'])
  })

  it('它應該在 hover 專案時用 accent、描邊寬 2.2', () => {
    const { ctx, calls } = fakeCtx()
    const line = directLinkStyle({ ...base, hasFocus: true, touchesFocus: true })
    drawAboutMarker(ctx, link, aboutMarkerStyle({ line, canvasBg: bg }))
    expect(calls.at(-1)).toBe('stroke:#922e39:2.2')
  })

  it('它應該在端點缺座標時以 0 計算', () => {
    const { ctx, raw } = fakeCtx()
    drawAboutMarker(
      ctx,
      { source: {}, target: { x: 8 } },
      aboutMarkerStyle({ line: directLinkStyle(base), canvasBg: bg }),
    )
    expect(raw.arc).toHaveBeenCalledWith(4, 0, 3, 0, 2 * Math.PI)
  })

  it('它應該在端點還是 id（尚未換成節點）時不畫', () => {
    const { ctx, raw } = fakeCtx()
    drawAboutMarker(
      ctx,
      { source: 'a', target: { x: 1, y: 1 } },
      aboutMarkerStyle({ line: directLinkStyle(base), canvasBg: bg }),
    )
    expect(raw.beginPath).not.toHaveBeenCalled()
  })

  it('它應該在終點還是 id、起點已有座標時也不畫', () => {
    const { ctx, raw } = fakeCtx()
    drawAboutMarker(
      ctx,
      { source: { x: 1, y: 1 }, target: 'b' },
      aboutMarkerStyle({ line: directLinkStyle(base), canvasBg: bg }),
    )
    expect(raw.beginPath).not.toHaveBeenCalled()
  })
})
