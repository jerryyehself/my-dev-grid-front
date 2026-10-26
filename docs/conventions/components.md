# 元件設計

## props 只收用得到的

- 元件只宣告它真的會用到的 props，不要為了方便把整個物件傳進去（例如整篇文章、整個圖譜節點），再在裡面挑一兩個欄位。
  - 收整個物件：元件會跟著那個物件的形狀綁死，物件一改，所有用到它的元件都要檢查；測試也得造一個完整物件。
  - 例外：元件本來就是在呈現那個物件的大部分欄位（例如文章詳情卡），收整個物件比較清楚。
- props 用 TypeScript 型別宣告（`defineProps<{ … }>()`），可省略的 prop 用 `withDefaults` 給預設值。
- 子元件不直接改 props；要改就 `emit` 事件，由父元件決定。

## 邏輯放哪裡

- 只有一個元件用的邏輯，留在元件裡。
- 兩個以上元件會用到、而且跟 Vue 的響應式有關的邏輯，抽成 composable（`useXxx`，例如 `useTheme`、`useProjectsFilter`），放在 [`structure.md`](structure.md) 規定的位置。
- 跟 Vue 無關的純計算（格式轉換、排版演算法），寫成普通的 `.ts` 函式，例如 `src/components/markdown/excerpt.ts`。這類函式比較好測，也不需要掛載元件。
- 同一件事只在一個地方算：例如摘要只由 `excerptOf()` 產生、標題錨點只由 `extractHeadings()` 產生，其他地方都呼叫它，不要各自重算。
- `Base*` 元件只負責呈現，不呼叫 API、不讀 store。
