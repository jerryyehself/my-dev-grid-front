# 語言慣例

跟這個 repo 有關的所有輸出，預設用**繁體中文**：

- Git commit message(標題與內文都是)
- 程式碼註解
- 對使用者的回覆/說明文字

程式碼本身(變數名、函式名、檔名、CSS class)、技術術語、套件名稱、既有的英文專有名詞(例如 Vue、Tailwind、Laravel)維持原文，不用硬翻。

# 程式慣例（2026-10-26 使用者確認）

檔案結構與命名規則寫在 [`docs/conventions/`](docs/conventions/README.md)，Claude、Codex、人都照同一份。新增檔案或元件、搬動檔案前先讀 `structure.md` 與 `naming.md`；新功能放 `src/features/<功能名>/`，舊功能要大改時才整個搬過去。

# Git commit/push 授權（2026-09-12 使用者確認）

推送到工作分支、開 PR（草稿或正式）不用問使用者，做完覺得可以收尾了就直接 commit/push、開 PR，不用停下來等確認。合併 PR 的規則看下一節。

例行步驟（commit、推送到工作分支、開 PR、唯讀檢查、安全的重試）不用問；合併的範圍照下面「PR 合併授權」。

force push、`git reset --hard`、跳過 hook（`--no-verify`）這類本來就該格外小心的動作，一樣預設先跟使用者確認過再做。

## 合併後的清理（2026-11-12 使用者確認）

agent 不刪遠端分支：repo 開了「合併後自動刪除分支」，已合併的遠端分支會自己消失，agent 也沒有刪遠端分支的權限。合併後只做本機清理：切回 base 分支、移除已合併的本機分支和 worktree，這屬於本機整理，不用問。

## PR 合併授權（2026-09-14 使用者確認，依「哪些事要問使用者、哪些不用」的分級標準）

自己開的 PR，同時符合以下**驗證條件**跟**範圍條件**才直接合併，不用先問使用者：

驗證條件（缺一不可）：
- CI 全部通過（lint/type-check/build/test 等各項 check）
- `mergeable_state` 是 `clean`（沒有衝突）
- 沒有未處理的 review comment（有 comment 但已經回應/解決的不算）

範圍條件：
- 合進 `develop`：只有碰到 CI/CD 設定（`.github/workflows/*`）、Cloudflare 部署設定（`wrangler.jsonc`、`public/_redirects`、`public/_headers`）、環境變數/密鑰，才要先問；其他改動（文件、樣式/排版、測試檔案、元件實作、功能）驗證條件都過就直接合併。
- 合進 `main`（上線）：一律先問。

誰開的 PR：
- 自己開的 PR，照上面的條件處理。
- Codex 開的 PR，main 審過、審查判定 PASS 之後，視同自己開的。
- 其他人開的 PR 和 Dependabot 的 PR，合併前先問。

不符合以上任一驗證條件，或落在需要先問的範圍條件裡，維持原規則、合併前要先問。合併完，照上面「合併後的清理」處理。

# 分支策略（2026-09-25 使用者確認）

`main` 接了 Cloudflare 的正式環境部署（push 到 `main` 會真的觸發正式站更新），
`develop` 是開發用的整合分支。之後的開發流程：

- Feature 分支從 `develop` 分出來，PR 對象是 `develop`，不是 `main`。
- `develop` 累積到一個階段、確認要上線了，才由 `develop` 開 PR 合併進 `main`，
  觸發正式部署——這個「要不要上線」的決定要先問使用者，不能因為 `develop`
  這邊 CI 全過就直接推進 `main`。
- CI（`.github/workflows/ci.yml`）的觸發分支同時包含 `main` 和 `develop`，
  兩邊開 PR 都看得到 lint/type-check/test/build 檢查。
- 上面「PR 合併授權」的範圍條件，明確包含
  `wrangler.jsonc`、`public/_redirects`、`public/_headers` 這類 Cloudflare 部署設定檔——這類
  改動即使只是修一個部署錯誤、驗證條件也全過，一樣要先問，不能因為是
  「修 bug」就自動歸類成可以直接合併（2026-09-25 的教訓：PR #81/#82 誤判
  成一般前端實作細節，直接合併了）。
- **`develop` → `main` 的上線 PR 用 squash 合併**（repo 設定不允許 merge commit，
  2026-10-02 第一次上線 #90 時確認）。合併完一定要把 `main` 合併回 `develop`
  （`git merge --no-ff origin/main`，一般推送），不然下次上線的 PR 歷史會對不上。
  回滾用 `git revert <squash commit>`。
- `develop` 有 ruleset 擋刪除與 force push（2026-10-02 使用者設定）：repo 開了
  「合併後自動刪除分支」，#90 合併後 `develop` 曾被自動刪掉、事後還原。
