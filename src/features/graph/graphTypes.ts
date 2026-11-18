import type { NodeObject, LinkObject } from 'force-graph'
import type { GraphNodeType } from '@/api/graph'

// 共用圖譜畫布（KnowledgeGraphCanvas.vue）力模擬用的節點／邊形狀。
// 首頁與 /graph 2D 原本各自定義一份（KnowledgeGraphPanel.vue 的 SimNode、GraphPoc2D.vue 的
// GraphPocNode & NodeObject），合併成同一個元件後只留這一份（D-87）。
export interface SimNode extends NodeObject {
  id: string
  domainType: GraphNodeType
  label: string
  degree: number
  createdAt: string | null
  subtype: string | null
  url: string | null
}

export interface SimLink extends LinkObject<SimNode> {
  predicate: string | null
  label?: string | null
  // 後端標記的過期邊（同步很久沒看到）：沒有這個欄位（舊版 API）就當 false，畫面上淡化
  stale?: boolean
  // 推導邊（bipartite projection，見 derivedEdges.ts）專用欄位：
  // derived 標記這條邊不是資料庫真實關聯；via 記錄促成這條推導關係的共同
  // 鄰居 id，用在 tooltip/popover 上讓使用者看得懂「為什麼這兩個算相關」。
  derived?: boolean
  via?: string[]
}

export const TYPE_LABEL: Record<GraphNodeType, string> = {
  documentation: '文件',
  technique: '技術',
  implementation: '實作',
}

/**
 * 單一節點的類別名稱（點節點的小卡、滑過提示、詳情卡的標題）。圖例與「突顯類別」鈕講的是整個
 * documentation 類，叫「文件」；但這一類同時裝著站主的文章（subtype post）和官方文件
 * （sourcesite、document），單一節點要說清楚是哪一種：文章、官方文件。subtype 空的
 * （未公開條目）或其他子類，退回類別名「文件」。
 */
export function nodeKindLabel(n: { domainType: GraphNodeType; subtype?: string | null }): string {
  if (n.domainType === 'documentation') {
    if (n.subtype === 'post') return '文章'
    if (n.subtype === 'sourcesite' || n.subtype === 'document') return '官方文件'
  }
  return TYPE_LABEL[n.domainType]
}

export function endpointId(x: string | number | { id: string } | undefined): string {
  if (x == null) return ''
  return typeof x === 'object' ? x.id : String(x)
}
