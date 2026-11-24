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

const mindmap = fixture as ArticleMindmap
// 固定寬度的量法：每個字 10px，結果跟字型無關
const measure = (text: string) => [...text].length * 10

const label = (id: string, kind: MindmapLabelSpec['kind'] = 'primary', text = id): MindmapLabelSpec => ({
  id,
  label: text,
  kind,
  graph: false,
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

  it('它應該讓清單懸停的 fixture 高約 230（線框的值）', () => {
    const layout = layoutMindmap(buildHoverSpec(mindmap), HOVER_METRICS, measure, 638)
    expect(layout.viewBox[3]).toBeCloseTo(230, 0)
  })

  it('它應該在 ↗ 的詞把 ↗ 算進寬度', () => {
    const plain = byId(layoutMindmap(spec, DETAIL_METRICS, measure)).get('x1')!
    const withMark = byId(
      layoutMindmap(
        { ...spec, right: [{ ...branch('b1', []), children: [{ ...label('x1'), graph: true }] }] },
        DETAIL_METRICS,
        measure,
      ),
    ).get('x1')!
    expect(withMark.x2 - withMark.x1).toBeGreaterThan(plain.x2 - plain.x1)
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
