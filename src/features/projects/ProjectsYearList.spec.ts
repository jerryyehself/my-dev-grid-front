import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Project } from '@/api/projects'
import ProjectsYearList from './ProjectsYearList.vue'

const project = (id: string, title: string, statusType?: 'active' | 'archived'): Project => ({
  id,
  title,
  status: statusType === 'active' ? 'Active' : statusType === 'archived' ? 'Archived' : undefined,
  statusType,
  desc: '',
  tags: [],
  started: '2025.01',
  repo: title,
})

const groups = [
  { year: '2026', projects: [project('1', 'alpha', 'active')] },
  { year: '2025', projects: [project('2', 'beta', 'archived'), project('3', 'gamma')] },
  { year: '', projects: [project('4', 'delta', 'active')] },
]

const render = (selectedId = '1') => mount(ProjectsYearList, { props: { groups, selectedId } })

describe('ProjectsYearList', () => {
  it('它應該每組一個年份標頭，沒有日期的那組標「日期不詳」', () => {
    const headings = render().findAll('h3').map((h) => h.text())

    expect(headings).toEqual(['2026', '2025', '日期不詳'])
  })

  it('它應該每個專案一列按鈕，列上不出現 PROJ- 編號', () => {
    const wrapper = render()

    expect(wrapper.findAll('button')).toHaveLength(4)
    expect(wrapper.text()).not.toContain('PROJ-')
  })

  it('它應該只在選中的那一列標 aria-current', () => {
    const buttons = render('2').findAll('button')

    expect(buttons.map((b) => b.attributes('aria-current'))).toEqual([undefined, 'true', undefined, undefined])
  })

  it('它應該替有狀態的專案補螢幕報讀器用的狀態文字，沒有狀態的不補', () => {
    const buttons = render().findAll('button')

    expect(buttons[0]!.find('.sr-only').text()).toContain('Active')
    expect(buttons[1]!.find('.sr-only').text()).toContain('Archived')
    expect(buttons[2]!.find('.sr-only').exists()).toBe(false)
  })

  it('它應該把圓點對螢幕報讀器隱藏', () => {
    expect(render().find('button span').attributes('aria-hidden')).toBe('true')
  })

  it('它應該在點列時送出 select 並帶該專案的 id', async () => {
    const wrapper = render()

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['2']])
  })
})

