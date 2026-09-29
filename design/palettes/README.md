# 候選配色

2026-09-29 About 頁改版時產生的幾組候選配色，留著日後切換、比較用。**藏青第二版已經是全站正式配色**（D-59，同日），數值原封不動搬進 `src/assets/css/variables.css`；其他兩組沒有接上正式網站。

## 為什麼有這個目錄

現行淺色主題（米白底 `#fcfaf2`＋襯線標題＋黃銅棕 `#b45309`）幾乎就是 AI 生成設計最常見的樣板：暖米白底、高對比襯線字、磚紅強調色。`.claude/skills/visual-design-language/SKILL.md` 的 AI 樣板檢查清單也列了這條，只是當初選色時沒有對照。另外，`#b45309` 放在 `--bg-paper-dark`（`#f4f0e1`）上的小字對比只有 4.40:1，沒過 WCAG AA 的 4.5:1。

換色不能只換單一顏色：token 之間互相搭配，兩個主題也要各算一次，所以每組都是整套一起產生、一起驗證。

## 檔案

| 檔案 | 內容 |
|---|---|
| `green.css` | 綠布書脊＋黃銅（銀行燈的綠玻璃配黃銅） |
| `navy-v1.css` | 藏青書脊＋酒紅，第一版：底色偏冷白，整體偏灰 |
| `navy-v2.css` | **藏青第二版（使用者選的方向）**：60% 卡紙底／30% 藏青（色帶、深色區塊、淡藏青卡片）／10% 酒紅，黃銅當第三色；深色主題改用黃銅當強調色 |
| `palettes.json` | 三組的完整 token 值，加上每組文字/底色的對比檢查結果 |
| `tools/` | 產生與驗證用的腳本（見下方） |

## 試用

```js
// 例如在 main.ts 暫時加上，或直接在瀏覽器 devtools 裡做
import '../design/palettes/navy-v2.css'
document.documentElement.classList.add('palette-navy-v2')
```

兩個主題會一起換：`.theme-terminal` 在的時候套深色那組。

`navy-v2.css` 裡標「新增提案」的 token（`--bg-band-strong`、`--text-on-band`、`--accent-brass`、`--accent-secondary`、`--cat-fill-*`）已經討論過並採用（D-59），現在是 `variables.css` 的正式 token，About 頁在用。

## 怎麼產生的

1. **Leonardo**（`@adobe/leonardo-contrast-colors`）：指定每個 token 對底色的目標對比，例如次要文字 5.4:1、強調色 5.4 到 7.2:1，由它反推色值，淺色和深色主題各算一次。
2. **culori**：補 Leonardo 不處理的部分，包括導覽列（深底）上的文字/選中色，以及抽屜面板這種「上面放白字」的分類色。做法是固定色相和彩度，二分搜尋 OKLCH 明度，直到達到目標對比。
3. **節點分類色**：用 dataviz skill 的 `validate_palette.js --pairs all` 驗證（亮度帶、彩度下限、色盲模擬 ΔE、一般視覺 ΔE、對 `--canvas-bg` 的對比）。`search.mjs` 在固定色相下搜尋明度組合，挑最低 ΔE 最大、而且全部檢查都通過的那一組。

重跑：

```bash
cd design/palettes/tools
npm i                  # 依賴只裝在這個目錄，不進前端專案
node gen.mjs           # 綠布、藏青第一版（specs.json 定義種子色）
node gen2.mjs          # 藏青第二版（要在 gen.mjs 之後跑，它會把結果併進 palettes.json）
VALIDATE_PALETTE=<dataviz skill 的 scripts/validate_palette.js> node search.mjs light "#e4ebf5" '[[15,0.14],[195,0.12],[290,0.13]]'
```

`shots.mjs` 會把 `palettes.json` 的配色用 CSS 覆寫注入正在跑的 dev server（`localhost:5173`），逐頁截圖（首頁、Articles、Projects、Graph、About × 兩個主題），完全不改程式碼。啟動前後端的方式見 `.claude/skills/run-app/SKILL.md`。Chromium 要用 `--proxy-server=https=<代理>`，只讓 https 走代理：這個環境的代理只接受 CONNECT，bypass 清單對 localhost 無效，整個走代理會拿到代理的錯誤頁。

## 驗證結果

- **文字對比**：三組的兩個主題都全部 ≥ 4.5:1（`palettes.json` 每組都有 `audit` 陣列）。藏青第二版另外檢查了淡藏青卡片上的文字、整條色帶上的文字與黃銅、抽屜面板上的白字，每個主題 20 組。
- **節點分類色**（`--pairs all`，對各自的 `--canvas-bg`）：綠布最低色盲 ΔE 17.4，藏青第一版 10.7，藏青第二版 10.8，門檻是 8。藏青第二版的色帶底換成淡藏青後，第一輪有兩色對底色不到 3:1，重新搜尋後通過。
- **截圖觀察**：套進現有頁面不會破版。淺色主題換掉黃銅次要文字之後明顯變灰、變冷，所以才有第二版（卡紙底、淡藏青卡片、黃銅第三色）。現有頁面沒有大面積藏青色帶的位置，第二版的效果要看 About 頁 E 版 mockup（canvas `HcnHo2yYoWQdFypRg7Y2qU` 的 `Catalog.dc.html`）才看得出來。

## 程式碼裡寫死、換色時要一起處理的顏色

- `src/components/home/KnowledgeGraphPanel.vue`：卡片與浮層陰影 `rgba(41,18,5,0.14)`，是現行導覽列色寫死的。
- `src/components/TheNavbar.vue`、`src/assets/css/base.css`：斜紋底紋用的 `rgba(255,255,255,0.025)`、`rgba(255,184,77,0.025)`。
