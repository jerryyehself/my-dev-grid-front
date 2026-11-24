import { describe, expect, it } from 'vitest'
import fixture from './articleMindmapFixture.json'
import type { ArticleMindmap, MindmapLink, MindmapNode } from './articleMindmapTypes'
import {
  assignSides,
  branchesOf,
  buildDetailSpec,
  buildHoverSpec,
  hoverConceptsOf,
  chipLabel,
  linkLineLabel,
  linkPhrase,
} from './mindmapTree'

const mindmap = fixture as ArticleMindmap
const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe('branchesOf', () => {
  it('它應該照資料順序列出中心底下的分枝，並分開主要與次要概念', () => {
    const branches = branchesOf(mindmap)
    expect(branches.map((b) => b.node.id)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5'])
    const n3 = branches[2]!
    expect(ids(n3.primaries)).toEqual(['n13'])
    expect(ids(n3.secondaries)).toEqual(['n14', 'n15', 'n16', 'n17'])
  })
})

describe('assignSides', () => {
  it.each([
    { name: '沒有分枝', rows: [], right: [], left: [] },
    { name: '一個分枝全放右邊', rows: [3], right: [0], left: [] },
    { name: '兩個一樣多：一右一左', rows: [2, 2], right: [0], left: [1] },
    // 清單懸停的 fixture：主要概念 2、2、1、3、2，右邊 5、左邊 5
    { name: '以列數平衡，不是以分枝數', rows: [2, 2, 1, 3, 2], right: [0, 1, 2], left: [4, 3] },
    // 1 對 3 與 3 對 1 一樣接近時，右邊多放
    { name: '一樣接近時右邊多放', rows: [1, 2, 1], right: [0, 1], left: [2] },
    { name: '列數 0 當 1 算（分枝本身也佔一列）', rows: [0, 0, 0, 0], right: [0, 1], left: [3, 2] },
  ])('它應該在$name時這樣分', ({ rows, right, left }) => {
    const items = Array.from(rows.keys())
    const result = assignSides(items, (i) => rows[i]!)
    expect(result.right).toEqual(right)
    // 左邊回傳由上往下：作者順序順時針排，最後一個分枝在左上
    expect(result.left).toEqual(left)
  })
})

/** 造一份只有一個分枝的心智圖，概念的 weight 照給的順序 */
function withConcepts(weights: number[], extra: Partial<Record<number, Partial<MindmapNode>>> = {}): ArticleMindmap {
  const nodes: MindmapNode[] = [
    { id: 'c', parent: null, label: '中心', res_id: null, strength: 'primary', weight: 1, units: [] },
    { id: 'b', parent: 'c', label: '分枝', res_id: null, strength: 'primary', weight: 0.9, units: [] },
    ...weights.map<MindmapNode>((w, i) => ({
      id: `k${i}`,
      parent: 'b',
      label: `概念${i}`,
      res_id: null,
      strength: 'primary',
      weight: w,
      units: [],
      ...extra[i],
    })),
  ]
  return { article_id: 1, center: 'c', nodes, links: [], status: 'draft' }
}

describe('hoverConceptsOf', () => {
  it.each([
    { name: '沒有概念', weights: [], picked: [] },
    { name: '不足 6 個時全部放', weights: [0.5, 0.4, 0.3], picked: [0, 1, 2] },
    { name: '剛好 6 個', weights: [0.6, 0.5, 0.4, 0.3, 0.2, 0.1], picked: [0, 1, 2, 3, 4, 5] },
    { name: '7 個不同分時取前 6', weights: [0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1], picked: [0, 1, 2, 3, 4, 5] },
    // 第 6 名是 0.2，第 7 名也是 0.2：同分一併帶上
    { name: '跟第 6 名同分的一併帶上', weights: [0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.2, 0.1], picked: [0, 1, 2, 3, 4, 5, 6] },
    // 同分的有 5 個，最多到 8 個，超過的照資料順序切
    { name: '同分超過上限時照資料順序切在 8 個', weights: [0.9, 0.8, 0.7, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], picked: [0, 1, 2, 3, 4, 5, 6, 7] },
    // 回傳的是資料順序，不是分數順序
    { name: '回傳照資料順序', weights: [0.1, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4], picked: [1, 2, 3, 4, 5, 6] },
  ])('它應該在$name時取 $picked', ({ weights, picked }) => {
    expect(ids(hoverConceptsOf(withConcepts(weights)))).toEqual(picked.map((i) => `k${i}`))
  })

  it('它應該只取主要概念，次要概念分數再高也不放', () => {
    const data = withConcepts([0.9, 0.1], { 0: { strength: 'secondary' } })
    expect(ids(hoverConceptsOf(data))).toEqual(['k1'])
  })

  it('它應該略過本身是次要的分枝底下的概念', () => {
    const data = withConcepts([0.9])
    data.nodes[1] = { ...data.nodes[1]!, strength: 'secondary' }
    expect(hoverConceptsOf(data)).toEqual([])
  })

  it('它應該在文章 14 的 fixture 取 7 個（第 6、7 名同為 0.62）', () => {
    expect(hoverConceptsOf(mindmap).map((n) => n.label)).toEqual([
      '雙重受眾',
      '三種實體型別',
      '節點-連結圖',
      '結構洞',
      'ISOTYPE 點群聚合',
      'force-graph',
      'degree 驅動大小',
    ])
  })
})

describe('buildHoverSpec', () => {
  it('它應該是兩階：中心直接接概念，不放分枝', () => {
    const spec = buildHoverSpec(mindmap)
    const items = [...spec.right, ...spec.left]
    expect(items.every((i) => i.kind === 'primary' && i.children.length === 0)).toBe(true)
    const branchIds = branchesOf(mindmap).map((b) => b.node.id)
    expect(items.some((i) => branchIds.includes(i.id))).toBe(false)
  })

  it('它應該把概念照資料順序從右上順時針分到左右兩邊', () => {
    const spec = buildHoverSpec(mindmap)
    // 7 個：右邊 4 個由上往下，左邊 3 個由上往下（資料順序的最後一個在左上）
    expect(ids(spec.right)).toEqual(['n6', 'n7', 'n13', 'n19'])
    expect(ids(spec.left)).toEqual(['n25', 'n24', 'n20'])
  })

  it('它應該不畫橫向線，也不畫 ↗（提示框裡不能點）', () => {
    const spec = buildHoverSpec(mindmap)
    expect(spec.links).toEqual([])
    expect(spec.center.graph).toBe(false)
    expect([...spec.right, ...spec.left].some((l) => l.graph)).toBe(false)
  })

  it('它應該在沒有概念時只剩中心', () => {
    const spec = buildHoverSpec(withConcepts([]))
    expect(spec.right).toEqual([])
    expect(spec.left).toEqual([])
  })
})

describe('buildDetailSpec', () => {
  const none = new Set<string>()

  it('它應該預設收合次要，每個有次要的分枝最後一列是「＋N 次要」', () => {
    const { spec } = buildDetailSpec(mindmap, none, linkLineLabel, false)
    const n3 = spec.right.find((b) => b.id === 'n3')!
    expect(n3.children.map((c) => c.label)).toEqual(['節點-連結圖', '＋4 次要'])
    expect(n3.children[1]!.kind).toBe('chip')
  })

  it('它應該在展開一個分枝時只露出那個分枝的次要，收合鈕改成「－ 收合次要」', () => {
    const { spec } = buildDetailSpec(mindmap, new Set(['n3']), linkLineLabel, false)
    const n3 = spec.right.find((b) => b.id === 'n3')!
    expect(n3.children.map((c) => c.label)).toEqual([
      '節點-連結圖',
      '格狀熱度圖',
      'Treemap',
      '插畫地圖／群島',
      '星圖／星座',
      '－ 收合次要',
    ])
    const n1 = spec.right.find((b) => b.id === 'n1')!
    expect(n1.children.at(-1)!.label).toBe('＋1 次要')
  })

  it('它應該讓分枝的左右不因展開而改變', () => {
    const collapsed = buildDetailSpec(mindmap, none, linkLineLabel, false).spec
    const open = buildDetailSpec(mindmap, new Set(['n1', 'n2', 'n3', 'n4', 'n5', 'n0']), linkLineLabel, false).spec
    expect(ids(open.right)).toEqual(ids(collapsed.right))
    expect(ids(open.left)).toEqual(ids(collapsed.left))
  })

  it('它應該只在有 res_id 的詞上畫 ↗', () => {
    const { spec } = buildDetailSpec(mindmap, none, linkLineLabel, false)
    const graphIds = [spec.center, ...[...spec.right, ...spec.left].flatMap((b) => [b, ...b.children])]
      .filter((l) => l.graph)
      .map((l) => l.id)
    expect(graphIds.sort()).toEqual(['n0', 'n24'])
  })

  it('它應該在開關關著時不帶任何橫向線', () => {
    const result = buildDetailSpec(mindmap, none, linkLineLabel, false)
    expect(result.spec.links).toEqual([])
    expect(result.hiddenLinkCount).toBe(0)
  })

  it('它應該在開關打開時只帶兩端都看得到的線，並數出連到收合節點的條數', () => {
    const result = buildDetailSpec(mindmap, none, linkLineLabel, true)
    expect(result.spec.links.map((l) => `${l.source}-${l.target}`)).toEqual(['n24-n13', 'n25-n24', 'n18-n7'])
    expect(result.hiddenLinkCount).toBe(4)
  })

  it('它應該在全部展開後畫出全部 7 條', () => {
    const all = new Set(['n0', 'n1', 'n2', 'n3', 'n4', 'n5'])
    const result = buildDetailSpec(mindmap, all, linkLineLabel, true)
    expect(result.spec.links).toHaveLength(7)
    expect(result.hiddenLinkCount).toBe(0)
  })

  it('它應該把本身是次要的分枝藏到全部展開（含中心 id）才露出', () => {
    const data: ArticleMindmap = {
      ...mindmap,
      nodes: mindmap.nodes.map((n) => (n.id === 'n2' ? { ...n, strength: 'secondary' as const } : n)),
    }
    const branchIds = (s: ReturnType<typeof buildDetailSpec>['spec']) => [...ids(s.right), ...ids(s.left)]
    expect(branchIds(buildDetailSpec(data, new Set(['n2']), linkLineLabel, false).spec)).not.toContain('n2')
    expect(branchIds(buildDetailSpec(data, new Set(['n0']), linkLineLabel, false).spec)).toContain('n2')
  })
})

describe('chipLabel', () => {
  it.each([
    [1, false, '＋1 次要'],
    [4, false, '＋4 次要'],
    [4, true, '－ 收合次要'],
  ])('它應該在 %i 個次要、展開=%s 時寫「%s」', (count, expanded, text) => {
    expect(chipLabel(count, expanded)).toBe(text)
  })
})

describe('linkLineLabel 與 linkPhrase', () => {
  const link = (type: string | null): MindmapLink => ({ source: 'a', target: 'b', type, origin: 'author', weight: 0.5 })

  it.each([
    { type: 'rejectedBy', line: '被否決', source: '被「B」否決', target: '否決「A」' },
    { type: 'implements', line: '實現', source: '實現「B」', target: '由「A」實現' },
    { type: 'isBasedOn', line: '依據', source: '依據「B」', target: '是「A」的依據' },
    { type: 'somethingNew', line: '相關', source: '和「B」相關', target: '和「A」相關' },
    { type: null, line: null, source: '常和「B」一起出現', target: '常和「A」一起出現' },
  ])('它應該把 $type 寫成「$line」與兩端各自的說法', ({ type, line, source, target }) => {
    expect(linkLineLabel(link(type))).toBe(line)
    expect(linkPhrase(link(type), 'source', 'B')).toBe(source)
    expect(linkPhrase(link(type), 'target', 'A')).toBe(target)
  })
})
