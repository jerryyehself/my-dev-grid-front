整理Laravel Sanctum兩種認證模式的差別、SPA（單頁應用程式）在各靜態託管平台的網址設定與免費額度、Next.js與Nuxt的定位、webpack與Vite的現況，以及HMR、開發伺服器和正式建置的關係。

> 依各官方文件、公告與套件原始碼整理，核對日期2026-11-12。託管額度與工具版本變動頻繁，以官方頁面為準。

## Sanctum的兩種認證模式

Laravel Sanctum的SPA認證用Laravel的session cookie，API token認證用請求header帶的token。官方文件建議自家的SPA用前者，原文是「You should not use API tokens to authenticate your own first-party SPA.」

| | SPA認證（cookie） | API token認證 |
|---|---|---|
| 憑證 | 登入後由後端發session cookie，瀏覽器自動儲存、自動帶上 | 後端發一組明文token，格式是`id\|明文字串`[^1]；資料庫只存SHA-256雜湊值 |
| 前端要做的事 | 讓請求帶上cookie：axios開`withCredentials`與`withXSRFToken`，fetch設`credentials: 'include'` | 自己保存token，每個請求加`Authorization: Bearer <token>` |
| 網域條件 | SPA與API要在同一個根網域下，子網域可以不同 | 沒有限制 |
| 主要風險 | CSRF[^2]；Sanctum內建防護 | XSS[^3]；影響範圍跟token存在哪裡有關 |
| 撤銷 | 刪掉session，cookie隨之失效 | 刪掉`personal_access_tokens`表裡那一列；可以只撤銷某一個token |
| 有效期限 | 跟著session設定 | 預設永不過期；可在設定檔`expiration`統一設定，或發token時個別指定 |

### 網域條件

Sanctum文件原文：「In order to authenticate, your SPA and API must share the same top-level domain. However, they may be placed on different subdomains.」`app.example.com`和`api.example.com`符合條件。前端放在託管平台的預設網域（例如`*.pages.dev`、`*.vercel.app`），後端放在另一個平台時，兩邊沒有共同的根網域[^4]。

### SPA認證的設定項目

- `config/sanctum.php`的`stateful`（環境變數`SANCTUM_STATEFUL_DOMAINS`）：列出前端網域。
- `bootstrap/app.php`：呼叫`statefulApi()`。
- `config/cors.php`：`supports_credentials`設為`true`。
- `config/session.php`的`domain`：前面加`.`，涵蓋所有子網域。
- 前端登入前先請求`/sanctum/csrf-cookie`，取得`XSRF-TOKEN` cookie，之後的請求在`X-XSRF-TOKEN` header帶回；axios會自動處理。

### token的存放位置

OWASP的HTML5安全速查表寫「Do not store session identifiers in local storage as the data is always accessible by JavaScript.」，並指出cookie可以用`httpOnly`旗標降低這個風險。IETF草案〈OAuth 2.0 for Browser-Based Applications〉第8節比較了瀏覽器端的存放方式：

| 存放位置 | 特性 |
|---|---|
| `localStorage` | 不防惡意JavaScript存取 |
| `sessionStorage` | 跟`localStorage`類似，但只存在單一分頁，不跨分頁共享 |
| JavaScript記憶體 | 頁面重新載入就消失 |
| `httpOnly` cookie | JavaScript讀不到（OWASP） |

草案第8.5節寫，攻擊者能在頁面上執行程式時，「none of these options can fully mitigate token exfiltration」[^5]。

## SPA的深層網址與靜態託管

SPA用HTML5 history模式時，直接開啟深層網址（例如`/articles/12`），伺服器上沒有對應的檔案，會回404。託管端要設定成「找不到檔案就回`index.html`」，由前端路由接手。

