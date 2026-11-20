# 上線與合回 `develop` 的步驟

`CLAUDE.md`「分支策略」寫原則（`develop` 累積到一個階段、問過使用者才開 PR 進 `main`，squash 合併，合完把 `main` 合回 `develop`），這份寫上線 PR 合併後才用得到的步驟。

## 1. 為什麼用 squash

repo 設定不允許 merge commit（2026-10-02 第一次上線 #90 時確認），上線 PR 只能 squash 合併。回滾用 `git revert <squash commit>`。

## 2. 合併後：把 `main` 合回 `develop`

不合回去，下次上線的 PR 歷史會對不上：

1. `git merge --no-ff origin/main`，一般推送。
2. `develop` 設了必要檢查，沒跑過 CI 的 merge commit 直推會被擋：先把它推到 `claude/merge-main-vX.Y.Z` 分支、開 PR 到 `develop` 只為了跑 CI。
3. CI 全綠後用 `git push origin <同一個 SHA>:refs/heads/develop` 快轉推送。不要在網頁上合併那個 PR；快轉推不上去就停下來問使用者。
4. 確認 `develop` 還在：repo 開了「合併後自動刪除分支」，#90 合併後 `develop` 曾被自動刪掉、事後還原。現在 `develop` 有 ruleset 擋刪除與 force push（2026-10-02 設定）。

後端（`my-dev-grid`）用同一套做法。
