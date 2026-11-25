import { describe, expect, it } from 'vitest'
import { extractHeadings } from '@/components/markdown/headings'
import fixture from './articleMindmapFixture.json'
import productionBody from './data/articleMindmap14Body.md?raw'

// data/articleMindmap14Body.md 是正式環境那篇文章（id 14）內文的快照，2026-11-25 從正式 API 取得（跟 11-24 那份相同）。
// 測試時不去抓，免得測試結果跟著線上內容變。文章改版改到標題時，要重抓快照、重對 fixture 的出處。
const slugs = new Set(extractHeadings(productionBody).map((h) => h.slug))

describe('articleMindmapFixture', () => {
  it('它應該對到快照的 14 個標題（快照本身沒讀錯）', () => {
    expect(slugs.size).toBe(14)
    expect(slugs.has('資料條件')).toBe(true)
    expect(slugs.has('一張圖不分版本')).toBe(true)
  })

  it.each(fixture.nodes.flatMap((n) => n.units.map((u) => [n.label, u.unit_id] as const)))(
    '它應該讓「%s」的出處 %s 對得上正式環境內文的標題',
    (...[, unitId]) => {
      expect(slugs.has(unitId)).toBe(true)
    },
  )

  it('它應該讓 fixture 是正式環境那篇的 id', () => {
    expect(fixture.article_id).toBe(14)
  })
})
