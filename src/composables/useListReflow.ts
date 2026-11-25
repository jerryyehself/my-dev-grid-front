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
 * @param options.onFinish 這一輪的動畫全部結束（或被取消）之後呼叫。動畫進行中留下的項目還帶著 transform，
 *   transform 也會算進捲動容器的可捲範圍，呼叫端若在這段時間量過 scrollHeight（例如底部淡出遮罩），
 *   結束後沒有任何事件會再讓它重算，所以結束時給它一次重算的機會。被下一輪取代時不呼叫（下一輪結束時才會）。
 */
export function useListReflow(
  container: Ref<HTMLElement | undefined>,
  source: WatchSource,
  options: { onFinish?: () => void } = {},
) {
  let running: Animation[] = []
  let ghosts: HTMLElement[] = []
  // 所有離開複本都放進這一層覆蓋層，不直接掛在捲動容器上（見 play）
  let overlay: HTMLElement | undefined
  let round = 0

  // 收掉上一段：取消動畫、拿掉複本，回到真正的版面，才量得到「現在」的位置
  function settle() {
    round++
    for (const a of running) a.cancel()
    running = []
    for (const g of ghosts) g.remove()
    ghosts = []
    overlay?.remove()
    overlay = undefined
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
      // 原本就在容器可見範圍外的（要捲才看得到）直接消失，看不到的不用白跑動畫
      if (old.top + old.height <= 0 || old.top >= root.clientHeight) continue
      // 離開的：用舊元素的複本釘在原本看到的位置淡出，不佔位
      // 複本放進覆蓋層：覆蓋層是蓋在容器目前可見範圍上的一塊（大小＝clientWidth × clientHeight、overflow:hidden），
      // 它自己的下緣最多到 scrollTop + clientHeight，不會超過可捲範圍，裡面的複本再怎麼擺（包括跨過可見範圍下緣的那一列）
      // 都不會改變 scrollHeight。複本直接掛在容器上的話，絕對定位的複本會被算進可捲範圍，
      // 呼叫端依 scrollHeight 算的狀態（例如底部淡出遮罩）在複本移除後就會停在錯的值
      if (!overlay) {
        overlay = document.createElement('div')
        overlay.setAttribute('data-flip-overlay', '')
        Object.assign(overlay.style, {
          position: 'absolute',
          left: `${root.scrollLeft}px`,
          top: `${root.scrollTop}px`,
          width: `${root.clientWidth}px`,
          height: `${root.clientHeight}px`,
          overflow: 'hidden',
          pointerEvents: 'none',
        })
        root.appendChild(overlay)
      }
      const ghost = old.el.cloneNode(true) as HTMLElement
      ghost.removeAttribute(FLIP_KEY_ATTR)
      ghost.setAttribute('aria-hidden', 'true')
      ghost.setAttribute('inert', '')
      ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
      Object.assign(ghost.style, {
        position: 'absolute',
        // old 是相對容器邊框外緣的可見位置，覆蓋層的原點在容器的內緣（邊框內側），扣掉邊框
        left: `${old.left - root.clientLeft}px`,
        top: `${old.top - root.clientTop}px`,
        width: `${old.width}px`,
        height: `${old.height}px`,
        margin: '0',
        pointerEvents: 'none',
        listStyle: 'none',
      })
      overlay.appendChild(ghost)
      ghosts.push(ghost)
      const anim = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: closeMs, easing, fill: 'forwards' })
      anim.onfinish = () => {
        ghost.remove()
        ghosts = ghosts.filter((g) => g !== ghost)
        if (ghosts.length === 0) {
          overlay?.remove()
          overlay = undefined
        }
      }
      running.push(anim)
    }
  }

  // 這一輪的動畫都結束之後通知呼叫端；cancel 會讓 finished 被拒絕，allSettled 照樣往下走
  function notifyWhenDone(mine: number) {
    if (!options.onFinish || running.length === 0) return
    void Promise.allSettled(running.map((a) => a.finished)).then(() => {
      if (mine === round) options.onFinish?.()
    })
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
      void nextTick(() => {
        play(root, before, mine)
        notifyWhenDone(mine)
      })
    },
    { flush: 'pre' },
  )

  onBeforeUnmount(settle)
}
