# Copilot Instructions

## 專案背景
- 這是 Vue 3 + Vite + TypeScript 的前端專案。
- 優先維持現有的資料夾結構與元件分層：
  - `src/components/`：可重用元件
  - `src/views/`：頁面元件
  - `src/router/`：路由設定
  - `src/stores/`：Pinia Store
  - `src/assets/`：靜態資源與樣式

## 開發原則
- 優先使用 Vue 3 Composition API 與 `<script setup>`。
- 新增或修改元件時，盡量保持語意明確、命名一致、結構簡潔。
- TypeScript 型別應盡量明確，避免使用 `any`，除非必要且有說明。
- 保持樣式與現有專案風格一致，優先沿用現有 CSS 與元件設計。
- 變更應盡量小而聚焦，避免不必要的重構。

## 常用檢查
- 開發完成後，優先確認：
  - `npm run build`
  - `npm run lint`

## 互動方式
- 若需要新增功能，先理解現有路由、元件與狀態管理方式，再進行實作。
- 若修 bug，應先找出根因，再做最小修改。
- 提供修改時，盡量附上簡短說明與影響範圍。
