import type { Component } from 'vue'
import AboutSketchEvidence from './AboutSketchEvidence.vue'
import AboutSketchInsight from './AboutSketchInsight.vue'
import AboutSketchIntegration from './AboutSketchIntegration.vue'
import AboutSketchReview from './AboutSketchReview.vue'

/** 卡片「確認詳情」底下的一個連結：站內路徑，或 http／https 開頭的站外網址（開新分頁） */
export interface AboutCardLink {
  label: string
  to: string
}

export interface AboutCardData {
  id: string
  title: string
  situation: string
  /**
   * 「確認詳情」底下的連結，每個連結的文字就是所連文章或論文的標題。空陣列就不顯示「確認詳情」，也不放任何提示文字；
   * 有了就把 { label, to } 補進來；to 是 http／https 開頭的就當站外連結。
   */
  links: AboutCardLink[]
  sketch: Component
}

/** 「工作模式與理念」的四張卡片，順序照頁面由上到下 */
export const ABOUT_CARDS: AboutCardData[] = [
  {
    id: 'integration',
    title: '跨域整合',
    situation: '把圖資與教學的成熟方法，轉化成系統設計',
    links: [{ label: '文章列表與內頁放哪些資訊：讀者資訊行為研究整理', to: '/articles/17' }],
    sketch: AboutSketchIntegration,
  },
  {
    id: 'insight',
    title: '需求洞察',
    situation: '找出使用者沒說出口、但用了會接受的需求',
    links: [
      {
        label: '小說讀者資訊尋找心智模型與FRBR之比較研究',
        to: 'https://www.airitilibrary.com/Article/Detail/U0002-2307202123134400',
      },
    ],
    sketch: AboutSketchInsight,
  },
  {
    id: 'evidence',
    title: '實證導向',
    situation: '決策看證據，有新證據就修正',
    links: [{ label: 'Claude Code 協作開發的省 token 機制盤點', to: '/articles/16' }],
    sketch: AboutSketchEvidence,
  },
  {
    id: 'review',
    title: '持續評鑑',
    situation: '定期檢視成果，依現況調整方向',
    links: [{ label: '首頁知識網路採用節點連結圖：設計決策紀錄', to: '/articles/14' }],
    sketch: AboutSketchReview,
  },
]