describe('ProjectsYearList.revealSelected', () => {
  afterEach(() => {
    // @ts-expect-error 還原成 jsdom 原本沒有這個方法的狀態
    delete Element.prototype.scrollIntoView
  })

  it('它應該把選中的那一列捲進可見範圍', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const wrapper = render('3')

    wrapper.vm.revealSelected()

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toBe(wrapper.findAll('button')[2]!.element)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('它應該在沒有選中的列時什麼都不做', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    render('999').vm.revealSelected()

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})

describe('ProjectsYearList 卡住的年份標頭', () => {
  // jsdom 沒有版面：容器上緣 100、標頭高 28，每組的哨兵頂端與底端由測試指定
  const CONTAINER_TOP = 100
  const HEADER_HEIGHT = 28

  function measure(wrapper: ReturnType<typeof render>, rects: Record<string, { sentinelTop: number; bottom: number }>) {
    const root = wrapper.element as HTMLElement
    root.getBoundingClientRect = () => ({ top: CONTAINER_TOP }) as DOMRect
    for (const header of root.querySelectorAll<HTMLElement>('[data-year-header]')) {
      Object.defineProperty(header, 'offsetHeight', { value: HEADER_HEIGHT, configurable: true })
    }
    for (const section of root.querySelectorAll<HTMLElement>('[data-year-group]')) {
      const rect = rects[section.dataset.year!]!
      section.getBoundingClientRect = () => ({ bottom: rect.bottom }) as DOMRect
      section.querySelector<HTMLElement>('[data-sentinel]')!.getBoundingClientRect = () => ({ top: rect.sentinelTop }) as DOMRect
    }
  }
  const hairline = (wrapper: ReturnType<typeof render>) =>
    Object.fromEntries(wrapper.findAll('h3').map((h) => [h.text(), h.classes('border-(--border-shelf)')]))

  it('它應該在沒有捲動時每個標頭都不畫髮絲線', () => {
    expect(hairline(render())).toEqual({ '2026': false, '2025': false, 日期不詳: false })
  })

  it('它應該只替哨兵已捲出上緣、而且該組還沒捲完的標頭畫髮絲線', async () => {
    const wrapper = render()
    measure(wrapper, {
      '2026': { sentinelTop: 20, bottom: 400 }, // 哨兵出去了、底端還遠：卡住
      '2025': { sentinelTop: 450, bottom: 800 }, // 哨兵還在容器上緣下面：沒卡住
      '': { sentinelTop: 50, bottom: 120 }, // 底端 120 <= 上緣 100 ＋ 標頭 28：快被下一組頂掉，不畫
    })

    await wrapper.trigger('scroll')

    expect(hairline(wrapper)).toEqual({ '2026': true, '2025': false, 日期不詳: false })
  })

  it('它應該在捲回去之後把髮絲線收掉', async () => {
    const wrapper = render()
    measure(wrapper, {
      '2026': { sentinelTop: 20, bottom: 400 },
      '2025': { sentinelTop: 450, bottom: 800 },
      '': { sentinelTop: 900, bottom: 1000 },
    })
    await wrapper.trigger('scroll')
    expect(hairline(wrapper)['2026']).toBe(true)

    measure(wrapper, {
      '2026': { sentinelTop: 100, bottom: 500 },
      '2025': { sentinelTop: 550, bottom: 900 },
      '': { sentinelTop: 1000, bottom: 1100 },
    })
    await wrapper.trigger('scroll')

    expect(hairline(wrapper)).toEqual({ '2026': false, '2025': false, 日期不詳: false })
  })
})

describe('ProjectsYearList 篩選過場與底部淡出遮罩', () => {
  // jsdom 沒有版面：每個專案列 50px 高、依序往下排；容器可見高度 100；
  // scrollHeight＝內容（列數 × 50）與絕對定位的離開複本下緣兩者取大，跟瀏覽器把絕對定位子元素算進可捲範圍的行為一致
  const VIEWPORT = 100
  const many = [{ year: '2026', projects: ['1', '2', '3', '4', '5'].map((id) => project(id, `p${id}`)) }]
  const one = [{ year: '2026', projects: [project('1', 'p1')] }]
  let animate: typeof Element.prototype.animate | undefined

  beforeEach(() => {
    animate = Element.prototype.animate
    Element.prototype.animate = function () {
      return { cancel() {}, onfinish: null } as unknown as Animation
    }
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(VIEWPORT)
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      const rows = this.querySelectorAll('[data-flip-key]').length * 50
      const ghosts = [...this.querySelectorAll<HTMLElement>('[aria-hidden="true"][style*="absolute"]')].map(
        (g) => parseFloat(g.style.top) + parseFloat(g.style.height),
      )
      return Math.max(rows, ...ghosts)
    })
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const key = this.getAttribute('data-flip-key')
      const top = key ? [...document.querySelectorAll('[data-flip-key]')].indexOf(this) * 50 : 0
      return { left: 0, top, right: 100, bottom: top + 40, width: 100, height: 40, x: 0, y: top, toJSON() {} } as DOMRect
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (animate) Element.prototype.animate = animate
    else {
      // @ts-expect-error 還原成 jsdom 原本沒有這個方法的狀態
      delete Element.prototype.animate
    }
    document.body.innerHTML = ''
  })

  it('它應該在從很多筆篩成一筆之後，離開複本移除前後底部淡出遮罩都是「已經到底」', async () => {
    const wrapper = mount(ProjectsYearList, { props: { groups: many, selectedId: '1' }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.classes()).toContain('is-fade-bottom') // 5 列 250px 在 100px 的容器裡，下面還有

    await wrapper.setProps({ groups: one })
    await flushPromises()

    // 複本還在淡出時：畫面外的那幾列沒有複本，不會把捲動高度撐過容器
    expect(wrapper.classes()).not.toContain('is-fade-bottom')
    // 複本移除之後也維持正確（沒有任何事件會再重算，所以要在複本還在的時候就是對的）
    for (const g of wrapper.element.querySelectorAll('[aria-hidden="true"]')) g.remove()
    await flushPromises()
    expect(wrapper.classes()).not.toContain('is-fade-bottom')
  })
})
