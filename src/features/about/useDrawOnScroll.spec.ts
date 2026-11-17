import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { useDrawOnScroll } from './useDrawOnScroll'

const Page = defineComponent({
  setup() {
    const root = ref<HTMLElement | null>(null)
    useDrawOnScroll(root)
    return { root }
  },
  template: '<div ref="root"><div class="draw" id="a" /><div class="draw" id="b" /></div>',
})

type Observed = { callback: IntersectionObserverCallback; targets: Element[] }
const observers: Observed[] = []

class FakeObserver {
  entry: Observed
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, targets: [] }
    observers.push(this.entry)
  }
  observe(el: Element) {
    this.entry.targets.push(el)
  }
  unobserve(el: Element) {
    this.entry.targets = this.entry.targets.filter((t) => t !== el)
  }
  disconnect() {
    this.entry.targets = []
  }
}

function stubMedia(reduced: boolean) {
  const listeners: Array<() => void> = []
  const mql = {
    matches: reduced,
    addEventListener: (...args: [string, () => void]) => listeners.push(args[1]),
    removeEventListener: (...args: [string, () => void]) =>
      listeners.splice(listeners.indexOf(args[1]), 1),
  }
  vi.stubGlobal('matchMedia', () => mql)
  return {
    set(next: boolean) {
      mql.matches = next
      ;[...listeners].forEach((fn) => fn())
    },
    listeners,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  observers.length = 0
})

describe('useDrawOnScroll', () => {
  it('它應該在要求減少動態時不加 motion，草圖直接是畫好的（on）', () => {
    stubMedia(true)
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const wrapper = mount(Page)

    expect(wrapper.classes()).not.toContain('motion')
    expect(wrapper.findAll('.draw').every((el) => el.classes().includes('on'))).toBe(true)
    expect(observers).toHaveLength(0)
    wrapper.unmount()
  })

  it('它應該在瀏覽器沒有 IntersectionObserver 時不加 motion，草圖不會一直空白', () => {
    stubMedia(false)
    vi.stubGlobal('IntersectionObserver', undefined)
    const wrapper = mount(Page)

    expect(wrapper.classes()).not.toContain('motion')
    expect(wrapper.findAll('.draw').every((el) => el.classes().includes('on'))).toBe(true)
    wrapper.unmount()
  })

  it('它應該在沒有 matchMedia 時也不加 motion', () => {
    vi.stubGlobal('matchMedia', undefined)
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const wrapper = mount(Page)

    expect(wrapper.classes()).not.toContain('motion')
    wrapper.unmount()
  })

  it('它應該在可以有動態時加 motion，草圖進入畫面才一個一個加 on', () => {
    stubMedia(false)
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const wrapper = mount(Page)

    expect(wrapper.classes()).toContain('motion')
    expect(wrapper.findAll('.draw').some((el) => el.classes().includes('on'))).toBe(false)

    const observer = observers[0]!
    expect(observer.targets).toHaveLength(2)
    observer.callback(
      [{ isIntersecting: true, target: wrapper.get('#a').element } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    expect(wrapper.get('#a').classes()).toContain('on')
    expect(wrapper.get('#b').classes()).not.toContain('on')

    observer.callback(
      [{ isIntersecting: false, target: wrapper.get('#b').element } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    expect(wrapper.get('#b').classes()).not.toContain('on')
    wrapper.unmount()
  })

  it('它應該在頁面開著時改成「減少動態」就把草圖全部畫好、拿掉 motion，改回來再恢復', () => {
    const media = stubMedia(false)
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const wrapper = mount(Page)
    expect(wrapper.classes()).toContain('motion')

    media.set(true)
    expect(wrapper.classes()).not.toContain('motion')
    expect(wrapper.findAll('.draw').every((el) => el.classes().includes('on'))).toBe(true)

    media.set(false)
    expect(wrapper.classes()).toContain('motion')
    expect(wrapper.findAll('.draw').some((el) => el.classes().includes('on'))).toBe(false)
    wrapper.unmount()
  })

  it('它應該在元件卸載時移除媒體查詢的監聽', () => {
    const media = stubMedia(false)
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    const wrapper = mount(Page)
    expect(media.listeners).toHaveLength(1)

    wrapper.unmount()
    expect(media.listeners).toHaveLength(0)
  })
})
