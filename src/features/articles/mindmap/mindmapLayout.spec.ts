import { describe, expect, it } from 'vitest'
import fixture from './articleMindmapFixture.json'
import type { ArticleMindmap } from './articleMindmapTypes'
import {
  DETAIL_METRICS,
  HOVER_METRICS,
  layoutMindmap,
  type MindmapBranchSpec,
  type MindmapLabelSpec,
  type MindmapTreeSpec,
} from './mindmapLayout'
import { buildDetailSpec, buildHoverSpec, linkLineLabel } from './mindmapTree'
import { estimateLabelWidth } from './measureLabel'

const mindmap = fixture as ArticleMindmap
// 固定寬度的量法：每個字 10px，結果跟字型無關
const measure = (text: string) => [...text].length * 10

const label = (id: string, kind: MindmapLabelSpec['kind'] = 'primary', text = id): MindmapLabelSpec => ({
  id,
  label: text,
  kind,
})
const branch = (id: string, children: string[]): MindmapBranchSpec => ({
  ...label(id, 'branch'),
  children: children.map((c) => label(c)),
})

function byId(layout: ReturnType<typeof layoutMindmap>) {
  return new Map(layout.labels.map((l) => [l.id, l]))
}

describe('layoutMindmap', () => {
  const spec: MindmapTreeSpec = {
    center: label('c', 'center', '中心'),
    right: [branch('b1', ['x1', 'x2']), branch('b2', ['x3'])],
    left: [branch('b3', ['x4', 'x5', 'x6'])],
    links: [],
  }

  it('它應該把中心放在原點，右邊的詞在右、左邊的詞在左', () => {
    const l = byId(layoutMindmap(spec, HOVER_METRICS, measure))
    expect(l.get('c')).toMatchObject({ x: 0, y: 0, anchor: 'middle', side: 'center' })
    for (const id of ['b1', 'b2', 'x1', 'x2', 'x3']) expect(l.get(id)!.x1).toBeGreaterThan(0)
    for (const id of ['b3', 'x4', 'x5', 'x6']) expect(l.get(id)!.x2).toBeLessThan(0)
    expect(l.get('x1')!.anchor).toBe('start')
    expect(l.get('x4')!.anchor).toBe('end')
  })

  it('它應該讓同一個分枝的概念隔一列（32），不同分枝再多空 14', () => {
    const l = byId(layoutMindmap(spec, HOVER_METRICS, measure))
    expect(l.get('x2')!.y - l.get('x1')!.y).toBe(32)
    expect(l.get('x3')!.y - l.get('x2')!.y).toBe(46)
    expect(l.get('x5')!.y - l.get('x4')!.y).toBe(32)
  })

  it('它應該把分枝放在子概念的中間，每一邊上下置中對齊中心', () => {
    const l = byId(layoutMindmap(spec, HOVER_METRICS, measure))
    expect(l.get('b1')!.y).toBe((l.get('x1')!.y + l.get('x2')!.y) / 2)
    expect(l.get('b2')!.y).toBe(l.get('x3')!.y)
    expect(l.get('x1')!.y + l.get('x3')!.y).toBeCloseTo(0)
    expect(l.get('x4')!.y + l.get('x6')!.y).toBeCloseTo(0)
  })

  it('它應該把概念對齊成一欄：在最寬的分枝後面再空一個欄距', () => {
    const wide: MindmapTreeSpec = {
      ...spec,
      right: [
        { ...branch('b1', ['x1']), label: '短' },
        { ...branch('b2', ['x2']), label: '長長長長長' },
      ],
    }
    const l = byId(layoutMindmap(wide, HOVER_METRICS, measure))
    // 中心寬 20 → 右半 10；分枝從 10+30 開始；最寬的分枝 50；概念欄在 40+50+30
    expect(l.get('b1')!.x1).toBe(40)
    expect(l.get('x1')!.x1).toBe(120)
    expect(l.get('x2')!.x1).toBe(120)
  })

  it('它應該為樹的每一條邊畫一條線（節點數減一）', () => {
    const layout = layoutMindmap(spec, HOVER_METRICS, measure)
    expect(layout.edges).toHaveLength(layout.labels.length - 1)
  })

  it('它應該在只有中心時也排得出來', () => {
    const layout = layoutMindmap({ ...spec, right: [], left: [] }, HOVER_METRICS, measure)
    expect(layout.labels).toHaveLength(1)
    expect(layout.edges).toEqual([])
    expect(layout.viewBox[2]).toBeGreaterThan(0)
  })

  it('它應該在內容比 minWidth 窄時左右補空白置中', () => {
    const layout = layoutMindmap(spec, HOVER_METRICS, measure, 638)
    const [x, , w] = layout.viewBox
    expect(w).toBe(638)
    const minX = Math.min(...layout.labels.map((l) => l.x1))
    const maxX = Math.max(...layout.labels.map((l) => l.x2))
    expect(minX - x).toBeCloseTo(x + w - maxX)
  })

  it('它應該在內容比 minWidth 寬時用內容的寬度', () => {
    const layout = layoutMindmap(spec, HOVER_METRICS, measure, 10)
    expect(layout.viewBox[2]).toBeGreaterThan(10)
  })

  it('它應該讓清單懸停的兩階圖只有一欄概念，高度由較多的那一邊決定', () => {
    const layout = layoutMindmap(buildHoverSpec(mindmap), HOVER_METRICS, measure, 638)
    const l = byId(layout)
    // 右邊 4 個概念：底線從 -48 到 48，每列 32；最上面的字頂在 -48 - 14×1.3；上下各留 28
    expect(l.get('n6')!.y).toBe(-48)
    expect(l.get('n19')!.y).toBe(48)
    expect(layout.viewBox[3]).toBeCloseTo(48 + 48 + 14 * 1.3 + 2 * 28)
    // 兩階：每個概念都直接連到中心，同一邊的概念對齊在中心外側一個欄距的地方
    expect(layout.edges).toHaveLength(7)
    const right = layout.labels.filter((x) => x.side === 'right')
    expect(new Set(right.map((x) => x.x1)).size).toBe(1)
  })

  it('它應該讓詞的底線寬度等於量到的字寬', () => {
    const x1 = byId(layoutMindmap(spec, DETAIL_METRICS, measure)).get('x1')!
    expect(x1.x2 - x1.x1).toBe(measure('x1'))
  })
})

