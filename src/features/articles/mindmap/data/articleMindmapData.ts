// 已發布文章的心智圖資料（正式站用）。每篇一個 JSON，用動態 import 延遲載入，build 時各自是一個分塊，
// 沒打開心智圖的讀者不會下載。資料先放在前端，之後改由後端提供時，換掉 articleMindmapSource.ts 的來源即可。
//
// 出處（unit_id）是正式環境那篇內文的標題 slug。各篇內文的快照在 articleMindmap<id>Body.md，
// articleMindmapData.spec.ts 拿快照檢查每個出處都連得到段落、每個詞都出現在連到的段落裡。
// 文章改版改到標題時，要重抓快照、重對出處。

/** 文章 id → 載入那篇心智圖的原始資料（格式由 articleMindmapSource.ts 驗證） */
export const ARTICLE_MINDMAP_DATA: Readonly<Record<number, () => Promise<unknown>>> = {
  12: async () => (await import('./articleMindmap12.json')).default,
  13: async () => (await import('./articleMindmap13.json')).default,
  14: async () => (await import('./articleMindmap14.json')).default,
  15: async () => (await import('./articleMindmap15.json')).default,
  16: async () => (await import('./articleMindmap16.json')).default,
  17: async () => (await import('./articleMindmap17.json')).default,
}
