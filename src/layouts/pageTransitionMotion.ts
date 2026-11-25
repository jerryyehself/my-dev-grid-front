// 換頁轉場的動畫本身（MainLayout 的 <Transition> 掛這幾個 hook）。要不要播、往哪邊由 pageTransition.ts 決定。
// 數值照 .claude/skills/visual-design-language 的 Motion tokens 表：新頁滑入淡入 page-enter 320ms、
// 舊頁滑出淡出 page-exit 200ms、位移 page-shift 30px、曲線 ease-control，新舊同時進行。
// 用 Web Animations 從「現在的樣子」出發，連點時不會跳回起點；只動 transform 與 opacity。
import { pageSwap } from './pageTransition'

/** 換頁時新頁裡還在讀的佔位框要掛這個屬性（BaseLoadingBlock 已掛）。新頁等它們都消失才淡入 */
export const LOADING_PLACEHOLDER_ATTR = 'data-loading-placeholder'

/**
 * 新頁的資料最多等多久。超過就不播進場，直接顯示（連同頁面自己的載入中佔位框）。
 * 400ms 是 Doherty threshold：回應在這之內，操作感覺沒有中斷；再久，空著的版面就該讓位給頁面自己的載入狀態。
 */
export const CONTENT_WAIT_CAP_MS = 400

const FALLBACK = { enter: 320, exit: 200, shift: 30, ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }

/**
 * 把 token 的值換成數字：時長換成 ms（建置後的 CSS 會被壓成 .32s 這種寫法，不能只取數字），位移取 px。
 * 單位不對、不是正數、讀不到時回傳 fallback。
 */
export function parseTokenValue(value: string, unit: 'ms' | 'px', fallback: number): number {
  const match = /^(\d*\.?\d+)(ms|s|px)$/.exec(value.trim())
  if (!match) return fallback
  const amount = Number(match[1])
  const scaled = unit === 'ms' && match[2] === 's' ? amount * 1000 : match[2] === unit ? amount : NaN
  return Number.isFinite(scaled) && scaled > 0 ? scaled : fallback
}

let cachedTokens: typeof FALLBACK | null = null

/**
 * 從 main.css 的 @theme 讀 token（:root 變數），讀不到時用上面的同一組值。
 * 只在第一次換頁時讀一次：這幾個值不隨主題變，每次都讀會在點擊當下多一次強制樣式計算（拖慢 INP）。
 */
function tokens(): typeof FALLBACK {
  if (cachedTokens) return cachedTokens
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, unit: 'ms' | 'px', fallback: number) =>
    parseTokenValue(style.getPropertyValue(name), unit, fallback)
  cachedTokens = {
    enter: read('--transition-duration-page-enter', 'ms', FALLBACK.enter),
    exit: read('--transition-duration-page-exit', 'ms', FALLBACK.exit),
    shift: read('--motion-page-shift', 'px', FALLBACK.shift),
    ease: style.getPropertyValue('--ease-control').trim() || FALLBACK.ease,
  }
  return cachedTokens
}

interface Visual {
  opacity: string
  transform: string
}

const AT_REST: Visual = { opacity: '1', transform: 'none' }

const running = new WeakMap<Element, Animation>()
/** 進場被打斷時（連點）當下的樣子，退場從這裡接著走 */
const interrupted = new WeakMap<Element, Visual>()
/** 每個還在等資料或在播的進場，各自的收尾函式 */
const enterCleanups = new WeakMap<Element, () => void>()
/** 還在退場的舊頁。新的換頁開始時直接收掉，畫面上最多同時兩頁 */
const leaving = new Set<() => void>()

/** 不支援 Web Animations 的環境（舊瀏覽器、jsdom）：不播，直接切 */
function canAnimate(el: Element): boolean {
  return typeof (el as HTMLElement).animate === 'function'
}

function visualOf(el: Element): Visual {
  const style = getComputedStyle(el)
  return { opacity: style.opacity, transform: style.transform }
}

function stop(el: Element) {
  running.get(el)?.cancel()
  running.delete(el)
}

function begin(el: Element) {
  el.parentElement?.classList.add('page-stack--swapping')
}

