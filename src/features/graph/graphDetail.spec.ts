import { describe, expect, it } from 'vitest'
import type { GraphDto, GraphNodeType } from '@/api/graph'
import {
  buildGraphDetailIndex,
  detailNodeOf,
  indirectRelationsOf,
  nodeSelectionOf,
  relationGroupsOf,
} from './graphDetail'

const node = (
  id: string,
  type: GraphNodeType,
  label: string,
  extra: Partial<GraphDto['nodes'][number]> = {},
) => ({
  id,
  type,
  label,
  created_at: null,
  ...extra,
})
const edge = (source: string, target: string, predicate: string) => ({
  source,
  target,
  predicate,
  label: predicate,
  relation_id: null,
})

// 照真實資料的形狀縮小：官方文件 specs 技術、技術 uses 專案、技術 requires 技術
const dto: GraphDto = {
  nodes: [
    node('documentation-5', 'documentation', 'vue 官方文件', {
      subtype: 'sourcesite',
      url: 'https://vuejs.org/',
    }),
    node('technique-29', 'technique', 'vue'),
    node('technique-3', 'technique', 'JavaScript'),
    node('technique-11', 'technique', 'TypeScript'),
    node('technique-8', 'technique', 'laravel'),
    node('implementation-2', 'implementation', 'my-dev-grid-front'),
    node('implementation-4', 'implementation', 'isbn-scanner'),
    node('implementation-1', 'implementation', 'my-dev-grid'),
  ],
  edges: [
    edge('documentation-5', 'technique-29', 'specs'),
    edge('technique-29', 'technique-3', 'requires'),
    edge('technique-29', 'implementation-4', 'uses'),
    edge('technique-29', 'implementation-2', 'uses'),
    // 同一對節點重複的邊只算一次
    edge('technique-29', 'implementation-2', 'uses'),
    edge('technique-3', 'implementation-2', 'uses'),
    edge('technique-3', 'implementation-4', 'uses'),
    edge('technique-11', 'implementation-2', 'uses'),
    edge('technique-11', 'implementation-4', 'uses'),
    edge('technique-8', 'implementation-1', 'uses'),
    // 指到不存在節點的邊略過
    edge('technique-29', 'implementation-999', 'uses'),
  ],
}
const index = buildGraphDetailIndex(dto)
const labels = (ns: { label: string }[]) => ns.map((n) => n.label)

describe('relationGroupsOf', () => {
  it('它應該依對方類別分組（技術→實作→文件）並在組內依名稱排序，當查詢技術時', () => {
    const groups = relationGroupsOf(index, 'technique-29')
    expect(groups.map((g) => [g.label, labels(g.nodes)])).toEqual([
      ['技術', ['JavaScript']],
      ['實作', ['isbn-scanner', 'my-dev-grid-front']],
      ['文件', ['vue 官方文件']],
    ])
  })

  it('它應該把技術放在一組且不受邊存的方向影響，當查詢實作時', () => {
    expect(
      relationGroupsOf(index, 'implementation-2').map((g) => [g.label, labels(g.nodes)]),
    ).toEqual([['技術', ['JavaScript', 'TypeScript', 'vue']]])
  })

  it('它應該回傳技術分組，當查詢文件時', () => {
    expect(
      relationGroupsOf(index, 'documentation-5').map((g) => [g.label, labels(g.nodes)]),
    ).toEqual([['技術', ['vue']]])
  })

  it('它應該回空陣列，當節點沒有關係或查不到時', () => {
    expect(relationGroupsOf(index, 'nope')).toEqual([])
  })

  it('它應該把版本另成一組排在主技術那端最前，並在版本那端把主技術視為「技術」', () => {
    const v = buildGraphDetailIndex({
      nodes: [
        node('technique-1', 'technique', 'Vue'),
        node('technique-2', 'technique', 'Vue 3'),
        node('technique-3', 'technique', 'JavaScript'),
        node('technique-4', 'technique', 'Nuxt'),
        node('technique-5', 'technique', 'Nuxt 3'),
      ],
      edges: [
        edge('technique-2', 'technique-1', 'isVersionOf'),
        edge('technique-1', 'technique-3', 'requires'),
        // 反向述詞也認得
        edge('technique-4', 'technique-5', 'hasVersion'),
      ],
    })
    const brief = (id: string) => relationGroupsOf(v, id).map((g) => [g.label, labels(g.nodes)])
    expect(brief('technique-1')).toEqual([
      ['版本', ['Vue 3']],
      ['技術', ['JavaScript']],
    ])
    expect(brief('technique-2')).toEqual([['技術', ['Vue']]])
    expect(brief('technique-4')).toEqual([['版本', ['Nuxt 3']]])
    expect(brief('technique-5')).toEqual([['技術', ['Nuxt']]])
  })
})

describe('indirectRelationsOf', () => {
  it('它應該跟畫布用同一套推算，在兩個實作共用 3 項技術時才算並列出兩邊都連到的節點', () => {
    expect(indirectRelationsOf(index, 'implementation-2')).toEqual([
      {
        node: { id: 'implementation-4', label: 'isbn-scanner', domainType: 'implementation' },
        via: [
          { id: 'technique-3', label: 'JavaScript', domainType: 'technique' },
          { id: 'technique-11', label: 'TypeScript', domainType: 'technique' },
          { id: 'technique-29', label: 'vue', domainType: 'technique' },
        ],
      },
    ])
    // 兩個方向都查得到
    expect(indirectRelationsOf(index, 'implementation-4').map((r) => r.node.id)).toEqual([
      'implementation-2',
    ])
  })

  it('它應該沒有間接關聯，當共用不夠多或是技術節點（不推算）時', () => {
    expect(indirectRelationsOf(index, 'implementation-1')).toEqual([])
    expect(indirectRelationsOf(index, 'technique-29')).toEqual([])
  })

  it('它應該讓共同連到越多的排越前面', () => {
    const big = buildGraphDetailIndex({
      nodes: [
        node('d1', 'documentation', 'A'),
        node('d2', 'documentation', 'B'),
        node('d3', 'documentation', 'C'),
        node('t1', 'technique', 't1'),
        node('t2', 'technique', 't2'),
      ],
      edges: [
        edge('d1', 't1', 'specs'),
        edge('d1', 't2', 'specs'),
        edge('d2', 't1', 'specs'),
        edge('d3', 't1', 'specs'),
        edge('d3', 't2', 'specs'),
      ],
    })
    expect(indirectRelationsOf(big, 'd1').map((r) => [r.node.label, r.via.length])).toEqual([
      ['C', 2],
      ['B', 1],
    ])
  })
})

describe('nodeSelectionOf', () => {
  it('它應該組出跟畫布點節點時一樣的選取格式，關係數不重複計算', () => {
    expect(nodeSelectionOf(index, 'documentation-5')).toEqual({
      kind: 'node',
      id: 'documentation-5',
      label: 'vue 官方文件',
      domainType: 'documentation',
      weight: 1 / 4,
      degree: 1,
      subtype: 'sourcesite',
      url: 'https://vuejs.org/',
    })
    expect(nodeSelectionOf(index, 'technique-29')?.degree).toBe(4)
    expect(nodeSelectionOf(index, 'nope')).toBeNull()
  })
})

describe('detailNodeOf', () => {
  it('它應該回 null，當索引還沒載入或查不到時', () => {
    expect(detailNodeOf(null, 'technique-29')).toBeNull()
    expect(detailNodeOf(index, 'nope')).toBeNull()
    expect(detailNodeOf(index, 'technique-29')).toEqual({
      id: 'technique-29',
      label: 'vue',
      domainType: 'technique',
    })
  })
})
