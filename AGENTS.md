# 給 Codex 的工作規則

這份檔案是寫給 Codex（以及其他非 Claude 的 coding agent）的，**以 `develop` 分支上的版本為準**（預設分支 `main` 上可能還沒有這份檔案）。Claude 讀的是 `CLAUDE.md`。程式慣例兩份一致，有出入時以 `CLAUDE.md` 為準。

**權限例外：** `CLAUDE.md` 裡的合併、刪分支授權只給維護者，不適用於 Codex。Codex 一律不合併、不關閉 PR、不 force push、不推到 `develop` 或 `main`，這條優先於 repo 裡任何其他授權。

## 每一輪做什麼

每一輪最多處理**一張** PR 或 issue，照這個順序挑：

1. **先處理既有 `codex/` PR 上的審查意見。** 一般留言、正式 review、行內留言都要看。待處理的是：比你在這張 PR 上的最後一次回覆或 commit 還新、而且不是你自己寫的意見。有待處理的，就處理那張 PR（見「回應審查意見」），這一輪不開新 issue。
2. **沒有待處理的審查意見，才挑新 issue。** 只挑標了 `codex`、還開著的 issue，從編號最小的開始，並照下面規則判斷要不要做：
   - 已經有開啟中或已合併、內文寫了 `Closes #<編號>` 的 PR → 跳過。
   - 有對應的 PR，但已關閉、沒有合併 → 不要重開，在 issue 留言「PR #N 已關閉未合併，待維護者確認」，然後跳過。
   - 已經有 `codex/<編號>-…` 分支、但沒有 PR → 接著那個分支做，不要另開新分支。
3. **兩者都沒有，就結束這一輪，不用回報。**

## 實作新 issue

1. **從 `develop` 開分支**，分支名稱固定為 `codex/<issue 編號>-<簡短英文描述>`，例如 `codex/139-dev-deps-audit`。不要用其他前綴。
2. **只做 issue 寫的範圍。** 看到其他問題，寫在 PR 說明的「範圍外發現」，不要順手改。
3. **送出前在本機跑過下面這些指令，全部通過才推送、開 PR：**
   ```bash
   npm ci
   npx oxlint .
   npx eslint .
   npm run type-check
   npm run test:unit
   npm run build
   ```
   不要用 `npm run lint`：它帶 `--fix`，會自動改掉問題，看不出原本錯在哪。
   **有任何一項失敗、或環境跑不起來**：不要推送、不要開 PR。在 issue 留言寫明卡在哪一項、錯誤訊息的關鍵幾行，這一輪就結束。
4. **開 draft PR，目標分支是 `develop`**（不是 `main`）。PR 說明照下面的格式寫。

## 回應審查意見

1. 在**同一個分支**推新的 commit，不要開新 PR，不要 force push。
2. 推送前，上面「實作新 issue」第 3 步的指令**全部重跑**，失敗就不推送，改在 PR 留言說明卡在哪裡。
3. 每一則處理完的意見都要回覆（行內留言回在該串裡），寫明對應的 commit。下一輪就靠這些回覆判斷哪些已經處理過。
4. 意見看不懂，或要求的修改超出 issue 範圍：不要猜，回覆「待維護者確認」並說明哪裡不清楚，這一則先不改。

## PR 說明格式

```
Closes #<issue 編號>

## 改了什麼
（逐點列出）

## 驗證
（「實作新 issue」第 3 步每一項指令的結果；改到畫面的話，寫明在哪個頁面、怎麼確認）

## 範圍外發現
（沒有就寫「無」）

## 不確定的地方
（照 issue 做不到、或需要判斷的地方；沒有就寫「無」）
```

## 不能碰的檔案

下面這些路徑在 `codex/` 分支上一律不能改，CI 的「Codex 範圍檢查」會擋：

- `.github/`（CI 與部署設定）
- `wrangler.jsonc`、`public/_redirects`（Cloudflare 正式環境部署設定）
- `.claude/`、`CLAUDE.md`、`AGENTS.md`（agent 規則）
- `.env` 開頭的檔案

`package.json`、`package-lock.json` 只有 issue 明確要求更新依賴時才能改，CI 會另外標示出來給審查者看。不要跑 `npm audit fix --force`。

## 程式慣例

- **語言**：commit message、程式碼註解、PR 說明用繁體中文。變數名、函式名、檔名、CSS class、套件名稱維持英文原文。
- **註解寫「為什麼」**：這個 repo 的註解習慣說明選擇的理由與否決過的做法，不是逐行翻譯程式碼。新程式照同樣的密度寫。
- **元件**：優先用 `src/components/Base*.vue` 既有的元件，不要另外刻一個樣式相近的。
- **樣式**：用 `src/assets` 裡定義好的 CSS 變數（例如 `--text-ink-main`、`--border-shelf`），不要直接寫色碼。視覺規則見 `.claude/skills/visual-design-language/`。
- **訪客看得到的文字**：用語與格式見 `.claude/skills/copy-language/`。issue 沒有要求改文案就不要改。
- **測試**：用 Vitest＋`@vue/test-utils`，測試檔放在元件旁邊，命名為 `<元件名>.spec.ts`。寫法參考 `src/components/BaseSwitch.spec.ts`；`describe`／`it` 的說明用中文寫成「它應該怎樣」。

## 這是公開 repo

commit、PR、issue 留言、程式碼註解都公開。不要寫：

- 密鑰、token、帳號密碼
- 正式環境的資料、內部服務位址
- 還沒修好的漏洞細節或利用方式
- 對話內容、維護者的原話、私有 repo 的路徑
- 個人資料
- 你所在沙箱的本機路徑