/** 外框裡已經沒有在進場或退場的頁面時，拿掉外框的轉場狀態（呼叫前先把自己的 class 拿掉） */
function end(stack: Element | null) {
  if (!stack?.querySelector(':scope > .page-layer--entering, :scope > .page-layer--leaving')) {
    stack?.classList.remove('page-stack--swapping')
  }
}

/** 新頁裡的佔位框都消失（或本來就沒有）時 resolve(true)，超過上限 resolve(false) */
export function waitForContent(el: Element, capMs: number): { promise: Promise<boolean>; cancel: () => void } {
  const selector = `[${LOADING_PLACEHOLDER_ATTR}]`
  if (!el.querySelector(selector)) return { promise: Promise.resolve(true), cancel: () => {} }
  let finish: (ready: boolean) => void = () => {}
  const promise = new Promise<boolean>((resolve) => {
    const observer = new MutationObserver(() => {
      if (!el.querySelector(selector)) finish(true)
    })
    const timer = window.setTimeout(() => finish(false), capMs)
    finish = (ready) => {
      observer.disconnect()
      window.clearTimeout(timer)
      resolve(ready)
    }
    observer.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: [LOADING_PLACEHOLDER_ATTR] })
  })
  return { promise, cancel: () => finish(false) }
}

export function onPageBeforeEnter(el: Element) {
  const node = el as HTMLElement
  const { shift } = tokens()
  begin(el)
  node.classList.add('page-layer--entering')
  node.style.opacity = '0'
  node.style.transform = `translateX(${pageSwap.dir * shift}px)`
}

export function onPageEnter(el: Element, done: () => void) {
  const node = el as HTMLElement
  const stack = el.parentElement
  const t = tokens()
  const from = `translateX(${pageSwap.dir * t.shift}px)`
  const wait = waitForContent(el, CONTENT_WAIT_CAP_MS)
  let finished = false

  const cleanup = () => {
    if (finished) return
    finished = true
    wait.cancel()
    stop(el)
    enterCleanups.delete(el)
    node.classList.remove('page-layer--entering')
    node.style.opacity = ''
    node.style.transform = ''
    end(stack)
  }
  enterCleanups.set(el, cleanup)

  wait.promise.then((ready) => {
    if (finished) return
    if (!ready || !canAnimate(el)) {
      // 等太久（或不支援動畫）：直接顯示，不播進場
      cleanup()
      done()
      return
    }
    const animation = node.animate(
      [
        { opacity: 0, transform: from },
        { opacity: 1, transform: 'none' },
      ],
      { duration: t.enter, easing: t.ease, fill: 'both' },
    )
    running.set(el, animation)
    node.style.opacity = ''
    node.style.transform = ''
    animation.finished.then(
      () => {
        if (finished) return
        cleanup()
        done()
      },
      () => {},
    )
  })
}

/** 進場還沒播完就要離開（連點）：記下當下的樣子給退場接著用 */
export function onPageEnterCancelled(el: Element) {
  interrupted.set(el, visualOf(el))
  enterCleanups.get(el)?.()
}

export function onPageLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  const stack = el.parentElement
  const t = tokens()
  // 上一次還沒退完的舊頁直接收掉，不讓三頁疊在一起（finishOld 會把自己從 Set 刪掉，邊走邊刪已走過的項目是安全的）
  for (const finishOld of leaving) finishOld()

  // 沒被打斷的舊頁一定是靜止的樣子，直接用，不在點擊當下多讀一次樣式
  const from = interrupted.get(el) ?? AT_REST
  interrupted.delete(el)
  stop(el)
  begin(el)
  node.classList.add('page-layer--leaving')
  node.inert = true

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    leaving.delete(finish)
    stop(el)
    node.classList.remove('page-layer--leaving')
    end(stack)
    done()
  }
  leaving.add(finish)
  if (!canAnimate(el)) {
    finish()
    return
  }

  const animation = node.animate(
    [
      { opacity: from.opacity, transform: from.transform },
      { opacity: 0, transform: `translateX(${-pageSwap.dir * t.shift}px)` },
    ],
    { duration: t.exit, easing: t.ease, fill: 'both' },
  )
  running.set(el, animation)
  animation.finished.then(finish, () => {})
}
