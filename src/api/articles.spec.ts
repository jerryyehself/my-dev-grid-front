import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchArticleOrDemo, fetchArticlesOrDemo } from './articles'
import articlesDemoFixture from '@/data/articlesDemoFixture.json'

const mockFetch = vi.fn()

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

// fetchArticles() 先查 /scopes 才打 /documentations；這裡依 URL 回應，讓失敗只落在 /documentations
function mockDocumentations(respond: () => unknown) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/scopes')) {
      return jsonResponse({ data: [{ id: 3, name: 'post', full_call_number: '0030' }] })
    }
    return respond()
  })
}

const demoId = (articlesDemoFixture as { id: number }[])[0]!.id

describe('fetchArticlesOrDemo', () => {
  it('成功時回真實資料，loadError 為 null', async () => {
    mockDocumentations(async () => jsonResponse({ data: [] }))
    const result = await fetchArticlesOrDemo()
    expect(result.loadError).toBeNull()
    expect(result.articles).toEqual([])
  })

  it('網路錯誤時退回填充內容並回報 loadError', async () => {
    mockDocumentations(async () => {
      throw new TypeError('Failed to fetch')
    })
    const result = await fetchArticlesOrDemo()
    expect(result.loadError).toBe('資料載入失敗：連不上後端 API（Failed to fetch），下面先放示範資料。')
    expect(result.articles).toEqual(articlesDemoFixture)
  })

  it('HTTP 500 時退回填充內容並回報 loadError', async () => {
    mockDocumentations(async () => jsonResponse({ message: 'Server Error' }, 500))
    const result = await fetchArticlesOrDemo()
    expect(result.loadError).toBe('資料載入失敗：GET /documentations 回傳 HTTP 500，下面先放示範資料。')
    expect(result.articles).toEqual(articlesDemoFixture)
  })
})

describe('fetchArticleOrDemo', () => {
  it('成功時回真實文章，loadError 為 null', async () => {
    const real = { id: demoId, title: 'real' }
    mockFetch.mockResolvedValue(jsonResponse(real))
    const result = await fetchArticleOrDemo(demoId)
    expect(result.loadError).toBeNull()
    expect(result.article).toEqual(real)
  })

  it('網路錯誤時退回同 id 的填充文章並回報 loadError', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await fetchArticleOrDemo(demoId)
    expect(result.loadError).toContain('Failed to fetch')
    expect(result.article.id).toBe(demoId)
  })

  it('HTTP 500 時退回同 id 的填充文章並回報 loadError', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 500))
    const result = await fetchArticleOrDemo(demoId)
    expect(result.loadError).toContain('GET /documentations/'+demoId+' 回傳 HTTP 500')
    expect(result.article.id).toBe(demoId)
  })

  it('HTTP 404 是真的不存在，不拿填充文章頂替（即使 demo 有同 id）', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Not Found' }, 404))
    await expect(fetchArticleOrDemo(demoId)).rejects.toMatchObject({ status: 404 })
  })

  it('錯誤且 demo 清單沒有這個 id 時照樣丟錯', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchArticleOrDemo(999999)).rejects.toThrow()
  })
})
