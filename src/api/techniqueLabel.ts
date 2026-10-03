// 技術的顯示名稱：「{title} {version}」，version 留空就只有 title（例如「Vue 3」／「Vue」）。
//
// 同一個技術的每個版本在後端是獨立的一筆（title 相同、version 填主版號，2026-09-30），
// 只顯示 title 的話「Vue」和「Vue 3」會長得一模一樣。前端所有顯示技術名稱的地方都在
// API 層（把後端 DTO 轉成畫面用的形狀那一步）呼叫這裡，畫面元件不自己拼字串。
//
// 後端同一條規則是 my-dev-grid 的 `Technique::labelFrom()`（圖譜節點的 label、本體論
// 關係詳情的邊都已經是後端組好的名稱，前端不要再拼一次），兩邊格式要一致。
export function techniqueLabel(title: string, version?: string | null): string {
  // 只有空白也算沒填，跟後端 Laravel 的 filled() 一樣
  return version?.trim() ? `${title} ${version}` : title
}
