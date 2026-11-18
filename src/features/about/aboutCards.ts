import type { Component } from 'vue'
import AboutSketchEvidence from './AboutSketchEvidence.vue'
import AboutSketchInsight from './AboutSketchInsight.vue'
import AboutSketchIntegration from './AboutSketchIntegration.vue'
import AboutSketchReview from './AboutSketchReview.vue'

/** 卡片「確認詳情」底下的一個連結：站內文章的路徑 */
export interface AboutCardLink {
  label: string
  to: string
}

export interface AboutCardData {
  id: string
  title: string
  situation: string
  /**
   * 「確認詳情」的文章連結。空陣列就不顯示「確認詳情」，也不放任何提示文字；
   * 文章有了之後把 { label, to } 補進來即可。
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
    links: [],
    sketch: AboutSketchIntegration,
  },
  {
    id: 'insight',
    title: '需求洞察',
    situation: '找出使用者沒說出口、但用了會接受的需求',
    links: [],
    sketch: AboutSketchInsight,
  },
  {
    id: 'evidence',
    title: '實證導向',
    situation: '決策看證據，有新證據就修正',
    links: [],
    sketch: AboutSketchEvidence,
  },
  {
    id: 'review',
    title: '持續評鑑',
    situation: '定期檢視成果，依現況調整方向',
    links: [],
    sketch: AboutSketchReview,
  },
]
