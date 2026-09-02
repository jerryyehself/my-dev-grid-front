export interface ArticleSection {
  heading: string
  body: string
}

export interface ArticleMarginNote {
  kind: string
  text: string
  color: 'accent' | 'muted'
}

export interface Article {
  id: string
  title: string
  summary: string
  date: string
  tags: string[]
  relatedProjects?: string[]
  intro: string
  sections: ArticleSection[]
  margins?: ArticleMarginNote[]
}

export const articles: Article[] = [
  {
    id: 'vue3-large-architecture',
    title: 'Vue3 大型專案架構優化：從元件臃腫到極致純粹 View 的思維演進',
    summary:
      '本文探討在面臨中大型前端專案時，如何透過大一統 Layout 控制與事件驅動機制，將業務邏輯完全封閉在單一 View 中。拒絕過度封裝所帶來的通訊成本與黑盒子效能損耗。',
    date: '2026.07.02',
    tags: ['Vue3', 'Arch'],
    relatedProjects: ['my-dev-grid'],
    intro:
      '大型專案最容易失控的地方，不是功能數量，而是資訊邏輯散落在太多小元件中，最終讓開發者難以判斷一個行為到底由誰負責。',
    sections: [
      {
        heading: '為何要收斂到 View',
        body:
          '當一個畫面需要同時處理資料流、互動邏輯與視覺回饋時，最重要的不是把它拆得更細，而是把高頻互動收斂到單一決策點。這樣的設計能降低 context 切換，讓判斷與維護都更直接。',
      },
      {
        heading: '可維護的邏輯邊界',
        body:
          '將事件驅動與狀態處理維持在 View 層，配合適當的 Layout 與抽象層，能讓 UI 的行為邏輯可讀性提升、測試成本下降，並避免過度封裝造成的逆向理解成本。',
      },
      {
        heading: '實務收斂成果',
        body:
          '這種做法讓後續的改動不再牽一髮動全身，且在多頁面共用的設計系統下，能維持穩定的交互節奏與更清楚的責任分界。',
      },
    ],
    margins: [
      {
        kind: '延伸想法',
        text: '這篇談的「收斂到 View」在 my-dev-grid 專案的 Scope / Relation / Documentation 資料模型上就是同一套原則的延伸——事件驅動邏輯統一收在對應 View，不拆進各自的子元件。',
        color: 'accent',
      },
    ],
  },
  {
    id: 'tailwind-v4-fluid-design',
    title: 'Tailwind v4 動態光學流體排版與 CSS 變數主題系統實踐',
    summary:
      '深入探討新版 Tailwind v4 的架構特徵，如何利用純粹的 CSS 原生變數調配出具有「紙質物理收藏感」與「精裝書印刷感」的暗黑與明亮雙主題，並完美避開文字飄移感。',
    date: '2026.06.18',
    tags: ['Tailwind', 'CSS'],
    relatedProjects: ['portfolio-v4'],
    intro:
      '設計系統的核心，不是把所有顏色與尺寸都列成規則，而是讓版面節奏與閱讀節奏能在不同主題下保持一致。',
    sections: [
      {
        heading: '動態排版的關鍵',
        body:
          '在 Tailwind v4 的環境下，透過 CSS 變數與最小化的 spacing 規則，可以建立一套能兼顧流體與印刷感的排版語彙。',
      },
      {
        heading: '暗黑與明亮雙主題',
        body:
          '雙主題並不是簡單翻轉色彩，而是重新調整對比與材質層級，讓視覺密度在不同情境下仍然舒適。',
      },
    ],
    margins: [
      {
        kind: '已知限制',
        text: '這裡討論的雙主題 CSS 變數系統本身沒有型別檢查——元件實際引用到哪個 token、用多大透明度，寫錯了編譯期也不會報錯，只能用 getComputedStyle 逐項核對抓出來（見 issue #32 修的那幾處落差）。',
        color: 'muted',
      },
    ],
  },
  {
    id: 'event-driven-dom-scrolling',
    title: '為什麼在富文本與關係圖譜中，集中式事件驅動優於元件化封裝？',
    summary:
      '解析跨層級、非父子關係 DOM 尋找與閃爍滾動的底層邏輯。結合 Vue 的 emit 監聽器與原生 DOM 副作用，達成如學術論文腳註（Footnotes）般的流暢檢索跳轉體驗。',
    date: '2026.05.24',
    tags: ['Vue3', 'DOM'],
    relatedProjects: ['my-dev-grid'],
    intro:
      '在複雜的互動場景中，事件的發散與收斂通常比實體元件的拆分更值得重視。',
    sections: [
      {
        heading: '跨層級互動的難點',
        body:
          '當介面中存在非父子關係的節點，元件封裝會讓事件流變得難以追蹤。集中式事件驅動能讓頭緒更清楚，也更容易在後續擴展時掌握。',
      },
      {
        heading: '可預期的交互節奏',
        body:
          '像腳註跳轉、關係圖高亮及局部滾動這種體驗，都需要一套穩定的事件總線來協調，而不是讓每個元件各自猜測。',
      },
    ],
    margins: [
      {
        kind: '延伸想法',
        text: '跨層級事件驅動這套作法，在 my-dev-grid 的知識圖譜（/graph，2D/3D 力導向圖）節點高亮與局部捲動定位上，是同一套模式的實際延伸應用。',
        color: 'accent',
      },
    ],
  },
  {
    id: 'swiss-style-typography',
    title: '瑞士國際主義排版在數位索引介面中的光學微幾何特徵應用',
    summary:
      '當我們拋棄粗暴的粗線與 Alert Box 俗套，如何透過右端句點壓陣、微亮藍色絲織書籤 Tag 等手法，在畫面上精準分配視覺預算，打造冷冽、克制且高階的軟體工程師數位美學。',
    date: '2026.04.12',
    tags: ['Design', 'Type'],
    intro:
      '好的排版不是把元素塞滿，而是讓每一個留白都帶著目的。',
    sections: [
      {
        heading: '微幾何的力量',
        body:
          '瑞士式排版的重點在於細部節奏，而不是華麗的裝飾。靠著簡潔的間距與微妙的線條，畫面可以變得更有辨識度。',
      },
      {
        heading: '數位介面的應用',
        body:
          '在索引與資訊密度高的介面中，精準的排版節奏能讓注意力自然被引導到最重要的內容。',
      },
    ],
    margins: [
      {
        kind: '已知限制',
        text: '這篇談的是精準排版節奏，但站內實作一度只挑框架最接近的預設級距（例如 About 頁的圓角、引言字級），跟稿件字面值有落差，直到這次逐項核對（issue #32）才修正。',
        color: 'muted',
      },
    ],
  },
]

export const getArticleById = (id: string) => articles.find((article) => article.id === id)
