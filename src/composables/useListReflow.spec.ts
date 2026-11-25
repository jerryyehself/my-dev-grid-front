import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useListReflow } from './useListReflow'
import { initInputModality } from './useInputModality'

// jsdom 沒有版面也沒有 Element.animate：位置用「在清單裡的第幾個 × 50px」代替，animate 換成記錄用的替身，
// 這樣量得到「誰被移位、誰淡入、誰淡出、時長與曲線」。

interface Call {
  el: Element
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
  cancel: ReturnType<typeof vi.fn>
  anim: { onfinish: (() => void) | null; cancel: () => void }
}
let calls: Call[] = []

const List = defineComponent({
  props: { keys: { type: Array as () => string[], required: true } },
  setup(props) {
    const root = ref<HTMLElement>()
    useListReflow(root, () => props.keys)
    // 清空時整個容器跟著被拿掉（跟專案頁沒有符合的專案時一樣），要不丟錯
    return () =>
      props.keys.length
        ? h(
            'div',
            { ref: root, class: 'scroller' },
            props.keys.map((k) => h('div', { key: k, 'data-flip-key': k, class: 'row' }, k)),
          )
        : h('p', '沒有符合的專案')
  },
})

const mountList = (keys: string[]) => mount(List, { props: { keys }, attachTo: document.body })
const flush = async () => {
  await nextTick()
  await nextTick()
}
const rootStyle = (name: string, value: string) => document.documentElement.style.setProperty(name, value)

// jsdom 的 clientHeight 一律是 0：換成可調的容器可見高度，離開項目要在可見範圍內才做複本
let viewportHeight = 200
beforeEach(() => {
  calls = []
  viewportHeight = 200
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => viewportHeight)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const key = this.getAttribute('data-flip-key')
    const parent = this.parentElement
    const index = key && parent ? [...parent.querySelectorAll('[data-flip-key]')].indexOf(this) : 0
    const top = key ? index * 50 : 0
    return { left: 0, top, right: 100, bottom: top + 40, width: 100, height: 40, x: 0, y: top, toJSON() {} }
  })
  Element.prototype.animate = function (this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    const cancel = vi.fn()
    const anim = { onfinish: null as (() => void) | null, cancel }
    calls.push({ el: this, keyframes, options, cancel, anim })
    return anim as unknown as Animation
  } as unknown as typeof Element.prototype.animate
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  // @ts-expect-error 還原 jsdom 本來沒有的方法
  delete Element.prototype.animate
  document.documentElement.removeAttribute('style')
  document.body.innerHTML = ''
})

const keyOf = (c: Call) => c.el.getAttribute('data-flip-key') ?? '(ghost)'