describe('layoutMindmap 的橫向線', () => {
  const all = new Set(['n0', 'n1', 'n2', 'n3', 'n4', 'n5'])

  it('它應該把同一側的線畫成往外鼓的弧，跨兩側的沿上緣繞', () => {
    const { spec } = buildDetailSpec(mindmap, all, linkLineLabel, true)
    const layout = layoutMindmap(spec, DETAIL_METRICS, measure, 638)
    const l = byId(layout)
    const find = (s: string, t: string) => layout.crossLinks.find((c) => c.source === s && c.target === t)!
    // 插畫地圖（候選圖形類型，右）→ 隱喻誠實性稽核（方法論，右）：同側弧
    const same = find('n16', 'n10')
    expect(same.d).toContain('C')
    expect(same.extent.maxX).toBeGreaterThan(Math.max(l.get('n16')!.x2, l.get('n10')!.x2))
    // force-graph（目前結論，左）→ 節點-連結圖（候選圖形類型，右）：繞上緣，高過所有詞
    const cross = find('n24', 'n13')
    expect(cross.d).toMatch(/V/)
    const tops = layout.labels.map((x) => x.y - x.fontSize * 1.3)
    expect(cross.labelY).toBeLessThan(Math.min(...tops))
    // viewBox 要包得住繞出去的線
    expect(layout.viewBox[1]).toBeLessThan(cross.extent.minY)
  })

  it('它應該只標有類型的線，兩條一樣的字疊在一起時只留一個', () => {
    const { spec } = buildDetailSpec(mindmap, all, linkLineLabel, true)
    const layout = layoutMindmap(spec, DETAIL_METRICS, measure, 638)
    const labels = layout.crossLinks.map((c) => c.label)
    // 7 條：3 條沒類型不標；兩條「被否決」連到同一個詞，只留一個
    expect(labels.filter((t) => t === null)).toHaveLength(4)
    expect(labels.filter((t) => t === '被否決')).toHaveLength(1)
    expect(labels).toContain('實現')
    expect(labels).toContain('依據')
  })

  it('它應該略過有一端沒畫出來的線', () => {
    const layout = layoutMindmap(
      { ...buildDetailSpec(mindmap, new Set(), linkLineLabel, false).spec, links: [{ source: 'n16', target: 'n10', typed: true, label: 'x' }] },
      DETAIL_METRICS,
      measure,
    )
    expect(layout.crossLinks).toEqual([])
  })
})

