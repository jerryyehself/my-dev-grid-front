import { describe, expect, it, vi } from 'vitest'

const mockFetchGraphOrDemo = vi.fn()
vi.mock('@/api/graph', () => ({ fetchGraphOrDemo: () => mockFetchGraphOrDemo() }))

import { fetchGraphPocData } from './graphPocData'

const nodes = [
  { id: 'technique-1', type: 'technique', label: 'Vue', created_at: null },
  { id: 'implementation-1', type: 'implementation', label: 'site', created_at: null },
  { id: 'documentation-1', type: 'documentation', label: 'doc', created_at: null },
]

describe('fetchGraphPocData 的 stale 欄位', () => {
  it('它應該把後端 stale: true 的邊帶成 stale: true，其餘 false', async () => {
    mockFetchGraphOrDemo.mockResolvedValue({
      dto: {
        nodes,
        edges: [
          { source: 'technique-1', target: 'implementation-1', predicate: 'uses', label: null, relation_id: 1, stale: true },
          { source: 'documentation-1', target: 'technique-1', predicate: 'specs', label: null, relation_id: 2, stale: false },
        ],
      },
      loadError: null,
    })
    const { links } = await fetchGraphPocData()
    expect(links.map((l) => l.stale)).toEqual([true, false])
  })

  it('它應該在舊版 API 沒有 stale 欄位時當成 false', async () => {
    mockFetchGraphOrDemo.mockResolvedValue({
      dto: {
        nodes,
        edges: [{ source: 'technique-1', target: 'implementation-1', predicate: 'uses', label: null, relation_id: 1 }],
      },
      loadError: null,
    })
    const { links } = await fetchGraphPocData()
    expect(links[0]?.stale).toBe(false)
  })
})