| 平台 | SPA回退設定 |
|---|---|
| Netlify | `_redirects`檔加一行`/*  /index.html  200` |
| Vercel | `vercel.json`的`rewrites`設`{ "source": "/(.*)", "destination": "/index.html" }` |
| Cloudflare Pages | 專案沒有頂層`404.html`時，自動當成SPA，找不到的路徑回根目錄 |
| Cloudflare Workers靜態資源 | Wrangler設定`assets.not_found_handling = "single-page-application"` |
| GitHub Pages | 沒有原生支援；常見做法是hash路由，或用`404.html`重導向 |

GitHub Pages兩種做法的限制：

- hash路由：網址帶`#`。Vue Router文件說這種模式「does however have a bad impact in SEO」。
- `404.html`重導向：回應的狀態碼仍是404。常用的spa-github-pages專案說明寫，Google大約2019年起不再跟隨`404.html`裡的重導向。

前端和API不在同一個網域時，CORS在API端設定，跟前端放在哪個平台無關。

## 靜態託管的免費額度

| 平台與方案 | 流量 | 其他限制 |
|---|---|---|
| Vercel Hobby | 每月前100 GB Fast Data Transfer | 只限非商業的個人使用；要更高額度須升級Pro |
| Netlify Free | 點數制，每月300點，流量每GB扣20點[^6] | 硬上限，Free方案不會收費 |
| Cloudflare Pages Free | 靜態資源的請求免費、不限量 | 每月500次建置 |

## Next.js與Nuxt的定位

兩者都是建在UI函式庫上的全端框架（meta-framework[^7]），Next.js對應React，Nuxt對應Vue，都把路由、資料抓取、SSR、SSG[^8]整合成一套檔案慣例。

| | Next.js | Nuxt |
|---|---|---|
| UI函式庫 | React | Vue |
| 開發者 | Vercel | NuxtLabs，2025年7月加入Vercel |
| 預設打包工具 | Turbopack（Next.js 16起，開發與建置都是） | Vite（設定`builder`可改用webpack或Rspack） |
| 伺服器端 | Next.js內建 | Nitro引擎，建置成單一`.output`目錄，可部署到Node伺服器、靜態託管、serverless與edge平台 |

React官方文件建議新專案從框架開始，列出的全端框架有Next.js App Router、React Router v7，原生App另有Expo。

Turbopack是用Rust寫的增量打包工具，內建在Next.js裡。NuxtLabs加入Vercel的公告寫，Nuxt和Nitro維持MIT授權、公開路線圖與開放治理，並寫「Nitro will continue to serve all frameworks and vendors openly, neutrally, and without lock-in.」

## 建置工具與應用框架的分工

Vite是建置工具與開發伺服器，Nuxt是應用框架；Nuxt底層用Vite建置，兩者是上下兩層。

| 層 | 負責 | 例子 |
|---|---|---|
| 應用框架 | 頁面路由（`pages/`資料夾的結構就是路由）、元件與composable免手動import、資料抓取、SSR | Nuxt、Next.js |
| 建置工具 | 把原始碼轉成瀏覽器能執行的檔案、開發時即時更新畫面 | Vite、webpack、Turbopack、Rspack |

Nuxt的`builder`設定可以在Vite、webpack、Rspack之間切換，`pages/`這類檔案慣例由Nuxt處理，跟用哪個建置工具無關。

## webpack與Vite的使用現況

webpack的使用率仍高，評價偏負面；新專案的預設已轉向Vite與Turbopack。

State of JS 2025調查（2025年11月，約12,000人回答）：

| 工具 | 使用率 | 正面評價 | 負面評價 |
|---|---|---|---|
| webpack | 86% | 14% | 37% |
| Vite | 84% | 56% | 來源未列 |

預設值的變化：

- Next.js 16（2025-10-21）：Turbopack成為預設打包工具，官方寫正式建置快2–5倍；要用webpack得加`--webpack`。
- Vite 8（2026-03-12）：改用Rust寫的Rolldown，同時取代原本開發時用的esbuild與正式建置用的Rollup；公告寫建置「up to 10-30x faster」[^9]。
- Nuxt：預設用Vite。

