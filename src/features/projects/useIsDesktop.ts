import { onScopeDispose, ref, type Ref } from 'vue'

// Tailwind 的 md 斷點。專案頁桌機版（左欄列表＋右欄詳情）跟手機版（上下堆疊）的版面差太多，
// 不是同一份 DOM 換幾個 class 能解決的，所以用這個決定畫哪一棵樹。
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * 視窗是否在桌機寬度。沒有 matchMedia 的環境（jsdom）視為桌機，不丟錯。
 * 初始值在 setup 裡同步算出來，第一次畫面就是對的，不會先畫手機版再跳成桌機版。
 */
export function useIsDesktop(): Ref<boolean> {
  const query = typeof window !== 'undefined' ? window.matchMedia?.(DESKTOP_QUERY) : undefined
  const isDesktop = ref(query ? query.matches : true)
  if (query) {
    const onChange = (e: MediaQueryListEvent) => {
      isDesktop.value = e.matches
    }
    query.addEventListener('change', onChange)
    onScopeDispose(() => query.removeEventListener('change', onChange))
  }
  return isDesktop
}