describe('useListReflow', () => {
  it('它應該在第一次畫出清單時不播任何動畫', async () => {
    mountList(['a', 'b', 'c'])
    await flush()
    expect(calls).toEqual([])
  })

  it('它應該讓留下的項目從舊位置滑到新位置：panel-open 200ms、ease-control，只動 transform', async () => {
    const wrapper = mountList(['a', 'b', 'c'])
    await wrapper.setProps({ keys: ['b', 'c'] })
    await flush()

    const moves = calls.filter((c) => c.keyframes.some((k) => 'transform' in k))
    expect(moves.map(keyOf)).toEqual(['b', 'c'])
    expect(moves[0]!.keyframes).toEqual([{ transform: 'translate(0px, 50px)' }, { transform: 'none' }])
    expect(moves[0]!.options).toMatchObject({ duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
  })

  it('它應該讓離開的項目用複本釘在原位淡出：panel-close 120ms，淡完就移除，不佔位也點不到', async () => {
    const wrapper = mountList(['a', 'b', 'c'])
    await wrapper.setProps({ keys: ['a', 'c'] })
    await flush()

    const ghostCall = calls.find((c) => c.keyframes.some((k) => 'opacity' in k && k.opacity === 1))!
    expect(ghostCall.options).toMatchObject({ duration: 120, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' })
    expect(ghostCall.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }])
    const ghost = ghostCall.el as HTMLElement
    expect(ghost.textContent).toBe('b')
    expect(ghost.getAttribute('aria-hidden')).toBe('true')
    expect(ghost.hasAttribute('inert')).toBe(true)
    expect(ghost.hasAttribute('data-flip-key')).toBe(false)
    expect(ghost.style.position).toBe('absolute')
    expect(ghost.style.top).toBe('50px')
    expect(ghost.style.pointerEvents).toBe('none')
    // 真正的清單只剩留下的兩筆
    expect(wrapper.findAll('[data-flip-key]').map((e) => e.text())).toEqual(['a', 'c'])

    ghostCall.anim.onfinish?.()
    expect(wrapper.element.contains(ghost)).toBe(false)
  })

  it('它應該讓新出現的項目淡入：panel-open 200ms', async () => {
    const wrapper = mountList(['a'])
    await wrapper.setProps({ keys: ['a', 'b'] })
    await flush()

    const fades = calls.filter((c) => c.keyframes.some((k) => k.opacity === 0) && keyOf(c) === 'b')
    expect(fades).toHaveLength(1)
    expect(fades[0]!.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }])
    expect(fades[0]!.options).toMatchObject({ duration: 200 })
  })

  it('它應該在連續變動時先收掉上一段（取消動畫、拿掉複本），終態只剩真正的清單', async () => {
    const wrapper = mountList(['a', 'b', 'c'])
    await wrapper.setProps({ keys: ['a', 'c'] })
    await flush()
    const first = [...calls]
    expect(wrapper.element.children).toHaveLength(3) // a、c 加上離開的複本

    await wrapper.setProps({ keys: ['a', 'b', 'c'] })
    await flush()

    for (const c of first) expect(c.cancel).toHaveBeenCalled()
    expect(wrapper.element.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-flip-key]').map((e) => e.text())).toEqual(['a', 'b', 'c'])
  })

  it('它應該在鍵盤觸發時直接切，不播動畫', async () => {
    const stop = initInputModality()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    const wrapper = mountList(['a', 'b'])
    await wrapper.setProps({ keys: ['b'] })
    await flush()
    stop()

    expect(calls).toEqual([])
    expect(wrapper.findAll('[data-flip-key]').map((e) => e.text())).toEqual(['b'])
  })

  it('它應該在滑鼠觸發（鍵盤之後又點了滑鼠）時照常播', async () => {
    const stop = initInputModality()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    window.dispatchEvent(new Event('pointerdown'))
    const wrapper = mountList(['a', 'b'])
    await wrapper.setProps({ keys: ['b'] })
    await flush()
    stop()

    expect(calls.length).toBeGreaterThan(0)
  })

  it('它應該在 panel-open／panel-close 被歸零（鍵盤模式的 CSS 變數）時不播', async () => {
    rootStyle('--transition-duration-panel-open', '0ms')
    rootStyle('--transition-duration-panel-close', '0ms')
    const wrapper = mountList(['a', 'b'])
    await wrapper.setProps({ keys: ['b'] })
    await flush()

    expect(calls).toEqual([])
  })

  it('它應該在減少動態時直接切，終態照樣正確', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('prefers-reduced-motion') }))
    const wrapper = mountList(['a', 'b', 'c'])
    await wrapper.setProps({ keys: ['c'] })
    await flush()

    expect(calls).toEqual([])
    expect(wrapper.findAll('[data-flip-key]').map((e) => e.text())).toEqual(['c'])
  })

  it('它應該在瀏覽器沒有 Element.animate 時直接切，不丟錯', async () => {
    // @ts-expect-error 模擬舊瀏覽器
    delete Element.prototype.animate
    const wrapper = mountList(['a', 'b'])
    await wrapper.setProps({ keys: ['b'] })
    await flush()

    expect(wrapper.findAll('[data-flip-key]').map((e) => e.text())).toEqual(['b'])
  })

  it('它應該在清單清空（容器跟著被拿掉）時不丟錯', async () => {
    const wrapper = mountList(['a'])
    await wrapper.setProps({ keys: [] })
    await flush()

    expect(wrapper.text()).toBe('沒有符合的專案')
    expect(calls).toEqual([])
  })

  it('它應該在位置沒變的項目上不播移位（只有淡入淡出）', async () => {
    const wrapper = mountList(['a', 'b'])
    await wrapper.setProps({ keys: ['a', 'b', 'c'] })
    await flush()

    expect(calls.filter((c) => c.keyframes.some((k) => 'transform' in k))).toEqual([])
  })
  it('它應該只替原本在容器可見範圍內的離開項目做複本，畫面外的直接消失（不撐高捲動高度、不白跑動畫）', async () => {
    viewportHeight = 100 // 可見範圍 0–100：a（0–40）、b（50–90）看得到，c 從 100 開始已經在外面
    const wrapper = mountList(['a', 'b', 'c', 'd', 'e'])
    await wrapper.setProps({ keys: ['a'] })
    await flush()

    const ghosts = calls.filter((c) => c.el.getAttribute('aria-hidden') === 'true')
    expect(ghosts.map((c) => c.el.textContent)).toEqual(['b'])
    expect(wrapper.element.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
  })

  it('它應該替只露出一部分（跨過可見範圍下緣）的離開項目做複本', async () => {
    viewportHeight = 70 // b 在 50–90，下半截被切掉但看得到上半截
    const wrapper = mountList(['a', 'b', 'c'])
    await wrapper.setProps({ keys: ['a'] })
    await flush()

    expect(calls.filter((c) => c.el.getAttribute('aria-hidden') === 'true').map((c) => c.el.textContent)).toEqual(['b'])
  })

  it('它應該在動畫進行中元件被卸載時把複本清掉、動畫取消', async () => {
    const wrapper = mountList(['a', 'b', 'c'])
    await wrapper.setProps({ keys: ['a'] })
    await flush()
    const ghosts = calls.filter((c) => c.el.getAttribute('aria-hidden') === 'true').map((c) => c.el as HTMLElement)
    expect(ghosts.length).toBeGreaterThan(0)
    const container = wrapper.element
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(ghosts.length)

    wrapper.unmount()

    for (const g of ghosts) {
      expect(g.isConnected).toBe(false)
      expect(container.contains(g)).toBe(false)
    }
    for (const c of calls) expect(c.cancel).toHaveBeenCalled()
  })
})
