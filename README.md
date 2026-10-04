# my-dev-grid-frontend

用 Vue 3 + Vite 開發的個人網站，網址 `jerrylib.com`（部署在 Cloudflare，正式公開前用 Cloudflare Access 鎖住）。

## 視覺設計稿

五個頁面的版面結構最早照 **[My Dev Grid Site Redesign](https://claude.ai/code/artifact/41b6b24a-8dbd-4f19-a366-ed14221f202b)** 這份 Claude Design 畫布做。之後有幾項全站改動已經取代它：配色換成藏青第二版（D-59），標題字型換成 Noto Serif TC、字標換成 Libre Caslon（D-60），About 頁照另一份 E 版設計稿重寫。網站 icon、選中狀態、字級這類全站比較，收在另一份 canvas。

哪份設計稿現在還算數、各自管哪一塊，以 `my-dev-grid-skills` 的 [`docs/design-artifacts.md`](https://github.com/jerryyehself/my-dev-grid-skills/blob/main/docs/design-artifacts.md) 為準。改版面／字體／共用元件前先查那裡，確認是刻意偏離，還是單純沒對齊。

網站 icon 與社群分享圖由 `design/icon/build.mjs` 產生（見 `design/icon/README.md`），輸出在 `public/`。

**設計稿 `<style>` 區塊裡的 class 就是那份設計的共用元件定義**(`.lbl`、`.hint`、`.fld`、`.chip` 這類)。要為同樣的角色抽共用元件時,數值從那裡拿,不要從既有程式碼逆推——既有程式碼可能已經漂移了,逆推會把漂移一起保留下來,還給它一個具名元件的權威。實際踩過:小標元件當初讀了兩個彼此不一致的頁面,做出設計稿沒有的兩種字距,還附上一套設計稿從沒講過的理由。細節見 `my-dev-grid-skills` 的 `mockup-fidelity` skill。

另外,**重構會讓對稿失效**。把重複的 class 串收斂成共用元件等於重寫了當初對過的那些值,而重新裂開的落差是型別安全、lint 乾淨、build 通過的（Vue SFC 的 template 不走型別檢查,改錯的值也還是合法 CSS）。抽完元件要重新對一次數值,不能只看截圖。

### 區域設計稿

- **Projects 頁篩選器(標籤左、選項右)**:
  - Design: [Projects Filter (Label Left)](https://claude.ai/code/artifact/17ede728-b7b3-4b2d-9f0c-7bdd3a1e0490)
  - 技術決策:
    - CSS Grid 佈局: `grid-cols-[64px_1fr]` 搭配 `items-baseline` 精準對齊標籤名稱與標籤群組文字基線
    - 標籤換行: 用 `flex-wrap` 搭配 `min-width: 0` 避免浮動對齊問題
  - PR: [#47](https://github.com/jerryyehself/my-dev-grid-front/pull/47)

其他設計稿不在這裡重複列，見上面的 `design-artifacts.md`。

## 共用元件

`src/components/` 底下只用 Vue 官方慣例的兩個前綴,不發明第三種:

- **`Base*`** — 沒有商業邏輯、到處可重用的呈現元件。設計決定要變成共用的東西時放這裡,而不是每個 view 各自重寫一次。目前有 `BaseButton` / `BaseCard` / `BaseTag` / `BaseInput` / `BaseTextarea` / `BaseSelect` / `BaseField` / `BaseEyebrow` / `BaseHint` / `BaseLoadingBlock` / `BaseSegmented`（全站統一的「幾選一」切換，D-66）/ `BaseStatTile`。
- **`The*`** — 每頁只會出現一次的元件(`TheNavbar`)。

新需求先看能不能變成既有元件的 variant(`BaseCard` 的 `card`/`panel`、`BaseButton` 的 `primary`/`ghost`/`tab`/`page`/`add`),而不是再開一個名字不同、長得幾乎一樣的元件。

什麼時候該抽:同一段東西重複第三次(Rule of Three)。但真正的報酬不是省行數,是**同一個值散在九個地方時寫錯沒人看得出來**——這個 repo 已經因此上線過兩個 bug(聚焦外暈與圖譜節點配色都把淺色主題的色碼硬寫進去,夜讀主題下就失效),兩個都是收斂成單一來源的當下才浮出來。

主題色票、字級、動畫的判準見 `.claude/skills/visual-design-language/SKILL.md`。

## 後端串接與登入

打 [`my-dev-grid`](https://github.com/jerryyehself/my-dev-grid)（Laravel）的公開 API（`VITE_API_BASE_URL`，預設 `http://localhost:8000/api`）。讀（`index`／`show`）不用登入。寫入用 Sanctum **API token**：帳號密碼走 `POST /auth/login`；Google／LINE 走後端的 `/auth/token/{provider}/redirect`，登入後帶著 token 導回 `/auth/callback`。access token 由 `useAuthStore` 存在記憶體，不落 `localStorage`。重新整理後，開機時打後端 `POST /auth/refresh`，用後端設在 API 網域的 httpOnly refresh cookie 換回登入狀態（需要後端 `my-dev-grid` 的 refresh token 支援）；細節見 `useAuthStore.ts` 的註解。

讀取（GET）碰到 502／503／504 或連不上時，`src/api/client.ts` 會自動重試兩次，仍失敗才讓各頁改用示範資料。

用 token 模式、不用 SPA session cookie，是因為前後端跨 origin（D-56，`my-dev-grid-skills/docs/decision-register.md`）。前端已經在 `jerrylib.com`；等後端也掛上同網域的子網域，才重新評估 cookie 模式。

**正式站上沒有登入按鈕**（D-63）。「登入」只在本機 `npm run dev` 顯示；要登入就直接開 `/login`。管理、編輯、新增這些寫入入口包在 `AuthOnly` 元件裡，登入後才出現。

### 管理頁面

這個網站現在是後端本體論資料（`Scope`／`Relation`）跟文章的正式管理介面，取代後端內嵌的舊後台 Triple 只剩下移除前的過渡（D-48，見上述 decision register）：

| 路徑 | 說明 |
| --- | --- |
| `/admin` | 後台入口：文章、分類、述詞的計數與各自的管理連結。登入後導覽列會多一個「管理」 |
| `/articles/manage`、`/articles/new`、`/articles/:id/edit` | 文章 CRUD，內文是 Markdown（`ArticleEditorView.vue`） |
| `/ontology/scopes`、`/ontology/scopes/new`、`/ontology/scopes/:id`、`/ontology/scopes/:id/edit` | 階層分類號一覽/詳情/新增/編輯 |
| `/ontology/relations`、`/ontology/relations/new`、`/ontology/relations/:id`、`/ontology/relations/:id/edit` | 述詞一覽/詳情/新增/編輯。被任何邊引用的述詞，編輯頁裡主詞/受詞/名稱/子類號會鎖成唯讀（只剩備註能改） |

`Technique`／`Implementation`／`Documentation` 這三種實體本身（不是上面的分類/述詞定義）目前完全靠後端 GitHub sync 自動建立，還沒有任何介面能手動編輯，列在 `my-dev-grid-skills` 的 `management-debt-ledger.md` 技術債。

## 文章內文的渲染

文章內文是 **Markdown 原文**(後端 `documentations.body`),渲染走 `src/components/markdown/MarkdownBody.vue`:`remark` 解析成 mdast,再一個節點對一個 `h()` 呼叫產生 Vue vnode。

**不用 `v-html`**,三個理由:

1. 站內連結要是真的 `<RouterLink>`。`v-html` 塞進去的 `<a>` 是原生連結,點下去整頁重新載入,SPA 的路由與捲動位置全部重來
2. 樣式直接沿用站上既有的 token,不用再寫一份 `.prose` 把同一組值定義第二次
3. 不需要消毒器。實測 `marked`(13.1KB) + `dompurify`(11.1KB) = 24.2KB,比 `unified` + `remark-parse` 的 20.6KB 還大

標題的 `id` 與「本文結構」目錄的 `href` 都來自 `components/markdown/headings.ts` 的 `extractHeadings()`——**只有這一個來源**。兩邊各自算 slug 會漂移,而漂移的症狀是「點目錄沒反應」,不會有任何錯誤訊息。

## 分支與部署

- `main` 接 Cloudflare 的正式部署，push 到 `main` 就會更新正式站。
- `develop` 是整合分支。feature 分支從 `develop` 分出、PR 對 `develop`。要上線時才由 `develop` 開 PR 進 `main`，用 squash 合併（repo 不允許 merge commit），合併後要把 `main` 合併回 `develop`（`git merge --no-ff origin/main`），細節見 `CLAUDE.md`。
- CI（`.github/workflows/ci.yml`）在兩個分支的 PR 都會跑 lint／type-check／test／build。
- Cloudflare 也會替每個分支建一份預覽部署。SPA 的路由 fallback 設在 `wrangler.jsonc` 的 `assets.not_found_handling`，不要用 `public/_redirects`（會觸發無限迴圈，原因見檔案裡的註解）。

Cloudflare 這邊的完整設定（網域、Access 鎖定、預覽部署）見 `daily-claude-summary` 的 `reports/cloudflare-workers-spa-deployment-guide.md`。

## 更新紀錄

見 [`CHANGELOG.md`](CHANGELOG.md)。

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

### 單元測試

```sh
npm run test:unit
```

### 用 [ESLint](https://eslint.org/) 檢查

```sh
npm run lint
```
