import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 「能懸停、指標精準」的裝置（滑鼠、觸控板）。心智圖用它分桌機與觸控裝置，不看視窗寬度：
 * 視窗寬度代表不了有沒有滑鼠。窄視窗的桌機照樣能懸停、點得準，所以不管視窗多窄都畫圖，
 * 窄的時候圖等比縮小；觸控裝置點不準小字，一律用大綱樹。
 * 清單的標題懸停也看同一個條件。
 */
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

/** 現在是不是能懸停、指標精準的裝置。瀏覽器不支援 matchMedia 時當作是（照桌機畫）。 */
export function matchesFinePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(FINE_POINTER_QUERY).matches
}

/** 同上，接上滑鼠或切換平板模式時會跟著變。 */
export function useFinePointer() {
  const fine = ref(matchesFinePointer())
  let media: MediaQueryList | null = null
  const onChange = (event: MediaQueryListEvent) => {
    fine.value = event.matches
  }
  onMounted(() => {
    if (typeof window.matchMedia !== 'function') return
    media = window.matchMedia(FINE_POINTER_QUERY)
    fine.value = media.matches
    media.addEventListener?.('change', onChange)
  })
  onBeforeUnmount(() => media?.removeEventListener?.('change', onChange))
  return fine
}
