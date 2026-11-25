import { slugify } from '@/components/markdown/headings'
import type { MindmapNode } from './articleMindmapTypes'

// 連到圖譜：資料留著 res_id，但目前不畫任何連到圖譜的連結（圖譜頁還沒有配合這種連結的行為，等它支援再畫）。
// 圖譜頁沒有「打開就選中某個節點」的網址，res_id 也還沒帶類型（圖譜節點 id 是「類型-編號」，
// 編號跨類型會重複）；這兩件事定了再接回來。

/** 內文標題（extractHeadings 的結果），只用得到 slug 與文字 */
export interface MindmapHeading {
  slug: string
  text: string
}

export interface MindmapUnitLink {
  slug: string
  text: string
  count: number
}

/**
 * 一個詞的出處，換成連得到內文的段落：只留對得上內文標題的 unit（對不上的連過去不會動，不如不列），
 * 照標題在文章裡的順序排。
 *
 * 先比標題的 slug（內文標題的 id）；比不到，再比「標題文字推出來的 slug」。後面這層是給
 * 標題後來補上 `{#id}` 的文章用的：資料的 unit_id 是補 id 之前、從標題文字推出來的 slug，
 * 文章重新匯入、標題 id 換成明確 ID 之後，只要標題文字沒改，出處照樣連得到（連結用標題現在的 id）。
 * 同一個段落只列一次。
 */
export function unitLinksOf(node: MindmapNode, headings: readonly MindmapHeading[]): MindmapUnitLink[] {
  const bySlug = new Map(headings.map((h, i) => [h.slug, i]))
  const byText = new Map<string, number>()
  headings.forEach((h, i) => {
    const s = slugify(h.text)
    if (!byText.has(s)) byText.set(s, i)
  })
  const seen = new Set<number>()
  const found: { index: number; count: number }[] = []
  for (const u of node.units) {
    const index = bySlug.get(u.unit_id) ?? byText.get(u.unit_id)
    if (index === undefined || seen.has(index)) continue
    seen.add(index)
    found.push({ index, count: u.count })
  }
  return found
    .sort((a, b) => a.index - b.index)
    .map(({ index, count }) => ({ slug: headings[index]!.slug, text: headings[index]!.text, count }))
}
