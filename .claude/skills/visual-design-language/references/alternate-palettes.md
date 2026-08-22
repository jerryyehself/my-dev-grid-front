# 備用色票（未套用，寫好留著以後直接套）

夜讀主題（`.theme-terminal`）目前套用的是 Gruvbox（見 `SKILL.md`）。以下三組是同一輪
比較裡沒選中的候選，全部算過真實 WCAG 對比度、跑過 AI 生成套路檢查，隨時可以拿來換掉
`variables.css` 裡 `.theme-terminal` 區塊的內容——**不用改 class 名稱、不用碰
`useTheme.ts`/`ThemeToggle.vue`，換色只要換 `.theme-terminal { ... }` 裡的值**。

## 為什麼這三組沒選

不是因為它們比 Gruvbox 差，是因為 Gruvbox 有「大量專案實際驗證過」這個額外優勢；
這三組是用 HSL 數學公式算出來的，同樣站得住腳，只是換方向時的參考基準不同：

- **A 暖琥珀磷光**：延續現有木質圖書館的黃銅色系，最保守、最不會出錯的選擇
- **B 圖書館綠燈罩**：經典銀行家檯燈的深綠玻璃燈罩色，是三組裡「圖書館」符號最直接的一個
- **C 陳年赤陶皮革**：老書皮革封面色，最「典藏」、最深沉的方向

## A. 暖琥珀磷光

```css
.theme-terminal {
    --bg-paper-light: #1e1910;
    --bg-paper-dark: #15110a;

    --bg-nav-footer: #15110a;
    --text-nav-footer: #957c50;
    --text-nav-hover: #f0b44c;

    --nav-bg-opacity: 0.95;
    --nav-blur: 0px;

    --text-ink-main: #f1e5d0;
    --text-ink-body: #c5ae87;
    --text-ink-muted: #957c50;
    --text-accent: #f0b44c;
    --border-shelf: rgba(240, 180, 76, 0.18);
    --bg-folder: rgba(240, 180, 76, 0.07);
}
```
對比度：ink-main 14.0:1／ink-body 8.1:1／ink-muted 4.4:1（壓線但過 AA）／accent 10.2:1

## B. 圖書館綠燈罩（已用低飽和度修正過，避免踩到「近黑配酸綠」的 AI 套路）

```css
.theme-terminal {
    --bg-paper-light: #101e17;
    --bg-paper-dark: #0a1510;

    --bg-nav-footer: #0a1510;
    --text-nav-footer: #509575;
    --text-nav-hover: #41c889;

    --nav-bg-opacity: 0.95;
    --nav-blur: 0px;

    --text-ink-main: #d0f1e2;
    --text-ink-body: #87c5a8;
    --text-ink-muted: #509575;
    --text-accent: #41c889;
    --border-shelf: rgba(65, 200, 137, 0.18);
    --bg-folder: rgba(65, 200, 137, 0.07);
}
```
對比度：ink-main 14.2:1／ink-body 8.7:1／ink-muted 4.8:1／accent 8.7:1

## C. 陳年赤陶皮革（已用低飽和度修正過，避免踩到「近黑配朱紅」的 AI 套路）

```css
.theme-terminal {
    --bg-paper-light: #1e1310;
    --bg-paper-dark: #150c0a;

    --bg-nav-footer: #150c0a;
    --text-nav-footer: #956050;
    --text-nav-hover: #d16847;

    --nav-bg-opacity: 0.95;
    --nav-blur: 0px;

    --text-ink-main: #f1d7d0;
    --text-ink-body: #c59587;
    --text-ink-muted: #956050;
    --text-accent: #d16847;
    --border-shelf: rgba(209, 104, 71, 0.18);
    --bg-folder: rgba(209, 104, 71, 0.07);
}
```
對比度：ink-main 13.3:1／ink-body 6.9:1／ink-muted 3.5:1（**沒過 AA，換用前要再調亮**）／accent 5.3:1

## 已經放棄的方向（不留、不用回頭找）

- **原本的「藍白科技」冷色系**（`text-accent: #6366f1`）：跟現有的木質圖書館主題調性衝突，已被夜讀方向取代
- **藍圖/工程圖紙風**：跟架構圖內容天生合適，但使用者反應「終端機」方向更讓人驚艷，優先度較低；如果之後真的需要跟 SVG 架構圖搭配的主題，這個方向值得重新考慮，但目前沒有留色票，要用的話重新算
- **原始冷綠終端機**（`text-accent: #4ade80`，近黑背景）：直接踩到「近黑配酸綠」的 AI 生成套路，不建議恢復
