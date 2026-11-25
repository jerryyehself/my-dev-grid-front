import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { pageSwap } from './pageTransition'
import {
  CONTENT_WAIT_CAP_MS,
  LOADING_PLACEHOLDER_ATTR,
  onPageBeforeEnter,
  onPageEnter,
  onPageEnterCancelled,
  onPageLeave,
  parseTokenValue,
  waitForContent,
} from './pageTransitionMotion'

// 換頁轉場的動畫 hook。jsdom 沒有 Web Animations，所以「不支援時直接切」走的是真的路徑；
// 要看動畫參數的案例自己塞一個假的 animate。

interface FakeAnimation {
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
  cancel: ReturnType<typeof vi.fn>
  finish: () => void
  finished: Promise<void>
}

function fakeAnimate(el: HTMLElement): FakeAnimation[] {
  const calls: FakeAnimation[] = []
  ;(el as unknown as { animate: unknown }).animate = (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    let resolve!: () => void
    let reject!: (e: Error) => void
    const finished = new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    })
    const call: FakeAnimation = {
      keyframes,
      options,
      cancel: vi.fn(() => reject(new Error('cancelled'))),
      finish: () => resolve(),
      finished,
    }
    calls.push(call)
    return call
  }
  return calls
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('pageTransitionMotion', () => {
  let stack: HTMLDivElement

  beforeEach(() => {
    stack = document.createElement('div')
    document.body.appendChild(stack)
    pageSwap.dir = 1
  })

  afterEach(() => {
    stack.remove()
  })

  function layer(placeholder = false) {
    const el = document.createElement('div')
    if (placeholder) {
      const block = document.createElement('div')
      block.setAttribute(LOADING_PLACEHOLDER_ATTR, '')
      el.appendChild(block)
    }
    stack.appendChild(el)
    return el
  }

  describe('parseTokenValue', () => {
    it.each([
      ['320ms', 'ms', 320],
      ['.32s', 'ms', 320],
      ['0.2s', 'ms', 200],
      [' 200ms ', 'ms', 200],
      ['30px', 'px', 30],
    ] as const)('它應該把 %s 讀成 %s 的 %i（建置後的 CSS 會把 320ms 壓成 .32s）', (value, unit, expected) => {
      expect(parseTokenValue(value, unit, -1)).toBe(expected)
    })

    it.each([
      ['', 'ms'],
      ['320', 'ms'],
      ['abc', 'ms'],
      ['30px', 'ms'],
      ['320ms', 'px'],
      ['1.5em', 'px'],
      ['0ms', 'ms'],
      ['-30px', 'px'],
      ['var(--x)', 'ms'],
    ] as const)('它應該在 %s（要 %s）讀不懂時退回預設值', (value, unit) => {
      expect(parseTokenValue(value, unit, 42)).toBe(42)
    })
  })

  describe('waitForContent', () => {
    it('它應該在新頁沒有佔位框時馬上算好', async () => {
      await expect(waitForContent(layer(), 50).promise).resolves.toBe(true)
    })

    it('它應該在佔位框被換掉時算好', async () => {
      const el = layer(true)
      const wait = waitForContent(el, 1000)
      el.firstElementChild!.remove()
      await expect(wait.promise).resolves.toBe(true)
    })

    it('它應該在佔位框的屬性被拿掉時算好', async () => {
      const el = layer(true)
      const wait = waitForContent(el, 1000)
      el.firstElementChild!.removeAttribute(LOADING_PLACEHOLDER_ATTR)
      await expect(wait.promise).resolves.toBe(true)
    })

    it('它應該在別的節點變動、佔位框還在時繼續等，到上限回 false', async () => {
      const el = layer(true)
      const wait = waitForContent(el, 30)
      el.appendChild(document.createElement('p'))
      await expect(wait.promise).resolves.toBe(false)
    })

    it('它應該可以取消（取消算沒等到）', async () => {
      const wait = waitForContent(layer(true), 1000)
      wait.cancel()
      await expect(wait.promise).resolves.toBe(false)
    })

    it('它應該把上限訂在 400ms', () => {
      expect(CONTENT_WAIT_CAP_MS).toBe(400)
    })
  })

  describe('進場', () => {
    it('它應該先把新頁藏在右邊 30px，資料到了才滑入淡入 320ms、ease-control', async () => {
      const el = layer(true)
      const calls = fakeAnimate(el)
      const done = vi.fn()
      onPageBeforeEnter(el)
      expect(el.style.opacity).toBe('0')
      expect(el.style.transform).toBe('translateX(30px)')
      expect(stack.classList.contains('page-stack--swapping')).toBe(true)
      onPageEnter(el, done)
      await tick()
      expect(calls).toHaveLength(0)

      el.firstElementChild!.remove()
      await tick()
      expect(calls).toHaveLength(1)
      expect(calls[0]!.keyframes).toEqual([
        { opacity: 0, transform: 'translateX(30px)' },
        { opacity: 1, transform: 'none' },
      ])
      expect(calls[0]!.options).toMatchObject({ duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
      expect(done).not.toHaveBeenCalled()

      calls[0]!.finish()
      await tick()
      expect(done).toHaveBeenCalledOnce()
      expect(el.classList.contains('page-layer--entering')).toBe(false)
      expect(stack.classList.contains('page-stack--swapping')).toBe(false)
    })

    it('它應該在往左換頁時從左邊 30px 進來', async () => {
      pageSwap.dir = -1
      const el = layer()
      const calls = fakeAnimate(el)
      onPageBeforeEnter(el)
      expect(el.style.transform).toBe('translateX(-30px)')
      onPageEnter(el, vi.fn())
      await tick()
      expect(calls[0]!.keyframes[0]).toEqual({ opacity: 0, transform: 'translateX(-30px)' })
      calls[0]!.finish()
      await tick()
    })

    it('它應該在資料等太久時不播進場，直接顯示', async () => {
      vi.useFakeTimers()
      try {
        const el = layer(true)
        const calls = fakeAnimate(el)
        const done = vi.fn()
        onPageBeforeEnter(el)
        onPageEnter(el, done)
        await vi.advanceTimersByTimeAsync(CONTENT_WAIT_CAP_MS - 1)
        expect(done).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
        expect(done).toHaveBeenCalledOnce()
        expect(calls).toHaveLength(0)
        expect(el.style.opacity).toBe('')
        expect(el.style.transform).toBe('')
        expect(stack.classList.contains('page-stack--swapping')).toBe(false)
      } finally {
        vi.useRealTimers()
      }
    })

    it('它應該在不支援 Web Animations 時直接顯示', async () => {
      const el = layer()
      const done = vi.fn()
      onPageBeforeEnter(el)
      onPageEnter(el, done)
      await tick()
      expect(done).toHaveBeenCalledOnce()
      expect(el.style.opacity).toBe('')
      expect(el.style.transform).toBe('')
    })
  })

  describe('退場與連點', () => {
    it('它應該讓舊頁往左退、淡出 200ms，退場時不能點、不佔高度', async () => {
      const el = layer()
      const calls = fakeAnimate(el)
      const done = vi.fn()
      onPageLeave(el, done)
      expect(el.classList.contains('page-layer--leaving')).toBe(true)
      expect(el.inert).toBe(true)
      expect(calls[0]!.keyframes[1]).toEqual({ opacity: 0, transform: 'translateX(-30px)' })
      expect(calls[0]!.options).toMatchObject({ duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
      calls[0]!.finish()
      await tick()
      expect(done).toHaveBeenCalledOnce()
      expect(stack.classList.contains('page-stack--swapping')).toBe(false)
    })

    it('它應該在往左換頁時讓舊頁往右退', () => {
      pageSwap.dir = -1
      const el = layer()
      const calls = fakeAnimate(el)
      onPageLeave(el, vi.fn())
      expect(calls[0]!.keyframes[1]).toEqual({ opacity: 0, transform: 'translateX(30px)' })
    })

    it('它應該在連點時把上一個還沒退完的舊頁直接收掉，畫面上最多兩頁', () => {
      const a = layer()
      const b = layer()
      const callsA = fakeAnimate(a)
      fakeAnimate(b)
      const doneA = vi.fn()
      const doneB = vi.fn()
      onPageLeave(a, doneA)
      expect(doneA).not.toHaveBeenCalled()
      onPageLeave(b, doneB)
      expect(doneA).toHaveBeenCalledOnce()
      expect(callsA[0]!.cancel).toHaveBeenCalled()
      expect(doneB).not.toHaveBeenCalled()
    })

    it('它應該讓播到一半被打斷的新頁從當下的樣子接著退，不跳回起點', async () => {
      const el = layer()
      const calls = fakeAnimate(el)
      onPageBeforeEnter(el)
      onPageEnter(el, vi.fn())
      await tick()
      // 播到一半：jsdom 不會真的算動畫，這裡用 inline style 代表當下的樣子
      el.style.opacity = '0.5'
      el.style.transform = 'translateX(12px)'
      onPageEnterCancelled(el)
      expect(calls[0]!.cancel).toHaveBeenCalled()
      onPageLeave(el, vi.fn())
      expect(calls[1]!.keyframes[0]).toEqual({ opacity: '0.5', transform: 'translateX(12px)' })
    })

    it('它應該在不支援 Web Animations 時直接拿掉舊頁', () => {
      const el = layer()
      const done = vi.fn()
      onPageLeave(el, done)
      expect(done).toHaveBeenCalledOnce()
      expect(stack.classList.contains('page-stack--swapping')).toBe(false)
    })
  })
})