## 建置步驟的由來

瀏覽器原本直接執行手寫的JavaScript。模組打包與語法轉譯，在2011年前後幾年陸續成為必要步驟。

| 年份[^10] | 工具或語法 | 需要建置的原因 |
|---|---|---|
| 2011 | Browserify | 用npm模組寫的程式，要打包才能在瀏覽器執行 |
| 2012 | webpack | 同上 |
| 2012 | TypeScript | 型別語法瀏覽器不認得，要編譯成JavaScript |
| 2013 | React與JSX | `<div>{x}</div>`不是合法的JavaScript，要轉譯 |
| — | Vue單檔元件（`.vue`） | 瀏覽器不認得這種檔案格式，要編譯 |

## HMR與整頁重新載入

HMR（Hot Module Replacement，熱模組替換）只換掉改動的模組，不重新載入整頁；整頁重新載入會讓記憶體裡的狀態歸零。

| | 整頁重新載入 | HMR |
|---|---|---|
| 例子 | 靜態伺服器（例如`python -m http.server`）加手動重新整理 | Vite、webpack、Turbopack的開發伺服器 |
| 更新範圍 | 整頁 | 改動的模組 |
| 表單內容、路由位置、元件狀態 | 歸零 | 可以保留[^11] |

Vite文件描述的做法：相依套件先預先打包一次，自己的原始碼透過瀏覽器原生ES modules按需提供，瀏覽器只請求目前頁面用到的模組，Vite在收到請求時才轉換那個檔案，所以啟動時間「nearly instant, regardless of application size」。Turbopack的做法不同：開發時也打包，但只打包開發伺服器實際收到請求的部分。

## 開發伺服器與正式建置

開發伺服器讓修改即時出現在瀏覽器，正式建置產出上線用的檔案，兩者分開執行。

- 原始碼有JSX、TypeScript或`.vue`檔時，上線前要建置；tree-shaking與minify[^12]也在建置時做。
- Vite文件說明正式環境仍要打包：沒打包的ES modules在正式環境會因為層層import多出網路往返。
- Vite 8之前，相依套件預先打包用esbuild、正式建置用Rollup；Vite 8起兩者都改由Rolldown負責。

## 結論

- Sanctum：前後端在同一個根網域下時，官方建議自家SPA用cookie模式；前後端各用不同託管平台的預設網域、沒有共同根網域時，cookie模式不能用，只剩token模式。依據：Sanctum文件的網域條件與第一方SPA建議。
- token模式：token存`localStorage`，頁面上任何JavaScript都讀得到；存記憶體，重新整理就要重新取得。頁面被注入程式時，沒有一種存放方式能完全防止token外流，所以防XSS本身比選存放位置更優先；Sanctum token預設永不過期，設定`expiration`可以縮短token外流後還能用的時間。依據：OWASP、IETF草案第8節、Sanctum文件。
- SPA託管：要乾淨網址又要讓搜尋引擎正常索引時，GitHub Pages的兩種做法都有代價；Netlify、Vercel、Cloudflare用一行設定或預設行為就能處理。純靜態的SPA換平台，要改的是SPA回退設定、建置設定與DNS。依據：上方SPA回退設定表與spa-github-pages說明。
- 免費額度：只看靜態流量，Cloudflare Pages不計靜態資源請求；Vercel Hobby每月100 GB，但限非商業使用；Netlify新方案的點數只算流量時約等於15 GB。依據：上方額度表。
- 框架：純前端渲染的Vue SPA搭配獨立的Laravel API，換成Nuxt多得到的是SSR、SSG、伺服器端API與檔案路由，代價是既有的Vue Router設定與API呼叫要照Nuxt的慣例重新組織。需求只是讓搜尋引擎索引少數內容頁時，要比較的是只為這些頁面預先產生靜態HTML（prerender），跟整個專案改用Nuxt的成本。依據：Nuxt文件列出的功能。
- 建置工具：新專案的預設是Vite（Vue、Nuxt）或Turbopack（Next.js）。webpack的使用率跟Vite相近，正面評價只有14%。依據：State of JS 2025、Next.js 16與Vite 8公告。

