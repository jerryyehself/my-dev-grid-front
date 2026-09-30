# 網站 icon 與社群分享圖

`build.mjs` 產生 `public/` 底下這四個檔案，`index.html` 的 `<head>` 引用它們：

| 檔案 | 用途 |
|---|---|
| `favicon.svg` | 現代瀏覽器的分頁 icon |
| `favicon.ico` | 舊瀏覽器退回用，內含 16、32px 兩張 |
| `apple-touch-icon.png` | iOS 加到主畫面，180px；做成方角，系統會自己裁圓角（透明的角會變黑） |
| `og-image.png` | 社群分享卡片（LinkedIn、LINE 等），1200×630 |

## 設計（2026-09-30 使用者選定 D2）

藏青圓角方塊，Libre Caslon Bold 的「IN」，下方一條黃銅線。米白字配藏青是導覽列字標的配色，黃銅線呼應導覽列 active 連結的底線。
比較過的其他版本：方角、黃銅字、線貼著字（字要縮小，16px 會糊）、線靠近底邊（字跟線看起來分家）。

- 顏色是 `src/assets/css/variables.css` 淺色主題的 `--bg-band-strong`、`--text-on-band`、`--accent-brass`，改色票時要重跑。
- 瀏覽器畫 favicon 不會載網頁字型，所以「IN」是從字型檔轉出來的向量路徑，不是 `<text>`。
- 比例寫在 `iconSvg()` 的註解裡。黃銅線高 6（100 單位的畫布），16px 時約 1px，再細就看不見。

## 重跑

```bash
cd design/icon
npm i          # 依賴只裝在這個目錄，不進前端專案
node build.mjs # 需要 curl 跟可以連外的 Chromium（抓 Google Fonts）
```
