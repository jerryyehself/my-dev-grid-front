import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/**
 * 關於頁線稿的描線動畫。
 *
 * - 頁面根元素上的每個 `.draw` 區塊：進入畫面後加上 `.on`，線稿才一筆一筆畫出來（樣式在 aboutSketch.css）。
 * - 根元素加 `.motion` 才會先把線藏起來；沒有要求減少動態、而且瀏覽器有 IntersectionObserver 時才加。
 *   否則（`prefers-reduced-motion: reduce`、沒有 IntersectionObserver、JS 還沒跑）草圖本來就是畫好的，
 *   不會有一張空白的草圖。
 * - 系統的「減少動態」設定在頁面開著時改變，會跟著切換。
 */
export function useDrawOnScroll(root: Ref<HTMLElement | null>) {
  let observer: IntersectionObserver | null = null
  let mql: MediaQueryList | null = null

  function draws(): HTMLElement[] {
    return Array.from(root.value?.querySelectorAll<HTMLElement>('.draw') ?? [])
  }

  function stop() {
    observer?.disconnect()
    observer = null
  }

  function showAll() {
    stop()
    root.value?.classList.remove('motion')
    draws().forEach((el) => el.classList.add('on'))
  }

  function startMotion() {
    const el = root.value
    if (!el) return
    stop()
    draws().forEach((d) => d.classList.remove('on'))
    el.classList.add('motion')
    // 先讓瀏覽器算出「線已藏起來」的樣式，之後加 .on 才會有過渡
    void el.offsetHeight
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('on')
          observer?.unobserve(entry.target)
        }
      },
      { threshold: 0.35 },
    )
    draws().forEach((d) => observer?.observe(d))
  }

  function apply() {
    const reduced = !mql || mql.matches || typeof IntersectionObserver === 'undefined'
    if (reduced) showAll()
    else startMotion()
  }

  onMounted(() => {
    mql =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    mql?.addEventListener?.('change', apply)
    apply()
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener?.('change', apply)
    stop()
  })
}
