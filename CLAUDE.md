# 語言慣例

跟這個 repo 有關的所有輸出，預設用**繁體中文**：

- Git commit message(標題與內文都是)
- 程式碼註解
- 對使用者的回覆/說明文字

程式碼本身(變數名、函式名、檔名、CSS class)、技術術語、套件名稱、既有的英文專有名詞(例如 Vue、Tailwind、Laravel)維持原文，不用硬翻。

# 程式慣例（2026-10-26 使用者確認）

檔案結構與命名規則寫在 [`docs/conventions/`](docs/conventions/README.md)，Claude、Codex、人都照同一份。新增檔案或元件、搬動檔案前先讀 `structure.md` 與 `naming.md`；新功能放 `src/features/<功能名>/`，舊功能要大改時才整個搬過去。

# Git commit/push 授權（2026-09-12 使用者確認）

例行步驟（commit、推送到工作分支、開 PR（草稿或正式）、唯讀檢查、安全的重試）不用問使用者，做完覺得可以收尾了就直接做，不用停下來等確認；合併的範圍照下面「PR 合併授權」。

force push、`git reset --hard`、跳過 hook（`--no-verify`）這類本來就該格外小心的動作，一樣預設先跟使用者確認過再做。

## 合併後的清理（2026-11-12 使用者確認）

agent 不刪遠端分支：repo 開了「合併後自動刪除分支」，已合併的遠端分支會自己消失，agent 也沒有刪遠端分支的權限。合併後只做本機清理：切回 base 分支、移除已合併的本機分支和 worktree，這屬於本機整理，不用問。

## PR 合併授權（2026-09-14 使用者確認，依「哪些事要問使用者、哪些不用」的分級標準）

自己開的 PR，同時符合以下**驗證條件**跟**範圍條件**才直接合併，不用先問使用者：

驗證條件（缺一不可）：
- CI 全部通過（lint/type-check/build/test 等各項 check）
- `mergeable_state` 是 `clean`（沒有衝突）
- 沒有未處理的 review comment（有 comment 但已經回應/解決的不算）
- 依改動路徑與行數分級需要品質審查的 PR，要有對應目前 head 的審查 PASS（D-172）；合併前的檢查會擋沒有 PASS 的合併

範圍條件：
- 合進 `develop`：只有碰到 CI/CD 設定（`.github/workflows/*`）、Cloudflare 部署設定（`wrangler.jsonc`、`public/_redirects`、`public/_headers`）、環境變數/密鑰，才要先問；其他改動（文件、樣式/排版、測試檔案、元件實作、功能）驗證條件都過就直接合併。
- 合進 `main`（上線、嚴重安全修補）：一律先問，流程見 [`docs/release.md`](docs/release.md)。

「先問」的範圍明確包含 `wrangler.jsonc`、`public/_redirects`、`public/_headers` 這類 Cloudflare 部署設定檔：這類改動即使只是修一個部署錯誤、驗證條件也全過，一樣要先問，不能因為是「修 bug」就自動歸類成可以直接合併（2026-09-25 的教訓：PR #81/#82 誤判成一般前端實作細節，直接合併了）。

誰開的 PR：
- 自己開的 PR，照上面的條件處理。
- Codex 開的 PR，main 審過、審查判定 PASS 之後，視同自己開的。
- 其他人開的 PR 和 Dependabot 的 PR，合併前先問。

不符合以上任一驗證條件，或落在需要先問的範圍條件裡，維持原規則、合併前要先問。合併完，照上面「合併後的清理」處理。

# 分支策略（2026-09-25 使用者確認）

`main` 接 Cloudflare 的正式環境部署（push 到 `main` 就會更新正式站），`develop` 是開發用的整合分支。平常的 PR 從 `develop` 分出、對 `develop`。上線、合回 `develop`、嚴重安全問題的修補、Dependabot 與退版，動手前讀 [`docs/release.md`](docs/release.md)，那份是上線流程唯一的規則來源。要不要上線一律先問使用者，就算 CI 全過也一樣。
