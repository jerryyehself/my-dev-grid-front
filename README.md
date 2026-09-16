# my-dev-grid-frontend

用 Vue 3 + Vite 開發的個人網站。

## 視覺設計稿

目前實作照著這份 Claude Design 畫布走(五個頁面的版面結構重新設計,主題色票沿用既有 token):

**[My Dev Grid Site Redesign](https://claude.ai/code/artifact/41b6b24a-8dbd-4f19-a366-ed14221f202b)**

改版面/字體/共用元件前,先跟這份對一下,確認是刻意偏離(例如某段文案改用真實內容取代設計稿的示範文案)還是單純沒對齊。

**設計稿 `<style>` 區塊裡的 class 就是那份設計的共用元件定義**(`.lbl`、`.hint`、`.fld`、`.chip` 這類)。要為同樣的角色抽共用元件時,數值從那裡拿,不要從既有程式碼逆推——既有程式碼可能已經漂移了,逆推會把漂移一起保留下來,還給它一個具名元件的權威。實際踩過:小標元件當初讀了兩個彼此不一致的頁面,做出設計稿沒有的兩種字距,還附上一套設計稿從沒講過的理由。細節見 `my-dev-grid-skills` 的 `mockup-fidelity` skill。

另外,**重構會讓對稿失效**。把重複的 class 串收斂成共用元件等於重寫了當初對過的那些值,而重新裂開的落差是型別安全、lint 乾淨、build 通過的（Vue SFC 的 template 不走型別檢查,改錯的值也還是合法 CSS）。抽完元件要重新對一次數值,不能只看截圖。

### 區域設計稿

- **Projects 頁篩選器(標籤左、選項右)**:
  - Design: [Projects Filter (Label Left)](https://claude.ai/code/artifact/17ede728-b7b3-4b2d-9f0c-7bdd3a1e0490)
  - 技術決策:
    - CSS Grid 佈局: `grid-cols-[64px_1fr]` 搭配 `items-baseline` 精準對齊標籤名稱與標籤群組文字基線
    - 標籤換行: 用 `flex-wrap` 搭配 `min-width: 0` 避免浮動對齊問題
  - PR: [#47](https://github.com/jerryyehself/my-dev-grid-front/pull/47)

其他相關設計稿(較早期草稿、Home 頁參考等)、每一份的現況/是否還算數,見 `my-dev-grid-skills` 的 [`docs/design-artifacts.md`](https://github.com/jerryyehself/my-dev-grid-skills/blob/main/docs/design-artifacts.md)——那份是持續維護的活索引,這裡不重複列。

## 共用元件

`src/components/` 底下只用 Vue 官方慣例的兩個前綴,不發明第三種:

- **`Base*`** — 沒有商業邏輯、到處可重用的呈現元件。設計決定要變成共用的東西時放這裡,而不是每個 view 各自重寫一次。目前有 `BaseButton` / `BaseCard` / `BaseTag` / `BaseInput` / `BaseTextarea` / `BaseField` / `BaseEyebrow` / `BaseHint` / `BaseLoadingBlock`。
- **`The*`** — 每頁只會出現一次的元件(`TheNavbar`)。

新需求先看能不能變成既有元件的 variant(`BaseCard` 的 `card`/`panel`、`BaseButton` 的 `primary`/`ghost`/`tab`/`page`/`add`),而不是再開一個名字不同、長得幾乎一樣的元件。

什麼時候該抽:同一段東西重複第三次(Rule of Three)。但真正的報酬不是省行數,是**同一個值散在九個地方時寫錯沒人看得出來**——這個 repo 已經因此上線過兩個 bug(聚焦外暈與圖譜節點配色都把淺色主題的色碼硬寫進去,夜讀主題下就失效),兩個都是收斂成單一來源的當下才浮出來。

主題色票、字級、動畫的判準見 `.claude/skills/visual-design-language/SKILL.md`。

## 文章內文的渲染

文章內文是 **Markdown 原文**(後端 `documentations.body`),渲染走 `src/components/markdown/MarkdownBody.vue`:`remark` 解析成 mdast,再一個節點對一個 `h()` 呼叫產生 Vue vnode。

**不用 `v-html`**,三個理由:

1. 站內連結要是真的 `<RouterLink>`。`v-html` 塞進去的 `<a>` 是原生連結,點下去整頁重新載入,SPA 的路由與捲動位置全部重來
2. 樣式直接沿用站上既有的 token 與 `//` 前綴標題,不用再寫一份 `.prose` 把同一組值定義第二次
3. 不需要消毒器。實測 `marked`(13.1KB) + `dompurify`(11.1KB) = 24.2KB,比 `unified` + `remark-parse` 的 20.6KB 還大

標題的 `id` 與「本文結構」目錄的 `href` 都來自 `components/markdown/headings.ts` 的 `extractHeadings()`——**只有這一個來源**。兩邊各自算 slug 會漂移,而漂移的症狀是「點目錄沒反應」,不會有任何錯誤訊息。

## 建議的 IDE 設定

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)(記得停用 Vetur)。

## 建議的瀏覽器設定

- Chromium 系瀏覽器(Chrome、Edge、Brave 等):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [開啟 Chrome DevTools 的 Custom Object Formatter](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [開啟 Firefox DevTools 的 Custom Object Formatter](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## `.vue` 檔案在 TS 裡的型別支援

TypeScript 預設無法處理 `.vue` 檔案的型別資訊,所以改用 `vue-tsc` 取代 `tsc` CLI 做型別檢查。編輯器裡則需要 [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 讓 TypeScript language service 認得 `.vue` 型別。

## 自訂設定

參考 [Vite 設定文件](https://vite.dev/config/)。

## 專案設置

```sh
npm install
```

### 開發模式(Compile + Hot-Reload)

```sh
npm run dev
```

### 型別檢查、編譯並壓縮成正式版

```sh
npm run build
```

### 用 [ESLint](https://eslint.org/) 檢查

```sh
npm run lint
```