## 來源

- [Laravel Sanctum（Laravel 13.x文件）](https://laravel.com/docs/13.x/sanctum)
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [IETF草案：OAuth 2.0 for Browser-Based Applications](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [Public Suffix List](https://publicsuffix.org/list/public_suffix_list.dat)
- [Vue Router：不同的歷史模式](https://router.vuejs.org/guide/essentials/history-mode.html)
- [Netlify：Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- [Vercel：vercel.json設定](https://vercel.com/docs/project-configuration/vercel-json)
- [Cloudflare Pages：Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [Cloudflare Workers：Single Page Application](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [spa-github-pages](https://github.com/rafgraph/spa-github-pages)
- [Vercel：Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Netlify：Credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Netlify：Legacy pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-legacy-plans/legacy-pricing-plans/)
- [Cloudflare Pages：Limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages Functions：Pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [React：Creating a React App](https://react.dev/learn/creating-a-react-app)
- [Next.js 16公告](https://nextjs.org/blog/next-16)
- [Next.js：Turbopack](https://nextjs.org/docs/app/api-reference/turbopack)
- [Vercel：NuxtLabs joins Vercel](https://vercel.com/blog/nuxtlabs-joins-vercel)
- [Nuxt：Introduction](https://nuxt.com/docs/4.x/getting-started/introduction)
- [Nuxt：Configuration（builder）](https://nuxt.com/docs/4.x/api/nuxt-config)
- [State of JS 2025：Build Tools](https://2025.stateofjs.com/en-US/libraries/build-tools/)
- [DevClass：State of JS 2025調查報導](https://www.devclass.com/development/2026/02/10/javascript-survey-reveals-gripes-against-date-handling-webpack-and-nextjs-and-that-typescript-has-won/4090262)
- [Vite 8公告](https://vite.dev/blog/announcing-vite8)
- [Vite：Why Vite](https://vite.dev/guide/why)
- [React部落格：Why did we build React?（2013-06-05）](https://legacy.reactjs.org/blog/2013/06/05/why-react.html)

[^1]: 依Sanctum原始碼（v4.3.3，`HasApiTokens.php`）：資料庫id、`|`、明文字串。
[^2]: CSRF（跨站請求偽造）：使用者已登入時，別的網站騙瀏覽器送出使用者不知情的請求；瀏覽器會自動帶上cookie。
[^3]: XSS（跨網站指令碼）：網站被注入惡意script，script以這個網站的身分執行。
[^4]: `pages.dev`、`vercel.app`、`netlify.app`、`github.io`都列在Public Suffix List上，瀏覽器把底下每個子網域當成各自獨立的網站，不能在子網域之間共用cookie。
[^5]: 草案第8節也寫，就算token存放完全隔離，攻擊者仍能直接向授權伺服器要一組新的token。
[^6]: 只算流量時，300點約等於15 GB；每次正式部署另扣15點。2025-09-04前建立的帳號沿用舊方案：舊Free方案每月100 GB、硬上限；舊Starter方案超過後每100 GB收55美元。
[^7]: meta-framework：建在React、Vue這類UI函式庫之上，再加上路由、資料抓取、伺服器端渲染等功能的框架。
[^8]: SSR（伺服器端渲染）：每次請求在伺服器產生HTML。SSG（靜態網站生成）：建置時先把HTML產生好。
[^9]: 這個倍數來自Rolldown對Rollup的基準測試，實際專案的差距依專案而定。
[^10]: 年份取套件第一次發布到npm的時間；webpack 1.0是2014年2月。React取官方部落格2013年6月的文章。
[^11]: 能保留多少狀態，要看框架的HMR實作與改到哪個部分。
[^12]: tree-shaking：移除沒用到的程式碼。minify：刪掉空白、縮短變數名稱，讓檔案變小。
