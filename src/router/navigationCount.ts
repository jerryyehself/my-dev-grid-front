// 這次整頁載入（開網站、重新整理、外部連結進來）之後，router 完成過幾次導航。
// 用來分辨「這一頁是整頁載入的第一個頁面」（次數 1）還是「站內從別頁換過來」（次數 2 以上）。
// 首頁最新收錄卡片的進場只在前者播，站內換頁只有換頁轉場。由 router/index.ts 的 afterEach 記錄。
let count = 0

export function recordNavigation() {
  count++
}

/** 目前這一頁是不是整頁載入後的第一個頁面（還沒有任何導航紀錄時也算，例如單元測試直接掛元件） */
export function isFirstPageOfLoad(): boolean {
  return count <= 1
}

/** 測試用 */
export function resetNavigationCount(next = 0) {
  count = next
}
