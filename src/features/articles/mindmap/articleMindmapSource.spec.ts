import { describe, expect, it, vi } from 'vitest'
import fixture from './articleMindmapFixture.json'
import {
  MINDMAP_ARTICLE_IDS,
  createMindmapLoader,
  fetchPublishedMindmap,
  hasArticleMindmap,
  loadArticleMindmap,
  mindmapArticleIds,
} from './articleMindmapSource'

describe('mindmapArticleIds', () => {
  it('它應該在正式 build 是已發布、有資料的那 6 篇', () => {
    expect([...mindmapArticleIds(false)]).toEqual([12, 13, 14, 15, 16, 17])
  })

  it('它應該在開發與測試時是 fixture 那篇', () => {
    expect([...mindmapArticleIds(true)]).toEqual([fixture.article_id])
  })
})

describe('hasArticleMindmap', () => {
  it('它應該在測試（DEV）時跟 fixture 的 article_id 一致', () => {
    expect(import.meta.env.DEV).toBe(true)
    expect([...MINDMAP_ARTICLE_IDS]).toEqual([fixture.article_id])
  })

  it.each([
    [fixture.article_id, true],
    [fixture.article_id - 1, false],
    [fixture.article_id + 1, false],
    [0, false],
    [Number.NaN, false],
  ])('它應該對文章 %s 回 %s', (id, expected) => {
    expect(hasArticleMindmap(id)).toBe(expected)
  })
})

describe('createMindmapLoader', () => {
  const id = fixture.article_id

  it('它應該在文章沒有心智圖時回 null，而且不去載資料', async () => {
    const fetchData = vi.fn()
    const load = createMindmapLoader(fetchData)
    expect(await load(id + 1)).toBeNull()
    expect(fetchData).not.toHaveBeenCalled()
  })

  it('它應該回傳合格的資料，第二次不再載', async () => {
    const fetchData = vi.fn().mockResolvedValue(fixture)
    const load = createMindmapLoader(fetchData)
    expect((await load(id))?.center).toBe('n0')
    await load(id)
    expect(fetchData).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['不合格式', { ...fixture, nodes: [] }],
    ['不是這篇的', { ...fixture, article_id: id + 1 }],
    ['null', null],
    ['undefined', undefined],
  ])('它應該在資料%s時回 null', async (...[, data]) => {
    const load = createMindmapLoader(() => Promise.resolve(data))
    expect(await load(id)).toBeNull()
  })

  it('它應該在載入失敗時回 null，下一次再試', async () => {
    const fetchData = vi.fn().mockRejectedValueOnce(new Error('chunk gone')).mockResolvedValueOnce(fixture)
    const load = createMindmapLoader(fetchData)
    expect(await load(id)).toBeNull()
    expect((await load(id))?.article_id).toBe(id)
    expect(fetchData).toHaveBeenCalledTimes(2)
  })
})

describe('loadArticleMindmap', () => {
  it('它應該載得到 fixture 本身（真的動態 import）', async () => {
    const data = await loadArticleMindmap(fixture.article_id)
    expect(data?.nodes).toHaveLength(28)
  })
})

describe('fetchPublishedMindmap（正式 build 的資料來源）', () => {
  it('它應該載得到有資料那篇的分塊', async () => {
    const data = (await fetchPublishedMindmap(17)) as { article_id: number }
    expect(data.article_id).toBe(17)
  })

  it.each([11, 18, 0, -1, 12.5, Number.NaN])('它應該對沒有資料的文章 %s 回 null', async (id) => {
    expect(await fetchPublishedMindmap(id)).toBeNull()
  })

  it('它應該讓正式 build 的載入函式通過格式驗證、對到那篇', async () => {
    const load = createMindmapLoader(fetchPublishedMindmap)
    // 測試環境是 DEV，hasArticleMindmap 只認 fixture 那篇（14），所以拿 14 走完整流程
    expect((await load(14))?.nodes.length).toBeGreaterThan(0)
  })
})
