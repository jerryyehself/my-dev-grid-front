import type { MindmapNode } from './articleMindmapTypes'

// 連到圖譜：資料留著 res_id，但目前不畫任何連到圖譜的連結（站主 2026-11-25：圖譜頁的行為要先改）。
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
 */
export function unitLinksOf(node: MindmapNode, headings: readonly MindmapHeading[]): MindmapUnitLink[] {
  const order = new Map(headings.map((h, i) => [h.slug, i]))
  return node.units
    .filter((u) => order.has(u.unit_id))
    .sort((a, b) => order.get(a.unit_id)! - order.get(b.unit_id)!)
    .map((u) => ({ slug: u.unit_id, text: headings[order.get(u.unit_id)!]!.text, count: u.count }))
}
