# 🎨 專案前端視覺與唐諾曼設計心理學規範 (Design & Usability Principles)

本專案的前端開發與 UI 實作，必須嚴格遵守 Don Norman 在《設計心理學》（The Design of Everyday Things）中提出的行為科學與易用性原則。拒絕「好看但難用」的裝飾性設計。

---

## 🔍 1. 意符與示能 (Signifiers & Affordances)

- **按鈕必須像按鈕 (Buttons Must Look Clickable)**：
  - 嚴禁設計出讓使用者疑惑「這到底能不能點？」的元素。
  - 所有可點擊的元素（按鈕、連結、卡片）必須具備明確的視覺指引（如：微小的立體陰影、明確的邊框、Hover 時鼠標變更為 `cursor-pointer` 且背景微變）。
- **非點擊元素嚴禁誤導**：普通文字或單純的裝飾卡片，絕對不能使用看起來像按鈕的圓角外觀、高飽和度色彩或 Hover 浮起效果，避免誤導使用者。

## 🚦 2. 物理反饋與狀態 (Feedback & System Status)

- **即時的物理反饋 (Immediate Feedback)**：
  - 當使用者點擊按鈕或送出表單時，必須有明確的「被按下（Active）」視覺狀態（如：`active:scale-[0.98]` 或背景變深）。
  - 非同步操作（如 API 請求、登入中）必須立即顯示載入狀態（Loading Spinner 或 Skeleton 骨架屏），絕對不能讓畫面毫無反應地卡住。
- **防止雙擊與防呆**：送出表單的按鈕，在點擊後必須立刻進入 `disabled` 狀態，防止使用者重覆點擊（Double-click）造成 API 二次觸發。

## 🧠 3. 概念模型與防錯設計 (Conceptual Models & Error Prevention)

- **語意色彩一致性 (Semantic Color Consistency)**：
  - 嚴格遵守大眾的心理模型（Mental Model）：綠色/藍色代表成功與前進，黃色代表警告，紅色代表危險/刪除/報錯。
  - 絕對不能為了好看，而把「刪除按鈕」設計成綠色，或把「確認送出」設計成灰色。
- **破壞性動作確認 (Confirming Destructive Actions)**：
  - 凡是涉及「刪除」、「清空資料」等無法還原的破壞性操作，按鈕必須使用警示紅（如 `bg-red-600`），且必須觸發確認對話框（Confirmation Dialog），防止誤觸。

## 📑 4. 資訊層級與可發現性 (Visual Hierarchy & Discoverability)

- **首要動作突出 (Primary Action Dominance)**：
  - 在同一個區塊或對話框中，「主要動作」（如：儲存、送出）必須是高彩度的滿版按鈕。
  - 「次要動作」（如：取消、返回）必須使用外框線（Outline）或無邊框的文字按鈕，確保使用者的視覺焦點在 0.1 秒內被引導到正確的第一步。
