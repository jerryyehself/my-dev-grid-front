import { ref } from 'vue'

// 站名與瀏覽器分頁標題。站名跟導覽列字標一致，用 IN / ARCHIVE（D-32 定案；網域叫 jerrylib
// 不影響站名）。要改的話改這裡，再同步 index.html 的 <title>、og:site_name、og:title。
export const SITE_NAME = 'IN / ARCHIVE'

/** 首頁與沒有頁面標題的路由用這個：多帶作者名，分頁上看得出是誰的網站。 */
export const SITE_TITLE = `${SITE_NAME} — Jerry Yeh`

/**
 * 載入後才知道的頁面標題（文章內頁的文章標題），蓋過 route.meta.title；換頁時 App.vue 清掉。
 * 不直接改 route.meta：useRoute() 是 shallowReactive，改 meta 不會觸發畫面更新，而且 meta
 * 就是路由設定本身，改了會殘留到下一次進同一條路由（開下一篇文章時先閃過上一篇的標題）。
 */
export const pageTitleOverride = ref<string | null>(null)

/** 分頁標題：「頁面標題 — 站名」。首頁的 meta.title 本身就是站名，不重複。 */
export function documentTitle(routeName: unknown, pageTitle: unknown): string {
  if (routeName === 'home' || typeof pageTitle !== 'string' || !pageTitle) return SITE_TITLE
  return `${pageTitle} — ${SITE_NAME}`
}
