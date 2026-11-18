import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterLinkStub, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GraphShortcutsHelp from './GraphShortcutsHelp.vue'

const observe = vi.fn()
const disconnect = vi.fn()

describe('GraphShortcutsHelp', () => {
  beforeEach(() => {
    observe.mockClear()
    disconnect.mockClear()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe
        disconnect = disconnect
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('它應該在 open 為 false 時不渲染面板', () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: false, isMac: false } })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('它應該在 open 為 true 時渲染非強制對話框並連結標題', () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: true, isMac: false } })
    const dialog = wrapper.get('[role="dialog"]')

    expect(dialog.attributes('aria-modal')).toBe('false')
    expect(dialog.attributes('aria-labelledby')).toBe('kg-help-title')
    expect(wrapper.get('#kg-help-title').text()).toBe('操作說明')
  })

  it('它應該顯示放大、縮小與全部置中的鍵盤快捷鍵', () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: true, isMac: false } })
    const rows = wrapper.findAll('dl dd').map((row) => row.text())

    expect(rows).toContain('放大')
    expect(rows).toContain('縮小')
    expect(rows).toContain('全部置中')
  })

  it('它應該在從關閉切到打開時把焦點移到關閉按鈕', async () => {
    const wrapper = mount(GraphShortcutsHelp, {
      attachTo: document.body,
      props: { open: false, isMac: false },
    })

    await wrapper.setProps({ open: true })
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('button[aria-label="關閉操作說明"]').element)
    wrapper.unmount()
  })

  it('它應該在點關閉按鈕時 emit close', async () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: true, isMac: false } })

    await wrapper.get('button[aria-label="關閉操作說明"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it.each([
    { isMac: true, modifier: '⌘' },
    { isMac: false, modifier: 'Ctrl' },
  ])('它應該在 isMac 為 $isMac 時顯示 $modifier 滑鼠快捷鍵', ({ isMac, modifier }) => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: true, isMac } })

    expect(wrapper.text()).toContain(`按住 ${modifier} 再滾動滾輪：縮放`)
  })

  it('它應該在面板打開過且元件卸載時中止尺寸觀察', async () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: false, isMac: false } })

    await wrapper.setProps({ open: true })
    await nextTick()
    expect(observe).toHaveBeenCalledOnce()

    wrapper.unmount()

    expect(disconnect).toHaveBeenCalledOnce()
  })
})

describe('GraphShortcutsHelp（首頁的閱讀方式）', () => {
  const mountReading = (layered: boolean) =>
    mount(GraphShortcutsHelp, {
      props: { open: true, isMac: false, reading: { layered } },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('它應該標題寫「閱讀方式」，先講節點大小，接著「操作」段，最後一條連去 /graph 的連結', () => {
    const wrapper = mountReading(true)
    const text = wrapper.text()

    expect(wrapper.find('#kg-help-title').text()).toBe('閱讀方式')
    expect(text).toContain('節點的大小反映關係的多寡。')
    expect(text).toContain('圓框：三大類各自的範圍，錯開疊放；落在重疊處不代表彼此有關。')
    expect(wrapper.findAll('h4').map((h) => h.text())).toContain('操作')
    const link = wrapper.findComponent(RouterLinkStub)
    expect(link.text()).toBe('查詢更多路線 →')
    expect(link.props('to')).toBe('/graph')
    expect(wrapper.find('button').attributes('aria-label')).toBe('關閉')
  })

  it('它應該在不是三層疊圖時拿掉圓框那一句', () => {
    expect(mountReading(false).text()).not.toContain('圓框')
  })

  it('它應該在沒給 reading（/graph）時維持原本的操作說明，沒有閱讀方式與連結', () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: true, isMac: false } })

    expect(wrapper.find('#kg-help-title').text()).toBe('操作說明')
    expect(wrapper.text()).not.toContain('節點的大小反映關係的多寡')
    expect(wrapper.text()).not.toContain('查詢更多路線')
  })

  it('它應該在打開時把焦點交給關閉鈕，但不讓頁面跟著捲動（畫布常有一部分在視窗外）', async () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    const wrapper = mount(GraphShortcutsHelp, {
      props: { open: false, isMac: false, reading: { layered: true } },
      global: { stubs: { RouterLink: RouterLinkStub } },
      attachTo: document.body,
    })
    await wrapper.setProps({ open: true })
    await nextTick()
    await nextTick()

    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    focus.mockRestore()
    wrapper.unmount()
  })

  it('它應該讓閱讀方式在窄畫布蓋住整個畫布（含縮放鈕）、操作說明維持坐在按鈕列上方', () => {
    const reading = mountReading(true).find('[role="dialog"]')
    const plain = mount(GraphShortcutsHelp, { props: { open: true, isMac: false } }).find('[role="dialog"]')

    expect(reading.classes()).toContain('bottom-3')
    expect(reading.classes()).not.toContain('bottom-[4.25rem]')
    expect(plain.classes()).toContain('bottom-[4.25rem]')
  })
})
