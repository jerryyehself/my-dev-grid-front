// 清單重排時的過場（專案篩選用）：留下的項目從舊位置滑到新位置、離開的淡出、新出現的淡入。
// 做法是 FLIP：Vue 更新 DOM 之前量每個項目的位置，更新之後再量一次，留下的項目用 transform
// 從舊位置播到新位置；離開的項目已經被 Vue 拿掉了，所以用舊元素的複本釘在原位淡出。
//
// 時長與曲線讀 main.css 的動態 token：移位與淡入 panel-open、淡出 panel-close、曲線 ease-control。
// 鍵盤觸發時 main.css 把 panel-* 歸零（見 useInputModality），讀到 0 就直接切；
// prefers-reduced-motion 是 CSS 動畫的全域覆蓋管不到的（這裡用 Web Animations），所以另外判斷。
// 只動 transform 與 opacity。DOM 一律先是終態，動畫只是畫面上的過渡，取消後就是正確的樣子。
import { nextTick, onBeforeUnmount, watch, type Ref, type WatchSource } from 'vue'
import { getInputModality } from './useInputModality'

/** 清單項目要帶的屬性，值是穩定的 id；沒有這個屬性的元素不參與 */
export const FLIP_KEY_ATTR = 'data-flip-key'

const FALLBACK_OPEN_MS = 200
const FALLBACK_CLOSE_MS = 120
const FALLBACK_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
/** 位移小於這個值（px）就不播，避免子像素的差異也跑一次動畫 */
const MIN_MOVE_PX = 0.5

function rootVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function rootMs(name: string, fallback: number): number {
  const raw = rootVar(name)
  if (!raw) return fallback
  const n = parseFloat(raw)
  if (Number.isNaN(n)) return fallback
  return raw.endsWith('ms') ? n : raw.endsWith('s') ? n * 1000 : fallback
}

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** 相對於容器可見左上角的位置（不含捲動量），所以容器自己被推動、或捲動位置被夾住時不會誤算成位移 */
interface Spot {
  left: number
  top: number
  width: number
  height: number
  el: HTMLElement
}

function measure(root: HTMLElement): Map<string, Spot> {
  const base = root.getBoundingClientRect()
  const spots = new Map<string, Spot>()
  for (const el of root.querySelectorAll<HTMLElement>(`[${FLIP_KEY_ATTR}]`)) {
    const key = el.getAttribute(FLIP_KEY_ATTR)
    if (!key) continue
    const r = el.getBoundingClientRect()
    spots.set(key, { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height, el })
  }
  return spots
}

/**
 * @param container 捲動容器（要是定位元素，離開的複本以它為座標原點）
 * @param source 清單資料；它一變就量舊位置、更新後播動畫
 */
export function useListReflow(container: Ref<HTMLElement | undefined>, source: WatchSource) {
  let running: Animation[] = []
  let ghosts: HTMLElement[] = []
  let round = 0

  // 收掉上一段：取消動畫、拿掉複本，回到真正的版面，才量得到「現在」的位置
  function settle() {
    round++
    for (const a of running) a.cancel()
    running = []
    for (const g of ghosts) g.remove()
    ghosts = []
  }

  function play(root: HTMLElement, before: Map<string, Spot>, mine: number) {
    if (mine !== round || !root.isConnected || typeof Element.prototype.animate !== 'function') return
    const openMs = rootMs('--transition-duration-panel-open', FALLBACK_OPEN_MS)
    const closeMs = rootMs('--transition-duration-panel-close', FALLBACK_CLOSE_MS)
    if (openMs <= 0 && closeMs <= 0) return
    const easing = rootVar('--ease-control') || FALLBACK_EASE
    const after = measure(root)

    for (const [key, now] of after) {
      const old = before.get(key)
      if (!old) {
        // 新出現的：淡入
        if (openMs > 0) running.push(now.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: openMs, easing }))
        continue
      }
      const dx = old.left - now.left
      const dy = old.top - now.top
      if (openMs > 0 && (Math.abs(dx) > MIN_MOVE_PX || Math.abs(dy) > MIN_MOVE_PX)) {
        running.push(
          now.el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
            duration: openMs,
            easing,
          }),
        )
      }
    }

    if (closeMs <= 0) return
    for (const [key, old] of before) {
      if (after.has(key)) continue
      // 離開的：用舊元素的複本釘在原本看到的位置淡出，不佔位
      const ghost = old.el.cloneNode(true) as HTMLElement
      ghost.removeAttribute(FLIP_KEY_ATTR)
      ghost.setAttribute('aria-hidden', 'true')
      ghost.setAttribute('inert', '')
      ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
      Object.assign(ghost.style, {
        position: 'absolute',
        left: `${old.left + root.scrollLeft - root.clientLeft}px`,
        top: `${old.top + root.scrollTop - root.clientTop}px`,
        width: `${old.width}px`,
        height: `${old.height}px`,
        margin: '0',
        pointerEvents: 'none',
        listStyle: 'none',
      })
      root.appendChild(ghost)
      ghosts.push(ghost)
      const anim = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: closeMs, easing, fill: 'forwards' })
      anim.onfinish = () => {
        ghost.remove()
        ghosts = ghosts.filter((g) => g !== ghost)
      }
      running.push(anim)
    }
  }

  // flush: 'pre'：在這個元件重畫之前跑，此時 DOM 還是舊的
  watch(
    source,
    () => {
      settle()
      const root = container.value
      if (!root || getInputModality() === 'keyboard' || reducedMotion()) return
      const before = measure(root)
      if (before.size === 0) return
      const mine = round
      void nextTick(() => play(root, before, mine))
    },
    { flush: 'pre' },
  )

  onBeforeUnmount(settle)
}
