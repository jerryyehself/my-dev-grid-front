import { describe, expect, it } from 'vitest'
import fixture from './articleMindmapFixture.json'
import type { ArticleMindmap, MindmapLink } from './articleMindmapTypes'
import {
  assignSides,
  branchesOf,
  buildDetailSpec,
  buildHoverSpec,
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

describe('buildHoverSpec', () => {
  it('它應該只放主要概念，分成右邊「背景／方法論／候選圖形類型」、左邊「目前結論／關鍵轉折」', () => {
    const spec = buildHoverSpec(mindmap)
    expect(ids(spec.right)).toEqual(['n1', 'n2', 'n3'])
    expect(ids(spec.left)).toEqual(['n5', 'n4'])
    const all = [...spec.right, ...spec.left].flatMap((b) => b.children)
    expect(all.every((c) => c.kind === 'primary')).toBe(true)
    expect(all).toHaveLength(10)
  })

  it('它應該不畫橫向線，也不畫 ↗（提示框裡不能點）', () => {
    const spec = buildHoverSpec(mindmap)
    expect(spec.links).toEqual([])
    expect(spec.center.graph).toBe(false)
    expect([...spec.right, ...spec.left].flatMap((b) => [b, ...b.children]).some((l) => l.graph)).toBe(false)
  })

  it('它應該略過本身是次要的分枝', () => {
    const data: ArticleMindmap = {
      ...mindmap,
      nodes: mindmap.nodes.map((n) => (n.id === 'n2' ? { ...n, strength: 'secondary' as const } : n)),
    }
    const spec = buildHoverSpec(data)
    expect([...ids(spec.right), ...ids(spec.left)]).not.toContain('n2')
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
