// 文章心智圖的資料從哪裡來。後端還沒產生心智圖（詞表與作者整理流程排在下一輪），
// 目前只有一篇作者手寫的整理成 fixture。之後接上 API 時只換這個檔案，元件不用動。
//
// 哪些文章有心智圖是同步判斷（清單上每一篇都要問，不能為了問一下就把資料載進來）；
// 資料本身用動態 import 延遲載入，沒有心智圖的文章、沒滑到標題的清單都不會下載它。
//
// fixture 的出處（unit_id）對的是正式環境那篇的內文（快照在 articleMindmapFixtureBody.md，
// articleMindmapFixture.spec.ts 守著）。後端種子資料裡的那篇是改寫前的原稿，標題不一樣，
// 所以本機開發時那篇的心智圖照樣畫得出來，但每個詞都沒有出處可以點（只剩連到圖譜的詞能點），這是預期的。
import type { ArticleMindmap } from './articleMindmapTypes'
import { isArticleMindmap } from './articleMindmapValidate'

/** 有心智圖的文章 id。要跟 fixture 的 article_id 一致（articleMindmapSource.spec.ts 守著）。 */
export const MINDMAP_ARTICLE_IDS: ReadonlySet<number> = new Set([14])

export function hasArticleMindmap(articleId: number): boolean {
  return MINDMAP_ARTICLE_IDS.has(articleId)
}

/**
 * 做一個載入函式。`fetchData` 回傳原始資料（目前是 fixture 的動態 import），測試可以換掉它。
 * 沒有心智圖、資料不合格式、資料不是這篇的、載入失敗，都回 null，呼叫端就什麼都不畫——
 * 壞資料不該變成畫到一半的圖。成功或確定沒有的結果會記住；載入失敗不記，下次再試。
 */
export function createMindmapLoader(
  fetchData: (articleId: number) => Promise<unknown>,
): (articleId: number) => Promise<ArticleMindmap | null> {
  const cache = new Map<number, Promise<ArticleMindmap | null>>()
  return (articleId) => {
    if (!hasArticleMindmap(articleId)) return Promise.resolve(null)
    let pending = cache.get(articleId)
    if (!pending) {
      pending = fetchData(articleId).then(
        (data) => (isArticleMindmap(data) && data.article_id === articleId ? data : null),
        () => {
          // 例如部署換版後舊的分塊不見了
          cache.delete(articleId)
          return null
        },
      )
      cache.set(articleId, pending)
    }
    return pending
  }
}

export const loadArticleMindmap = createMindmapLoader(async () => (await import('./articleMindmapFixture.json')).default)
