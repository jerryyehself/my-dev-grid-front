把Vue 3＋Vite的單頁應用（SPA）透過GitHub整合部署到Cloudflare Workers的紀錄：`wrangler.jsonc`的設定、兩次部署失敗的錯誤訊息與修法、分支與預覽部署、回應標頭，以及正式公開前用Cloudflare Access限制存取、綁定自訂網域的步驟。

> 部署在2026-09-25完成，自訂網域在2026-09-30綁定；Cloudflare官方文件的引述於2026-11-12重新核對。主控台的選單名稱是操作當時的版本，之後可能改名。

## 前提

| 項目 | 內容 |
|---|---|
| 前端 | Vue 3＋Vite，建置輸出到`dist/` |
| 路由 | Vue Router的`createWebHistory`（網址不帶`#`） |
| 部署方式 | 在Cloudflare主控台「Workers & Pages」建立專案並連到GitHub repo，每次push由Workers Builds建置與部署 |
| 執行環境 | 只有靜態檔案，沒有Worker程式（設定檔沒有`main`進入點）；API在另一台伺服器 |

建立後，部署紀錄裡的路徑是`workers/scripts/...`、`workers/services/...`，PR上的檢查名稱是`Workers Builds`，所以這個專案是一個帶靜態資源（static assets）的Worker[^1]。Pages教學裡常見的設定寫法，在這裡不一定適用。

## wrangler.jsonc

最後部署成功的設定檔：

```jsonc
{
  "name": "my-dev-grid-front",
  "compatibility_date": "2026-09-25",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  },
  "previews": {}
}
```

| 欄位 | 作用 |
|---|---|
| `name` | Worker名稱，要跟主控台上的專案名稱一致 |
| `compatibility_date` | Workers執行環境的相容日期 |
| `assets.directory` | 上傳成靜態資源的資料夾，也就是Vite的建置輸出 |
| `assets.not_found_handling` | 設成`"single-page-application"`時，找不到對應檔案的導覽請求會拿到`/index.html`的內容，狀態碼200 |
| `previews` | `wrangler preview`指令要求一定要有，可以是空的，見「錯誤：缺少`previews`區塊」 |

`createWebHistory`產生的網址（例如`/articles/5`）在伺服器上沒有對應的檔案。直接輸入網址或重新整理時，靠`not_found_handling`回傳`index.html`，再由Vue Router依網址顯示頁面；沒設的話會回404。官方的SPA設定範例沒有`main`，只放靜態檔案的專案不需要寫Worker程式。

## 錯誤：`_redirects`無限迴圈

症狀：第一版用Netlify與Pages常見的SPA寫法，在`public/_redirects`放一行：

```
/* /index.html 200
```

部署失敗，訊息是：

```
Invalid _redirects configuration:
Line 1: Infinite loop detected in this rule. This would cause a redirect to
strip `.html` or `/index` and end up triggering this rule again. [code: 100324]
```

原因：Workers static assets預設的HTML處理方式（`html_handling`的`auto-trailing-slash`）會把結尾是`.html`或`/index`的請求，用307轉址到去掉這一段的網址，例如`/folder/index.html`轉到`/folder`。`/*`這條規則把每個路徑改寫成`/index.html`，`/index.html`又被轉回`/`，再被`/*`接到。部署前的檢查把這種情況判定成無限迴圈，整次部署被擋下[^2]。

修法：刪掉`public/_redirects`，改用`wrangler.jsonc`的`assets.not_found_handling: "single-page-application"`，也就是上一節的設定。

## 錯誤：缺少`previews`區塊

症狀：拿掉`_redirects`之後，Vite建置成功，部署步驟失敗：

```
✘ [ERROR] Your Wrangler configuration is missing a `previews` block to run this command.
```

原因：Workers Builds對非正式分支執行的是預覽指令，預設值是`npx wrangler preview`[^3]。這個指令會替每個Git分支建立或更新一個獨立的預覽環境（Preview）。官方文件寫明「The `previews` block is required, but it can be empty if your Preview does not need separate settings.」；`compatibility_date`和`assets`要留在設定檔最外層，不搬進`previews`。

預覽環境不會沿用正式環境的變數與binding（連到資料庫、儲存空間等資源的設定），要用到的話寫進`previews`。這個專案只有靜態檔案，所以留空。

修法：在設定檔最外層加上`"previews": {}`，其他不動。補上之後部署成功。

## 分支與部署

