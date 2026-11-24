import { describe, expect, it } from 'vitest'
import fixture from './articleMindmapFixture.json'
import { isArticleMindmap, validateArticleMindmap } from './articleMindmapValidate'

// 每個案例都從合格的 fixture 複製一份再弄壞一處，確認驗證會擋下來（fail closed）。
type Doc = {
  article_id: unknown
  center: unknown
  status: unknown
  nodes: Array<Record<string, unknown>>
  links: Array<Record<string, unknown>>
}
function broken(mutate: (d: Doc) => void): unknown {
  const d = structuredClone(fixture) as unknown as Doc
  mutate(d)
  return d
}
const node = (d: Doc, id: string) => d.nodes.find((n) => n.id === id)!

describe('articleMindmapFixture', () => {
  it('它應該通過格式驗證', () => {
    expect(validateArticleMindmap(fixture)).toEqual([])
    expect(isArticleMindmap(fixture)).toBe(true)
  })

  it('它應該最多 2 層：每個節點到中心最多 2 步', () => {
    const byId = new Map(fixture.nodes.map((n) => [n.id, n]))
    const depths = fixture.nodes.map((n) => {
      let depth = 0
      let cur = n as { id: string; parent: string | null }
      while (cur.parent !== null) {
        cur = byId.get(cur.parent)! as typeof cur
        depth++
      }
      return depth
    })
    expect(Math.max(...depths)).toBe(2)
    expect(depths.filter((d) => d === 0)).toHaveLength(1)
  })

  it('它應該涵蓋各種情形：次要節點、有／無 res_id、有／無類型的橫向線', () => {
    expect(fixture.nodes.some((n) => n.strength === 'secondary')).toBe(true)
    expect(fixture.nodes.some((n) => n.res_id !== null)).toBe(true)
    expect(fixture.nodes.some((n) => n.res_id === null)).toBe(true)
    expect(fixture.links.some((l) => l.type !== null)).toBe(true)
    expect(fixture.links.some((l) => l.type === null)).toBe(true)
  })

  it('它應該只讓次要節點出現在第 2 層（分枝本身都是主題）', () => {
    const branchIds = new Set(fixture.nodes.filter((n) => n.parent === fixture.center).map((n) => n.id))
    for (const n of fixture.nodes) {
      if (branchIds.has(n.id) || n.id === fixture.center) expect(n.strength).toBe('primary')
    }
  })
})

describe('validateArticleMindmap 擋下壞資料', () => {
  const cases: Array<[string, unknown, string]> = [
    ['null', null, '不是物件'],
    ['陣列', [], '不是物件'],
    ['字串', 'x', '不是物件'],
    ['空物件', {}, 'article_id'],
    ['article_id 不是正整數', broken((d) => (d.article_id = 0)), 'article_id'],
    ['article_id 是字串', broken((d) => (d.article_id = '14')), 'article_id'],
    ['status 不認得', broken((d) => (d.status = 'final')), 'status'],
    ['nodes 空陣列', broken((d) => (d.nodes = [])), 'nodes'],
    ['nodes 不是陣列', broken((d) => (d.nodes = {} as never)), 'nodes'],
    ['center 指到不存在的節點', broken((d) => (d.center = 'n999')), 'center'],
    ['center 是空字串', broken((d) => (d.center = '')), 'center'],
    [
      '第 3 層（概念底下再掛一層）',
      broken((d) => (node(d, 'n6').parent = 'n9')),
      '最多只能到第 2 層',
    ],
    ['parent 指到不存在的節點', broken((d) => (node(d, 'n6').parent = 'n999')), '不存在的節點'],
    ['parent 缺欄位', broken((d) => delete node(d, 'n6').parent), 'parent'],
    ['parent 是數字', broken((d) => (node(d, 'n6').parent = 1)), 'parent'],
    [
      '第二個中心（parent 是 null）',
      broken((d) => (node(d, 'n6').parent = null)),
      '只能有一個中心',
    ],
    [
      '中心有 parent',
      broken((d) => (node(d, 'n0').parent = 'n1')),
      '中心節點的 parent 必須是 null',
    ],
    [
      'parent 成環',
      broken((d) => {
        node(d, 'n1').parent = 'n6'
        node(d, 'n6').parent = 'n1'
      }),
      '有環',
    ],
    ['節點 id 重複', broken((d) => (node(d, 'n6').id = 'n7')), '重複'],
    ['節點 id 空字串', broken((d) => (node(d, 'n6').id = '')), 'id'],
    ['label 空白', broken((d) => (node(d, 'n6').label = '  ')), 'label'],
    ['res_id 是小數', broken((d) => (node(d, 'n24').res_id = 4.5)), 'res_id'],
    ['res_id 是字串', broken((d) => (node(d, 'n24').res_id = 'technique-48')), 'res_id'],
    ['res_id 缺欄位', broken((d) => delete node(d, 'n24').res_id), 'res_id'],
    ['strength 不認得', broken((d) => (node(d, 'n6').strength = 'weak')), 'strength'],
    ['weight 超過 1', broken((d) => (node(d, 'n6').weight = 1.2)), 'weight'],
    ['weight 是 NaN', broken((d) => (node(d, 'n6').weight = Number.NaN)), 'weight'],
    ['weight 是字串', broken((d) => (node(d, 'n6').weight = '0.5')), 'weight'],
    ['units 不是陣列', broken((d) => (node(d, 'n6').units = null)), 'units'],
    [
      'unit count 是 0',
      broken((d) => (node(d, 'n6').units = [{ unit_id: 'a', count: 0 }])),
      'units[0]',
    ],
    [
      'unit_id 空字串',
      broken((d) => (node(d, 'n6').units = [{ unit_id: '', count: 1 }])),
      'units[0]',
    ],
    ['links 缺欄位', broken((d) => delete (d as Partial<Doc>).links), 'links'],
    ['link 指到不存在的節點', broken((d) => (d.links[0]!.target = 'n999')), 'links[0].target'],
    ['link 連到自己', broken((d) => (d.links[0]!.target = d.links[0]!.source)), '連到自己'],
    ['link origin 不認得', broken((d) => (d.links[0]!.origin = 'guess')), 'origin'],
    ['link type 是空字串', broken((d) => (d.links[0]!.type = '')), 'type'],
    ['link type 缺欄位', broken((d) => delete d.links[0]!.type), 'type'],
    ['link weight 小於 0', broken((d) => (d.links[0]!.weight = -0.1)), 'weight'],
  ]

  it.each(cases)('它應該擋下：%s', (name, data, expected) => {
    const errors = validateArticleMindmap(data)
    expect(errors.length, name).toBeGreaterThan(0)
    expect(errors.join('\n')).toContain(expected)
    expect(isArticleMindmap(data)).toBe(false)
  })

  it('它應該在沒有橫向關係時接受空的 links', () => {
    expect(validateArticleMindmap(broken((d) => (d.links = [])))).toEqual([])
  })
})
