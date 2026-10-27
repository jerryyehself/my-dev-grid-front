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

### 引入外部資源時更新 CSP

CSP 寫在 `public/_headers`，瀏覽器只會載入白名單裡的來源，不在名單上的會直接被擋、功能壞掉。新增任何外部來源的東西，要在同一個 PR 裡把來源加進對應的指令：

| 要引入的東西 | 加到哪個指令 | 例子 |
| --- | --- | --- |
| 外部 script（分析工具、SDK、地圖） | `script-src` | `https://static.cloudflareinsights.com` |
| 程式會打的 API（`fetch`、WebSocket） | `connect-src` | API 換網域、接第三方 API；WebSocket 要寫 `wss://` |
| 外部字型 | `font-src`（字型檔）與 `style-src`（字型的 CSS） | Google Fonts 已放行 |
| 外部 CSS | `style-src` | |
| 嵌入其他網站（YouTube、CodePen） | 新增 `frame-src` | `frame-src https://www.youtube-nocookie.com` |
| `data:`、`blob:` 圖片（貼上 base64 圖、畫布匯出預覽） | `img-src` 加 `data:` 或 `blob:` | |
| http（非 https）圖片 | 不放行 | 改用 https 網址 |

- 只加用得到的網域，不要用 `*` 或 `https:` 整個放行（`img-src` 是例外：文章可以嵌入任何外部圖片）。
- API 網址換掉（`VITE_API_BASE_URL`）時，`connect-src` 一定要一起改，不然整站讀不到資料。
- 改完在預覽站打開用到的頁面，看瀏覽器主控台（F12 → Console）有沒有 `Content-Security-Policy` 開頭的錯誤。
- 不確定會不會壞時，可以先把新來源加進一份 `Content-Security-Policy-Report-Only` 標頭（只回報、不阻擋），確認沒有違規再搬進正式的 `Content-Security-Policy`。
- Cloudflare 後台開某些功能會自動在頁面塞 script（Web Analytics、Rocket Loader、Zaraz），開之前也要先加白名單。