| push到 | Workers Builds做的事 | 網址 |
|---|---|---|
| 正式分支（預設`main`） | 建置後執行`npx wrangler deploy` | `my-dev-grid-front.<子網域>.workers.dev`，以及綁定的自訂網域 |
| 其他分支 | 建置後執行預覽指令，建立或更新這個分支的預覽 | 每個預覽各自的網址，列在該Worker的網域設定頁 |

- 正式分支在Workers & Pages → 該Worker → Settings → Build → Branch control設定。
- `<子網域>`是Cloudflare帳號的workers.dev子網域，同一個帳號的Worker共用，跟專案名稱無關。
- 免費方案的Workers Builds限制是每月3,000建置分鐘、同時1個建置、單次最長20分鐘，沒有建置次數的上限。預覽和正式部署都會用到建置分鐘。

## 合併前的兩組檢查

PR上同時有兩組檢查：

| 檢查 | 跑在哪 | 做什麼 | 抓得到的問題 |
|---|---|---|---|
| `ci.yml` | GitHub Actions | lint、type-check、單元測試、建置、`npm audit` | 程式碼錯誤、建置失敗、正式相依套件中high以上的漏洞 |
| `Workers Builds: my-dev-grid-front` | Cloudflare | 建置，並真的部署一次（PR分支部署成預覽） | 部署設定錯誤 |

上面兩個錯誤發生時，`ci.yml`的建置都通過，只有Workers Builds失敗。Workers Builds沒有設成必要檢查時，它失敗的PR在GitHub API裡的`mergeable_state`是`unstable`，不是`clean`[^4]。

## 回應標頭（_headers）

安全相關的回應標頭放在`public/_headers`。Vite建置時把`public/`原樣複製到`dist/`，Workers static assets再依這個檔案加上標頭：

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https:; connect-src 'self' https://<API網域> https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- 正式網址開了Cloudflare Web Analytics，Cloudflare會在頁面插入`static.cloudflareinsights.com`的script，資料送到`cloudflareinsights.com`，所以CSP的`script-src`和`connect-src`各放行一個來源。預覽網址沒開Web Analytics，不會載入這兩個來源。
- `connect-src`的API網址要跟建置時設定的API網址一致。
- `_headers`最多100條規則，每行最多2,000個字元；只套用在靜態資源的回應，Worker程式產生的回應不適用。

## Cloudflare Access限制存取

網站部署後就有公開網址。正式公開之前，用Cloudflare Access要求訪客先登入，步驟（2026-09操作時）：

1. 帳號啟用Zero Trust（帳號層級，只做一次）：主控台左側選單「Zero Trust」，第一次進入要設定team name，Access的登入頁會在`<team>.cloudflareaccess.com`，跟網站網址無關。方案選Free，費用$0，上限50位使用者[^5]，只有自己登入時占1位。
2. Workers & Pages → 該Worker → 「Access」頁籤。
3. 範圍選「All traffic」（全部流量）。選「Previews only」時，正式網址仍然公開。
4. 新增政策：登入方式的下拉選單預設是「Cloudflare帳戶」，任何有Cloudflare帳號的人都能通過；改選「Email」並填自己的地址，動作維持「允許」。工作階段時間是登入一次後多久不用重新驗證，例如24小時，跟誰能登入無關。

設好之後，打開網址會先出現輸入email的頁面。Cloudflare寄一組一次性驗證碼到該信箱，把驗證碼填回網頁才進得去，所以要收得到那個信箱的信才能看。關掉Access就恢復公開，不影響部署本身。

## 自訂網域

網域在Cloudflare Registrar註冊，名稱伺服器預設就是Cloudflare的。

DNSSEC（替網域解析加上簽章，防止解析結果被竄改）當時在「DNS → 設定」一鍵啟用。Cloudflare Registrar會把DS記錄送到註冊局，不用手動填。官方文件寫可能要一到兩天，這次啟用後幾小時內就生效。用RDAP查詢確認：

```
curl -s https://rdap.cloudflare.com/rdap/v1/domain/jerrylib.com
```

回應裡的`secureDNS.delegationSigned`是`true`，代表已生效。

綁網域前先替網域加上Access，再綁定，網站從綁好到設好Access之間才不會是公開的。當時Worker的Access頁籤只保護`workers.dev`網址[^6]，所以另外替網域建了一個Access應用程式：

