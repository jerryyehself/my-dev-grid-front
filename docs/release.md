# 上線、合回 `develop` 與退版

這份是上線流程唯一的規則來源：`CLAUDE.md`、`README.md`、workflow 與腳本的註解只寫一句話加連結到這裡。切 release 分支、開上線 PR、合回 `develop`、修補與退版前讀一次。

§1–§8 是兩個 repo 共通的流程，後端（`my-dev-grid`）的 `docs/release.md` 用同樣的章節與寫法；§9 起是這個 repo 自己的部署目標與 migration。

## 1. 分支與上線時間

- `main` 接正式環境部署（§9），`develop` 是開發用的整合分支：合進 `develop` 不會部署到正式環境，只跑 CI。
- 平常的 PR 從 `origin/develop` 開、對 `develop`，只改文件的也一樣，所以 `main` 上的文件會等到下次上線才更新。clone 裡沒有 `origin/develop` 的話，先 `git fetch origin develop:refs/remotes/origin/develop`。
- 每週一上線。要不要上線一律先問使用者，就算 CI 全過也一樣。
- 前後端同一天上線時，後端先上、部署成功後再上前端，前端用到的新 API 才會已經在正式環境。
- CI 在開往 `main`、`develop`、`release/**` 的 PR 都會跑，所以從 `release/*` 開往 `main` 的上線 PR、開到 release 分支的修正 PR 也會跑。
- 預設分支維持 `main`：`main` 的保護規則與 Dependabot 的安全性更新都跟著預設分支。`develop` 有保護規則擋刪除與 force push。

## 2. 切 release 分支

每週一上線前，從 `develop` 切出這次要上線的分支，上線只看這條分支，`develop` 照常往前：

```bash
git fetch origin develop
git switch -c release/vX.Y.Z origin/develop
git push -u origin release/vX.Y.Z
```

- 切完之後才合進 `develop` 的 PR，搭下一次上線。
- `CHANGELOG.md` 的版本段（`## [X.Y.Z] - YYYY-MM-DD`）寫在 release 分支上，不寫在 `develop`。
- release 分支上只放版本段與上線期間的修正（§4），不在上面開發。

## 3. 上線 PR

- 從 `release/vX.Y.Z` 開 PR 到 `main`，說明照 §9（部署前後要確認的事）與 §10（migration）寫。
- 合併前一律先問使用者，就算 CI 全過也一樣。問的時候附上上線 PR 目前的 head SHA：使用者同意的是那個 SHA。合併前再看一次 head（`gh pr view <PR> --json headRefOid`），跟同意時不同就要重新確認。
- 用 squash 合併：`main` 上每次上線就是一個 commit，`release.yml` 依 `CHANGELOG.md` 在它上面打 tag、建 Release，退版也只要 revert 這一個 commit。

## 4. 上線期間的修正

- 上線 PR 開著的期間發現這次上線要修的問題：從 `origin/release/vX.Y.Z` 開分支、PR 對 `release/vX.Y.Z`。合併後上線 PR 的 head 會變，照 §3 重新確認。
- 修正不用另外開 PR 到 `develop`：上線後照 §5 把 `main` 合回 `develop`，修正會跟著回去。
- 不是這次上線要修的，照常開到 `develop`，搭下一次上線。
- `ci.yml` 也監聽開往 `release/**` 的 PR，所以修正 PR 本身就會跑 CI；修正合進 release 分支後，上線 PR 會在新的 head 上再跑一次。
- 上線 PR 合併前，開往這條 release 分支的修正 PR 要先合併或關掉（理由見 §5 第 4 步）。

## 5. 合併後：把 `main` 合回 `develop`

不合回去，下次上線時 `main` 跟 `develop` 的歷史會對不上：

1. 從 `origin/develop` 開分支，`git merge --no-ff origin/main`，一般 push，不是 force push。release 分支上的修正會在這一步回到 `develop`；跟 `develop` 之後的改動衝突的話，在這個 merge commit 裡解，解法不確定就停下來問使用者。
2. `develop` 設了必要檢查，沒跑過 CI 的 merge commit 直推會被擋：先把這個 merge commit 推到 `claude/merge-main-vX.Y.Z` 分支、開 PR 到 `develop` 只為了跑 CI。
3. CI 全綠後用 `git push origin <同一個 SHA>:refs/heads/develop` 快轉推送。不要在網頁上合併那個 PR（squash 或 rebase 會改寫歷史）；快轉推不上去就停下來問使用者。
4. repo 開了「合併後自動刪除分支」，`release/vX.Y.Z` 在上線 PR 合併後會被自動刪掉，這是預期的；還開著、對象是它的 PR 不會關掉，GitHub 會把它們的目標改成 `main`，看起來就像一個直接修補 `main` 的 PR，所以第 4 節要求合併上線 PR 前先把它們合併或關掉。`develop` 有保護規則，不會被刪。

## 6. 退版

用 `git revert <上線的 squash commit>` 開 PR 到 `main`，走 §7 的流程（從 `main` 開、合併前先問使用者、合完照 §5 合回 `develop`）。在部署平台上立即切回上一版的做法，見 §9。

## 7. 嚴重安全問題的修補（D-174）

- 從 `main` 開分支、PR 對 `main`，合併前先問使用者，合併即部署；合完照 §5 把 `main` 合回 `develop`。要發版本的話，在這個 PR 的 `CHANGELOG.md` 加修訂號版本。退版用的 revert PR 也走這條。
- 「嚴重」指：自己程式碼的漏洞會外洩私人資料，或能繞過登入、授權；或相依套件公告為 high／critical，而且正式環境真的會跑到有漏洞的程式路徑。只有開發用的套件、或沒呼叫到的路徑，不算嚴重。判斷不出來就先問使用者，附上公告和判斷理由。
- 其他修補，包括一般 bug、不嚴重的安全性或相依套件更新，都從 `develop` 開，跟每週上線一起上。

## 8. Dependabot

- Dependabot 的安全性更新只開在預設分支，PR 一定對 `main`。嚴重的照 §7；不嚴重的等上線 PR 合併後再合，接著照 §5 把 `main` 合回 `develop`。
- 這個 repo 的 `.github/dependabot.yml` 設了 `target-branch: develop`，版本更新的 PR 對 `develop`，照一般 PR 處理（Dependabot 的 PR 合併前先問，見 `CLAUDE.md`「PR 合併授權」）。

## 9. 部署目標：Cloudflare

### 9.1 哪些情況會部署

- push 到 `main` 就會更新正式站。
- Cloudflare 也會替每個分支建一份預覽部署，`develop` 與 `release/*` 都只有預覽，不會更新正式站。
- `release.yml` 只在 `main` 上建 Release。

### 9.2 合進 `main` 前後的確認

上線 PR 與 §7 的修補 PR 都適用：

- 合進 `main` 一律先問使用者（§3、§7），不套用 `CLAUDE.md`「PR 合併授權」裡驗證條件全過就直接合併的做法。
- repo 設定不允許 merge commit（2026-10-02 第一次上線 #90 時確認），上線 PR 只能 squash 合併（§3）。
- `develop` 的 ruleset（擋刪除與 force push）是 2026-10-02 設定的：#90 合併後 `develop` 曾被「合併後自動刪除分支」刪掉、事後還原。

### 9.3 立即退版

目前沒有寫下在 Cloudflare 上直接切回上一版的步驟，退版照 §6 開 revert PR。

## 10. 資料庫 migration

前端沒有資料庫 migration。上線 PR 用到後端新 API 的話，照 §1 等後端上線、部署成功之後再合併。
