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
  /**
   * 內文，Markdown 原文（D-46）。對應後端 `documentations.body` 那一欄。
   * 渲染走 `MarkdownBody.vue`：mdast → Vue vnode，不經過 v-html（D-47）。
   */
  body: string
  /** @deprecated 被 `body` 取代，等三個消費端都改完就拿掉。 */
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
    body: `## 重複到第幾次才該收斂

Rule of Three 說第三次。Martin Fowler 在《Refactoring》裡寫下來、註明是 Don Roberts 提出的：第一次直接做，第二次對重複感到不舒服但還是照做，第三次才重構。

反方向的警告一樣有名。Sandi Metz 那句「duplication is far cheaper than the wrong abstraction」描述的失敗模式很具體——A 看到重複就抽出來命名，後來需求變了，B 發現這個抽象「幾乎」適用，於是加個參數，幾輪之後那個元件變成一堆 flag 的怪物，而且回頭比往前難。

## 實際數到幾

這個站最近一次抽共用元件，我在動手之前先數過：

| 重複的東西 | 次數 |
| --- | --: |
| 卡片外框的 class 串 | 13 |
| 輸入框的 focus 樣式 | 9 |
| 小標 \`// SOMETHING\` | 18 |
| 虛線「新增」按鈕 | 4 |

第三次就該停，一路寫到第十三次都沒停——這不是判斷失誤，是**根本沒在數**。

## 收斂當場挖到的兩個 bug

這才是重點。Fowler 的規則講的是成本，真正的報酬在別的地方：同一段樣式散在九個地方時，**寫錯一個沒人看得出來**。

- 路徑查詢輸入框的聚焦外暈寫死 \`rgba(180,83,9,0.08)\`，那是淺色主題的棕色，但夜讀主題的強調色是黃色——深色底上發出一圈幾乎看不見的棕光，已經上線
- 圖譜節點的配色表有三份實作，其中一份硬寫色碼，讓[知識圖譜](/graph)跟編輯頁對同一個節點顯示不同顏色

兩個都是「值被複製過去之後就地漂移」，兩個都是抽成單一來源的當下才浮出來。

## 所以判準是什麼

不是「有沒有重複」，是**這段東西寫錯的時候，會不會有人發現**。會，那重複三次也還好；不會，那第三次就該收。
`,
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
    body: `## 色碼寫進程式碼的那一刻，主題就死了一半

這個站有兩套主題：預設的紙質淺色，跟夜讀的深色。切換靠的是一組 CSS 變數，元件只認變數名稱：

\`\`\`css
:root {
  --text-accent: #b45309;      /* 黃銅 */
  --bg-folder: rgba(146, 64, 14, 0.04);
}
.theme-terminal {
  --text-accent: #fabd2f;      /* Gruvbox 黃 */
  --bg-folder: rgba(250, 189, 47, 0.07);
}
\`\`\`

看起來很穩。實際上兩個已經上線的 bug 都是同一種：**有人把設計稿上的色碼直接抄進程式碼，而不是對回變數**。

## 案例一：看不見的聚焦外暈

路徑查詢的輸入框，聚焦時應該有一圈淡淡的外暈：

\`\`\`html
focus:shadow-[0_0_0_3px_rgba(180,83,9,0.08)]
\`\`\`

\`rgba(180,83,9)\` 就是淺色主題的 \`--text-accent\`。問題是夜讀主題的強調色是 \`#fabd2f\`——黃色。所以在深色底上，這圈外暈是**棕色的、幾乎看不見**。

修法是補一個新的語意 token，而不是在元件裡寫條件判斷：

\`\`\`css
:root          { --focus-ring: rgba(180, 83, 9, 0.08); }
.theme-terminal{ --focus-ring: rgba(250, 189, 47, 0.15); }
\`\`\`

深色底要多一點 alpha 才看得出來，比例比照 \`--bg-folder\` 的 0.04 → 0.07。

## 案例二：對不起來的節點顏色

圖譜的三個型別各有代表色，定義在 \`--node-doc\` / \`--node-tech\` / \`--node-impl\`，而且**夜讀主題那組是另外重新驗證過亮度的**，不是把淺色那組調暗。

結果編輯頁的關聯挑選器把 \`#0e8a72\` 這種色碼硬寫進一個對照表。淺色看不出問題，切到夜讀就跟[圖譜頁](/graph)上同一個節點對不起來。

## 共同點

兩個 bug 都通過了 type-check、lint 跟 build。它們不是語法錯誤，是**語意錯誤**：值是合法的，只是屬於另一個主題。

唯一抓得到的方法是逐項比對實際渲染值，而且**兩個主題都要比**。只驗淺色，這兩個都會活下來。
`,
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
    body: `## 錨點指的是那一段，還是「現在排第三的那一段」

文章頁有一個側欄目錄，點標題跳到對應段落。實作看起來理所當然：

\`\`\`html
<article v-for="(section, index) in article.sections" :id="\`section-\${index}\`">
<a :href="\`#section-\${index}\`">{{ section.heading }}</a>
\`\`\`

同一個陣列跑出來的，永遠自洽。問題在編輯頁有一顆調換段落順序的按鈕：

\`\`\`js
function moveSection(i, delta) {
  const j = i + delta
  ;[sections[i], sections[j]] = [sections[j], sections[i]]
}
\`\`\`

\`#section-2\` 的意思不是「那一段」，是「**現在排第三的那一段**」。

## 為什麼平常看不出來

因為目錄跟錨點是同一次 render、從同一個陣列產生的。你在頁面上怎麼點都不會錯。

會壞的是**被存下來的指涉**：

- 別人書籤了 \`#section-2\`
- 外部文章引用了那個錨點
- 未來的圖譜關聯指向某一個段落

這些都在你調換順序之後默默指到別的地方去，而且沒有任何錯誤訊息。

> 拿位置當身分，跟拿內容當身分（例如從標題文字推 slug）是同一種錯——改一次就斷，而且斷得無聲無息。

## 解法不是修那個按鈕

是讓身分由作者明確給定，而不是從結構推導出來：

\`\`\`markdown
## 收斂到 View {#converge-to-view}
\`\`\`

這樣標題怎麼改、段落怎麼搬，\`#converge-to-view\` 都還是指同一段。位置變了、內容變了，身分不變。

## 一個附帶的好處

改成這樣之後，「調換順序」從**會悄悄弄壞指涉**變成安全操作——因為 id 跟著那段文字一起搬。原本用來保護順序的那顆按鈕，反而是最需要被拿掉的東西。
`,
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
    body: `## 設計稿裡的 \`<style>\` 區塊就是設計系統

設計稿如果重複用到某組樣式，通常會在 \`<style>\` 裡宣告一次、用 class 套用，而不是每個元素都重寫一次行內樣式：

\`\`\`css
.lbl  { font-mono; 11px; uppercase; letter-spacing: 0.24em; bold; accent }
.hint { font-mono; 10px; letter-spacing: 0.12em; ink-muted; opacity: 0.75 }
.fld  { 1px border; radius: 6px; padding: 10px 12px; 14px; line-height: 1.6 }
\`\`\`

這四行是**設計者寫下來的權威定義**。實作端之後要為同樣的角色抽共用元件，應該從這裡長出來。

## 從程式碼逆推，會把漂移一起帶走

我抽小標元件時沒回去看這個區塊，而是讀了兩個既有頁面：一個用 0.2em，另一個用 0.24em。於是我做出兩個變體，還附上一套說法——「0.2em 用於頁面章節、0.24em 用於表單欄位」。

那套說法是**我自己編的**。設計稿從頭到尾是 0.24em，只有頁首那一處行內覆寫成 0.2em。

數值錯會被下一次比對抓到。編造的理由不會——它會被下一個人當成規則照抄。

## 逐項對完的結果

| 項目 | 設計稿 | 實作（修正前） |
| --- | --- | --- |
| 小標字距 | 一律 0.24em | 兩種變體，對調了 |
| 提示字距 | 0.12em，屬於定義 | 踢給呼叫端，多數沒補 |
| 輸入框內距 | 10px 12px | 8px 12px |
| 輸入框字級行高 | 14px / 1.6 | 沒帶 |

## 驗收要看數字，不是看截圖

肉眼比對抓得到結構問題——重複的區塊、歪掉的版面、手機的橫向溢出。抓不到「這個字距少了 0.04em」。

實際做法是把渲染後的值抓出來逐項對：

- [x] \`getComputedStyle\` 取 \`letterSpacing\`，比對 \`0.24em × 11px = 2.64px\`
- [x] 顏色要確認**變數解析後的值**對不對，不是變數名稱看起來對
- [x] 兩個主題都跑一次
- [ ] 語法高亮的配色（還沒做）

[About](/about) 頁的三個小標就是這樣對回 2.64px 的。
`,
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
