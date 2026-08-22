// 知識圖譜技術驗證（POC）用的假資料。
// 刻意做出「少數高權重核心點子 + 大量低權重背景筆記」的分布，
// 這樣才能真的測出「權重驅動的視覺放大/呼吸燈」在兩種技術下的呈現差異。

export interface GraphPocNode {
  id: string
  label: string
  weight: number // 0~1，越高代表越核心的想法
  tags: string[]
  daysSinceAccessed: number // 越大代表越久沒被打開，用於「退到背景」的判斷
}

export interface GraphPocLink {
  source: string
  target: string
  kind: 'related' | 'inspiration' // inspiration = 靈感對撞機拉出的虛線
}

const coreIdeas: GraphPocNode[] = [
  { id: 'idea-km-graph', label: '知識圖譜引擎', weight: 0.95, tags: ['KM', 'Graph'], daysSinceAccessed: 0 },
  { id: 'idea-session-cache', label: 'Redis Session 快取', weight: 0.82, tags: ['Backend', 'Redis'], daysSinceAccessed: 2 },
  { id: 'idea-theme-system', label: '雙主題 CSS 變數系統', weight: 0.7, tags: ['Frontend', 'CSS'], daysSinceAccessed: 5 },
]

const supportingNotes: GraphPocNode[] = Array.from({ length: 18 }, (_, i) => ({
  id: `note-${i}`,
  label: `筆記 #${i + 1}`,
  weight: Math.random() * 0.35,
  tags: ['Note'],
  daysSinceAccessed: 10 + Math.floor(Math.random() * 60),
}))

export const graphPocNodes: GraphPocNode[] = [...coreIdeas, ...supportingNotes]

export const graphPocLinks: GraphPocLink[] = [
  { source: 'idea-km-graph', target: 'idea-theme-system', kind: 'related' },
  { source: 'idea-km-graph', target: 'note-0', kind: 'related' },
  { source: 'idea-km-graph', target: 'note-1', kind: 'related' },
  { source: 'idea-session-cache', target: 'note-2', kind: 'related' },
  { source: 'idea-session-cache', target: 'note-3', kind: 'related' },
  { source: 'idea-theme-system', target: 'note-4', kind: 'related' },
  // 這條是關鍵測試案例：兩個久未互相參照、但語意相似的節點，被「靈感對撞機」拉出來
  { source: 'idea-session-cache', target: 'idea-theme-system', kind: 'inspiration' },
  ...Array.from({ length: 10 }, (_, i) => ({
    source: `note-${i}`,
    target: `note-${(i + 3) % 18}`,
    kind: 'related' as const,
  })),
]
