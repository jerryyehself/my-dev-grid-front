import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useScrollFade } from './useScrollFade'

// jsdom 沒有版面：容器的尺寸跟捲動位置由測試指定
function setMetrics(el: HTMLElement, m: { scrollTop?: number; clientHeight?: number; scrollHeight?: number }) {
  for (const [key, value] of Object.entries(m)) Object.defineProperty(el, key, { value, configurable: true })
}

let resizeCallback: (() => void) | undefined
const observe = vi.fn<(el: Element) => void>()
const disconnect = vi.fn()

beforeEach(() => {
  resizeCallback = undefined
  observe.mockReset()
  disconnect.mockReset()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: () => void) {
        resizeCallback = cb
      }
      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
    },
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const Host = defineComponent({
  props: { dep: { type: Number, default: 0 } },
  setup(props, { expose }) {
    const el = ref<HTMLElement>()
    const fade = useScrollFade(el, [() => props.dep])
    expose(fade)
    return () => h('div', { ref: el }, [h('p', 'a'), h('p', 'b')])
  },
})

function mountHost() {
  const wrapper = mount(Host)
  return { wrapper, el: wrapper.element as HTMLElement, fade: wrapper.vm as unknown as { atTop: boolean; atBottom: boolean } }
}

describe('useScrollFade', () => {
  it('它應該在掛載時就量一次：內容比容器高、捲動位置在頂端時，只有下緣要淡出', () => {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(500)
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(200)

    const { fade } = mountHost()

    expect(fade.atTop).toBe(true)
    expect(fade.atBottom).toBe(false)
  })

  it('它應該在沒有可捲動內容時兩邊都不淡出', () => {
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(200)
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(200)

    const { fade } = mountHost()

    expect(fade.atTop).toBe(true)
    expect(fade.atBottom).toBe(true)
  })

  it('它應該在捲到中間時兩邊都淡出，捲到底時只剩上緣淡出', () => {
    const { el, fade } = mountHost()
    setMetrics(el, { clientHeight: 200, scrollHeight: 500, scrollTop: 100 })

    el.dispatchEvent(new Event('scroll'))
    expect([fade.atTop, fade.atBottom]).toEqual([false, false])

    setMetrics(el, { scrollTop: 300 })
    el.dispatchEvent(new Event('scroll'))
    expect([fade.atTop, fade.atBottom]).toEqual([false, true])
  })

  it.each([
    [298, false],
    [299, true],
    [300, true],
  ])('它應該把距離底部 1px 內視為已到底（scrollTop %i → atBottom %s）', (scrollTop, atBottom) => {
    const { el, fade } = mountHost()
    setMetrics(el, { clientHeight: 200, scrollHeight: 500, scrollTop })

    el.dispatchEvent(new Event('scroll'))

    expect(fade.atBottom).toBe(atBottom)
  })

  it('它應該觀察容器本身跟每個直接子元素，大小變了就重新量', () => {
    const { el, fade } = mountHost()

    expect(observe).toHaveBeenCalledTimes(1 + el.children.length)
    expect(observe).toHaveBeenCalledWith(el)
    for (const child of el.children) expect(observe).toHaveBeenCalledWith(child)

    setMetrics(el, { clientHeight: 200, scrollHeight: 500, scrollTop: 0 })
    resizeCallback!()

    expect(fade.atBottom).toBe(false)
  })

  it('它應該在 deps 指定的資料變了之後重新量', async () => {
    const { wrapper, el, fade } = mountHost()
    setMetrics(el, { clientHeight: 200, scrollHeight: 500, scrollTop: 0 })
    expect(fade.atBottom).toBe(true) // 還沒重新量

    await wrapper.setProps({ dep: 1 })
    await nextTick()

    expect(fade.atBottom).toBe(false)
  })

  it('它應該在元件卸載時中斷觀察、移除捲動監聽', () => {
    const { wrapper, el, fade } = mountHost()
    const removeSpy = vi.spyOn(el, 'removeEventListener')

    wrapper.unmount()

    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    // 卸載後再捲動不會改狀態
    setMetrics(el, { clientHeight: 200, scrollHeight: 500, scrollTop: 100 })
    el.dispatchEvent(new Event('scroll'))
    expect(fade.atTop).toBe(true)
  })

  it('它應該在沒有 ResizeObserver 的環境照常運作（只靠捲動事件）', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const { el, fade } = mountHost()
    setMetrics(el, { clientHeight: 200, scrollHeight: 500, scrollTop: 100 })

    el.dispatchEvent(new Event('scroll'))

    expect(fade.atTop).toBe(false)
  })
})
