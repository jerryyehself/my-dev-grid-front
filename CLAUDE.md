# 語言慣例

跟這個 repo 有關的所有輸出，預設用**繁體中文**：

- Git commit message(標題與內文都是)
- 程式碼註解
- 對使用者的回覆/說明文字

程式碼本身(變數名、函式名、檔名、CSS class)、技術術語、套件名稱、既有的英文專有名詞(例如 Vue、Tailwind、Laravel)維持原文，不用硬翻。

# Git commit/push 授權（2026-09-12 使用者確認）

一般的 commit/push（審查過的變更、正常工作流程的一部分）不用每次都先問過使用者才動作，做完覺得可以收尾了就直接 commit/push，不用停下來等確認。

這不影響既有的安全防護——force push、`git reset --hard`、刪分支、跳過 hook（`--no-verify`）這類本來就該格外小心的動作，不受這條影響，一樣預設先跟使用者確認過再做。

**2026-09-12 追加**：開 PR 也一併解除「每次都要先問」的限制——分支 push 上去之後，覺得可以開 PR 就直接開，不用等使用者點頭。

**2026-09-14 追加（刪分支的例外）**：分支對應的 PR 已經合併的話，刪那個分支（本地端跟遠端都算）不用先問，直接刪；還沒合併、或不確定有沒有合併的分支，維持原規則、刪之前要先問。

**2026-09-14 追加（PR 合併授權，套用 `my-dev-grid-skills/docs/engineering-principles.md` 的「What needs the user's input, and what doesn't — a tiering standard」）**：自己開的 PR，同時符合以下**驗證條件**跟**範圍條件**才直接合併，不用先問使用者：

驗證條件（缺一不可）：
- CI 全部通過（lint/type-check/build/test 等各項 check）
- `mergeable_state` 是 `clean`（沒有衝突）
- 沒有未處理的 review comment（有 comment 但已經回應/解決的不算）

範圍條件（對應三層標準第 2 層「違反既有設計/架構原則」——沒有一定要先問；反之只要碰到下面任一項,就算驗證條件全過也要先問）：
- 碰到 CI/CD 設定（`.github/workflows/*`）、部署腳本、環境變數/密鑰相關檔案、後端資料庫 migration/schema，或任何會影響其他協作者/使用者實際體驗到的生產行為的改動 → 要先問
- 純文件（`README`、`CLAUDE.md`、註解）、樣式/排版調整、測試檔案、單純的前端元件內部實作細節 → 不用先問，符合驗證條件就直接合併

不符合以上任一驗證條件，或落在需要先問的範圍條件裡，或這個 PR 不是自己開的，維持原規則、合併前要先問。合併完，對應分支照上面「刪分支的例外」處理。

# 分支策略（2026-09-25 使用者確認）

`main` 接了 Cloudflare 的正式環境部署（push 到 `main` 會真的觸發正式站更新），
`develop` 是開發用的整合分支。之後的開發流程：

- Feature 分支從 `develop` 分出來，PR 對象是 `develop`，不是 `main`。
- `develop` 累積到一個階段、確認要上線了，才由 `develop` 開 PR 合併進 `main`，
  觸發正式部署——這個「要不要上線」的決定要先問使用者，不能因為 `develop`
  這邊 CI 全過就直接推進 `main`。
- CI（`.github/workflows/ci.yml`）的觸發分支同時包含 `main` 和 `develop`，
  兩邊開 PR 都看得到 lint/type-check/test/build 檢查。
- 上面「PR 合併授權」那條「範圍條件」裡的「部署腳本」，明確包含
  `wrangler.jsonc`、`public/_redirects` 這類 Cloudflare 部署設定檔——這類
  改動即使只是修一個部署錯誤、驗證條件也全過，一樣要先問，不能因為是
  「修 bug」就自動歸類成可以直接合併（2026-09-25 的教訓：PR #81/#82 誤判
  成一般前端實作細節，直接合併了）。