1. Zero Trust → Access控制 → 應用程式 → 新增應用程式 → 自我裝載（Self-hosted）：
   - 名稱：自己認得的名稱，例如「上線前」，正式公開時刪的就是這個應用程式。
   - 公開主機名稱：網域選`jerrylib.com`，子網域與路徑留空。
   - 政策：動作「允許」，規則「包含 → 電子郵件」，填完整的email地址。規則選「電子郵件網域」並填`gmail.com`時，所有Gmail使用者都能通過。
   - 認證方式、MFA（多因素驗證）、工作階段（24小時）用預設值。
   - Worker的Access頁籤自動建立的應用程式（名稱是`<Worker名稱> - Cloudflare Workers`）不用改，兩個應用程式各管各的網址。
2. Workers & Pages → 該Worker → 設定 → 自訂網域與路由（Domains & Routes）→ 新增 → 自訂網域，填`jerrylib.com`，環境選正式（Production）。DNS記錄和HTTPS憑證由Cloudflare建立，不用手動加A或CNAME記錄；主機名稱上已經有CNAME記錄時，無法建立Custom Domain。
3. 從外部確認，見下一節。

正式公開時，刪掉「上線前」這個Access應用程式，並關掉Worker的Access。`workers.dev`網址可以在Settings → Domains & Routes按Disable停用，或在設定檔加上`"workers_dev": false`後重新部署。

## 驗證

在沒有登入Cloudflare Access的環境執行：

| 檢查 | 指令 | 預期結果 |
|---|---|---|
| Access生效（公開前） | `curl -sI https://jerrylib.com/`，以及深層路徑如`https://jerrylib.com/about` | `302`，`location`指向`<team>.cloudflareaccess.com/cdn-cgi/access/login/jerrylib.com…` |
| SPA fallback（公開後） | `curl -s -o /dev/null -w '%{http_code}\n' https://jerrylib.com/articles/5` | `200`，內容是`index.html` |
| 回應標頭 | `curl -sI https://jerrylib.com/` | 有`content-security-policy`、`x-content-type-options`等`_headers`裡設定的標頭 |
| DNSSEC | 上一節的RDAP指令 | `"delegationSigned": true` |

## 結論

- 在Workers static assets上跑Vue Router的history模式，SPA fallback用`assets.not_found_handling: "single-page-application"`。`_redirects`的`/* /index.html 200`會跟預設的HTML轉址互相觸發，被判定成無限迴圈。
- Workers Builds的預覽指令預設是`npx wrangler preview`，設定檔裡要有`previews`區塊，空的也可以。
- 這兩個部署設定錯誤，GitHub Actions的建置都抓不到，只有Workers Builds會失敗；合併前要兩組檢查都看。
- push到正式分支就會部署到正式網址。正式分支加上「一律走PR」的分支保護規則，直接push會被GitHub擋下（錯誤訊息`GH013: Changes must be made through a pull request`），可以避免沒經過檢查就上線。
- 公開前用Access鎖住時，Access要在綁網域之前生效。不論用Worker上的Access還是另建應用程式，綁好網域後都要從外部用curl確認回`302`。
- 正式公開時停用`workers.dev`，只留自訂網域一個入口；後端CORS只放行一個來源時，從`workers.dev`進來的請求就不會被擋掉。

相關：〈前端建置工具與部署概念問答整理〉（各家前端託管平台的比較）

[^1]: 主控台把Workers和Pages放在同一個選單「Workers & Pages」，從名稱看不出建立的是哪一種；這裡依部署紀錄的路徑與檢查名稱判斷。
[^2]: Workers static assets本身支援`_redirects`。官方文件沒有寫這條規則會被判定成迴圈；成因是依錯誤訊息與`html_handling`的文件推得的。
[^3]: Worker Previews是Cloudflare在2026-09-22發布的功能。預覽指令可以改成`npx wrangler versions upload`，改了之後非正式分支只會建立版本網址（Version URL），不建立Preview。
[^4]: 把Workers Builds設成必要檢查時，失敗的PR會被擋在合併之前。
[^5]: Cloudflare的Zero Trust方案頁把Free方案的使用者上限列為50位；方案內容以方案頁當下的寫法為準。
[^6]: 2026-11-02版的官方文件寫Worker層級的Access政策會保護該Worker的路由、自訂網域、`workers.dev`網址與預覽，跟當時看到的範圍不同。用哪一種設定都一樣，綁好網域後用「驗證」一節的指令確認。
