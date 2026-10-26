# 安全

這份文件寫的是前端程式碼一定要守的規則。依據 [Vue 安全指南](https://vuejs.org/guide/best-practices/security)、[OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)（XSS Prevention、DOM based XSS、HTML5 Security、OAuth2）與 [Vite 環境變數說明](https://vite.dev/guide/env-and-mode)。標「lint」的規則由 ESLint 檢查，其餘靠審查。

## HTML 與程式執行

- 不用 `v-html`、`innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`。Markdown 走 `MarkdownBody` 的語法樹轉 vnode，不經過 HTML 字串。（lint：`vue/no-v-html`）
- 不用 `eval`、`new Function`，`setTimeout`／`setInterval` 不傳字串。（lint：`no-eval`、`no-implied-eval`、`no-new-func`）
- 不在執行期用字串組 Vue template（不從 `vue` 匯入 `compile`）。
- 不把使用者或資料庫來的資料整包綁到 `:style` 或 `on*` 屬性；需要動態樣式時只開放特定屬性。

## 網址

- 從資料來的網址（文章內容、API 回傳、query string）放進 `href`、`src`、RouterLink `to` 之前，一律經過 `src/components/markdown/safeLink.ts` 的 `safeLink()`。它只放行 http、https、mailto、站內路徑與錨點，回傳 `null` 時不要給連結。Vue 不會擋 `javascript:` 網址。
- 每新增一個網址來源，就補一個「協定不在白名單時不給連結」的單元測試。
- `target="_blank"` 一律搭配 `rel="noopener noreferrer"`；`window.open` 的第三個參數帶 `'noopener,noreferrer'`。（lint：`vue/no-template-target-blank`，看不到 `h()` 與 `v-bind` 物件，這兩種情況靠審查）
- 從 query string 取得的導頁目標，必須是 `/` 開頭、而且不是 `//` 開頭的站內路徑。

## 憑證與秘密

- access token 只放記憶體。token 和任何憑證都不寫進 `localStorage`、`sessionStorage`、IndexedDB，也不放進 JavaScript 讀得到的 cookie（refresh token 由 API 用 httpOnly cookie 管理）。
- 網址上帶回來的 OAuth token：讀一次、立刻用 `history.replaceState` 從網址清掉、不寫 log、不渲染到畫面。
- 從 storage、`location.hash`／query string、`postMessage` 讀到的值，都當成不可信的輸入處理。
- `VITE_` 開頭的環境變數會在建置時寫進公開的 JavaScript bundle，不能放秘密。`.env` 系列檔案除了 `.env.example` 都不 commit（`.gitignore` 已排除）。
- 需要用 `postMessage` 時，要指定目標 origin，接收端用白名單比對 `event.origin`。

## 部署設定

- 安全標頭（CSP 等）屬於部署設定，改動前要先問維護者，見 `CLAUDE.md`「PR 合併授權」的範圍條件。`index.html` 不要新增行內 script，否則之後的 CSP 要另外放行。
