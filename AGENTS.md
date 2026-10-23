# 給 Codex 的工作規則

這份檔案是寫給 Codex（以及其他非 Claude 的 coding agent）的。Claude 讀的是 `CLAUDE.md`，兩份規則一致；有衝突時以 `CLAUDE.md` 為準。

## 流程

1. **只做標了 `codex` 標籤、還開著的 issue。** 已經有對應 PR（PR 內文寫了 `Closes #<編號>`）的不要重做。一次只做一張。
2. **從 `develop` 開分支**，分支名稱固定為 `codex/<issue 編號>-<簡短英文描述>`，例如 `codex/139-dev-deps-audit`。不要用其他前綴。
3. **只做 issue 寫的範圍。** 看到其他問題，寫在 PR 說明的「範圍外發現」，不要順手改。
4. **送出前在本機跑過下面這些指令，全部通過才開 PR：**
   ```bash
   npm ci
   npx oxlint .
   npx eslint .
   npm run type-check
   npm run test:unit
   npm run build
   ```
   不要用 `npm run lint`：它帶 `--fix`，會自動改掉問題，看不出原本錯在哪。
5. **開 draft PR，目標分支是 `develop`**（不是 `main`）。PR 說明照下面的格式寫。
6. **不要合併、不要關閉 PR，也不要推到 `develop` 或 `main`。** 審查和合併由維護者處理。
7. 審查留言要求修改時，在**同一個分支**推新的 commit，不要開新 PR，不要 force push。

## PR 說明格式

```
Closes #<issue 編號>

## 改了什麼
（逐點列出）

## 驗證
（第 4 步每一項的結果；改到畫面的話，寫明在哪個頁面、怎麼確認）

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
