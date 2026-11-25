// 換頁轉場（左右軸）：決定「這一次換頁要不要播、往哪邊」。
// 只在站內點連結換頁時播；瀏覽器上一頁／下一頁（popstate，含 iOS 邊緣滑回）、程式自己導頁、
// 鍵盤觸發、減少動態、後台與編輯頁之間都直接切。動畫本身在 pageTransitionMotion.ts，
// 版面外框（導覽列固定、只動導覽列以下的整頁）在 MainLayout.vue。
import { reactive } from 'vue'
import type { Router } from 'vue-router'
import { getInputModality, type InputModality } from '@/composables/useInputModality'

/** 1：往右邊的頁面（新頁從右滑入、舊頁往左退）；-1：反過來 */
export type PageDirection = 1 | -1

/** 換頁的來源。'link' 是站內點連結；'pop' 是瀏覽器上一頁／下一頁；'other' 是程式自己導頁（登入後、存檔後） */
export type PageNavTrigger = 'link' | 'pop' | 'other'

/**
 * 公開頁在左右軸上的位置，照導覽列由左到右的順序（HOME、ARTICLES、PROJECTS、GRAPH、ABOUT）。
 * 文章內頁算在 ARTICLES 右邊、PROJECTS 左邊。沒列在這裡的頁面（登入、後台、編輯頁、本體論、404）不播。
 */
export const PAGE_POSITIONS: Readonly<Record<string, number>> = {
  home: 0,
  articles: 1,
  'article-detail': 1.5,
  projects: 2,
  graph: 3,
  about: 4,
}

export function pagePosition(name: unknown): number | null {
  if (typeof name !== 'string') return null
  return Object.hasOwn(PAGE_POSITIONS, name) ? PAGE_POSITIONS[name]! : null
}

export interface PageTransitionInput {
  /** 換頁前後的路由名稱；第一次載入時 from 是 undefined */
  from: unknown
  to: unknown
  trigger: PageNavTrigger
  modality: InputModality
  reducedMotion: boolean
}

export type PageTransitionDecision =
  | { play: true; dir: PageDirection }
  | { play: false; reason: 'not-link' | 'keyboard' | 'reduced-motion' | 'not-public' | 'same-position' }

export function decidePageTransition(input: PageTransitionInput): PageTransitionDecision {
  if (input.trigger !== 'link') return { play: false, reason: 'not-link' }
  if (input.reducedMotion) return { play: false, reason: 'reduced-motion' }
  if (input.modality === 'keyboard') return { play: false, reason: 'keyboard' }
  const from = pagePosition(input.from)
  const to = pagePosition(input.to)
  if (from === null || to === null) return { play: false, reason: 'not-public' }
  // 同一頁再點、文章內頁換到另一篇：位置一樣，沒有方向，不播（元件也是同一個，照原本的方式就地更新）
  if (from === to) return { play: false, reason: 'same-position' }
  return { play: true, dir: to > from ? 1 : -1 }
}

/**
 * MainLayout 讀這份狀態：key 只在要播的時候加一，換了 key，<Transition> 才會讓舊頁離開、新頁進來；
 * 不播的換頁 key 不變，頁面照原本的方式就地切換。
 */
export const pageSwap = reactive<{ key: number; dir: PageDirection }>({ key: 0, dir: 1 })

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 開始追蹤換頁來源，只裝一次；回傳的函式會移除監聽（測試用）。
 * 判斷「點連結」的方式：capture 階段記下這次點的站內連結網址，換頁完成時網址對得上才算。
 * 修飾鍵、中鍵、開新分頁、下載、外部連結都不記；換頁失敗或被導去別頁（例如沒登入被導去登入頁）就對不上。
 */
export function installPageTransition(router: Router): () => void {
  let pendingLink: string | null = null
  let popped = false

  const onClick = (event: MouseEvent) => {
    pendingLink = null
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!(anchor instanceof HTMLAnchorElement)) return
    if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
    const url = new URL(anchor.href, window.location.href)
    if (url.origin !== window.location.origin) return
    const base = router.options.history.base
    const path = base && url.pathname.startsWith(base) ? url.pathname.slice(base.length) || '/' : url.pathname
    pendingLink = router.resolve(path + url.search + url.hash).fullPath
  }

  document.addEventListener('click', onClick, true)
  // history.listen 只在 popstate（上一頁／下一頁、iOS 邊緣滑回、router.back()）時觸發，push 不會
  const stopPop = router.options.history.listen(() => {
    popped = true
  })
  const stopAfter = router.afterEach((to, from, failure) => {
    const trigger: PageNavTrigger = popped ? 'pop' : pendingLink === to.fullPath ? 'link' : 'other'
    pendingLink = null
    popped = false
    if (failure) return
    const decision = decidePageTransition({
      from: from.name,
      to: to.name,
      trigger,
      modality: getInputModality(),
      reducedMotion: prefersReducedMotion(),
    })
    if (!decision.play) return
    pageSwap.dir = decision.dir
    pageSwap.key += 1
  })

  return () => {
    document.removeEventListener('click', onClick, true)
    stopPop()
    stopAfter()
  }
}