describe('layoutMindmap 橫向線上的字不蓋到詞', () => {
  // 線上的字：12px、字寬照 measure；字高 ±6
  const FONT = { size: 12, weight: 600, serif: false }
  const labelBox = (c: { label: string | null; labelX: number; labelY: number }, m: (text: string, font: typeof FONT) => number) => {
    const half = m(c.label!, FONT) / 2
    return { x1: c.labelX - half, x2: c.labelX + half, y1: c.labelY - 6, y2: c.labelY + 6 }
  }
  const wordBox = (l: { x1: number; x2: number; y: number; fontSize: number }) => ({
    x1: l.x1,
    x2: l.x2,
    y1: l.y - l.fontSize * 1.3,
    y2: l.y,
  })
  const hit = (a: ReturnType<typeof wordBox>, b: ReturnType<typeof wordBox>) =>
    a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2

  /** 兩邊各一個分枝：中間那個詞（mid）特別長，兩端的詞（a、c）之間的橫向線，字會落在 mid 那一列 */
  function sideSpec(side: 'left' | 'right', midText: string): MindmapTreeSpec {
    const b: MindmapBranchSpec = {
      ...label('b', 'branch'),
      children: [label('a', 'primary', '甲乙丙'), label('mid', 'primary', midText), label('c', 'primary', '丁戊己')],
    }
    return {
      center: label('c0', 'center', '中心'),
      right: side === 'right' ? [b] : [],
      left: side === 'left' ? [b] : [],
      links: [{ source: 'a', target: 'c', typed: true, label: '依據' }],
    }
  }

  it.each(['left', 'right'] as const)('它應該在字落到長詞上時，把字挪到詞的外面（%s 邊）', (side) => {
    const layout = layoutMindmap(sideSpec(side, '很長很長的一個詞'), DETAIL_METRICS, measure)
    const link = layout.crossLinks[0]!
    expect(link.label).toBe('依據')
    const box = labelBox(link, measure)
    for (const l of layout.labels) expect(hit(box, wordBox(l)), `字蓋到「${l.label}」`).toBe(false)
    // 往外挪，不是往中心挪
    const mid = byId(layout).get('mid')!
    if (side === 'right') expect(box.x1).toBeGreaterThanOrEqual(mid.x2)
    else expect(box.x2).toBeLessThanOrEqual(mid.x1)
    // viewBox 還是包得住挪出去的字
    const [x, , w] = layout.viewBox
    expect(box.x1).toBeGreaterThanOrEqual(x)
    expect(box.x2).toBeLessThanOrEqual(x + w)
  })

  it('它應該在字沒有蓋到任何詞時不挪（詞比字短，擦邊也不算蓋到）', () => {
    const layout = layoutMindmap(sideSpec('right', '短'), DETAIL_METRICS, measure)
    const link = layout.crossLinks[0]!
    // 沒挪過的位置：曲線 t=0.5 的位置，用同一條線的兩端算回去
    const a = byId(layout).get('a')!
    const c = byId(layout).get('c')!
    const px = Math.max(a.x2, c.x2) + 14
    expect(link.labelX).toBeCloseTo(0.75 * px + 0.125 * (a.x2 + c.x2))
    expect(link.label).toBe('依據')
  })

  it('它應該在真實字寬下，文章 14 的各種展開狀態都沒有線上的字蓋到詞', () => {
    const real = (text: string, font: { size: number }) => estimateLabelWidth(text, font.size)
    const everything = new Set(['n0', 'n1', 'n2', 'n3', 'n4', 'n5'])
    for (const expanded of [new Set<string>(), new Set(['n0']), new Set(['n3', 'n4']), everything]) {
      const { spec } = buildDetailSpec(mindmap, expanded, linkLineLabel, true)
      const layout = layoutMindmap(spec, DETAIL_METRICS, real, 638)
      for (const c of layout.crossLinks.filter((x) => x.label)) {
        const box = labelBox(c, real)
        for (const l of layout.labels) expect(hit(box, wordBox(l)), `「${c.label}」蓋到「${l.label}」`).toBe(false)
      }
    }
  })

  it('它應該在全部展開時仍標出「依據」（挪開而不是丟掉）', () => {
    const real = (text: string, font: { size: number }) => estimateLabelWidth(text, font.size)
    const { spec } = buildDetailSpec(mindmap, new Set(['n0', 'n1', 'n2', 'n3', 'n4', 'n5']), linkLineLabel, true)
    const layout = layoutMindmap(spec, DETAIL_METRICS, real, 638)
    expect(layout.crossLinks.map((c) => c.label)).toContain('依據')
  })
})
