import type { RouteLocationRaw } from 'vue-router'
import type { GraphNodeType } from '@/api/graph'

// 圖譜節點「連去哪」：首頁知識網路的彈窗跟 /graph 的詳情卡共用同一套規則，
// 不要兩邊各寫一份。規則全部從資料推得出來，新增文章或專案不用回來維護這裡。
//
// - 文章（documentation，subtype = post）→ 站內文章頁
// - 參考資料（documentation，例如 subtype = sourcesite 的官方文件）→ 它自己的外部網址
// - 專案（implementation）→ 專案頁，用後端 id 選中那一筆（專案頁的 PROJ-YYYY-NN
//   是前端算的顯示用編號，圖譜資料裡沒有）
// - 技術（technique）→ 站上沒有技術頁，不給連結
//
// subtype／url 是後端 2026-09-30 才加進 /api/graph 的欄位；舊的示範資料快照沒有，
// 這時文章節點就不給連結，而不是猜一個網址。
export type GraphNodeLink =
  | { kind: 'internal'; to: RouteLocationRaw; text: string }
  | { kind: 'external'; href: string; text: string }

export interface LinkableGraphNode {
  id: string
  domainType: GraphNodeType
  subtype?: string | null
  url?: string | null
}

function rawIdOf(nodeId: string): number | null {
  const n = Number(nodeId.split('-')[1])
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * 這個節點是不是站上自己的文章，是的話回文章 id（給登入後的「編輯這篇」用）。
 * 跟 graphNodeLink 的「連到站內文章頁」是同一條判斷，抽出來共用，兩邊不會各自漂移——
 * 參考資料（外部官方文件）、技術、專案都不是站上能編的文章，一律回 null。
 */
export function articleIdOfGraphNode(node: LinkableGraphNode): number | null {
  if (node.domainType !== 'documentation' || node.subtype !== 'post') return null
  return rawIdOf(node.id)
}

export function graphNodeLink(node: LinkableGraphNode): GraphNodeLink | null {
  const articleId = articleIdOfGraphNode(node)
  if (articleId != null) {
    return { kind: 'internal', to: { name: 'article-detail', params: { id: articleId } }, text: '閱讀這篇文章 →' }
  }

  const id = rawIdOf(node.id)
  if (id == null) return null

  if (node.domainType === 'documentation') {
    if (node.url) return { kind: 'external', href: node.url, text: '前往原始網站 ↗' }
    return null
  }

  if (node.domainType === 'implementation') {
    return { kind: 'internal', to: { path: '/projects', query: { implementation: String(id) } }, text: '看這個專案 →' }
  }

  return null
}
