import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchGraphOrDemo } from './graph'
import graphDemoFixture from '@/data/graphDemoFixture.json'

const mockFetch = vi.fn()

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

describe('fetchGraphOrDemo', () => {
  it('成功時回真實資料，loadError 為 null', async () => {
    const real = { nodes: [], edges: [] }
    mockFetch.mockResolvedValue(jsonResponse(real))
    expect(await fetchGraphOrDemo()).toEqual({ dto: real, loadError: null })
  })

  it('網路錯誤時退回快照並回報 loadError', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await fetchGraphOrDemo()).toEqual({
      dto: graphDemoFixture,
      loadError: '資料載入失敗：連不上後端 API（Failed to fetch），下面先放示範資料。',
    })
  })

  it('HTTP 500 時退回快照並回報 loadError', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 500))
    expect(await fetchGraphOrDemo()).toEqual({
      dto: graphDemoFixture,
      loadError: '資料載入失敗：GET /graph 回傳 HTTP 500，下面先放示範資料。',
    })
  })
})
