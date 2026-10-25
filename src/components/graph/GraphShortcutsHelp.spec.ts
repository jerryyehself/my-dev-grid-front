import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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

  it('open 為 false 時應該不渲染面板', () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: false, isMac: false } })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('open 為 true 時應該渲染非強制對話框並連結標題', () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: true, isMac: false } })
    const dialog = wrapper.get('[role="dialog"]')

    expect(dialog.attributes('aria-modal')).toBe('false')
    expect(dialog.attributes('aria-labelledby')).toBe('kg-help-title')
    expect(wrapper.get('#kg-help-title').text()).toBe('操作說明')
  })

  it('應該顯示放大、縮小與全部置中的鍵盤快捷鍵', () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: true, isMac: false } })
    const rows = wrapper.findAll('dl dd').map((row) => row.text())

    expect(rows).toContain('放大')
    expect(rows).toContain('縮小')
    expect(rows).toContain('全部置中')
  })

  it('從關閉切到打開時應該把焦點移到關閉按鈕', async () => {
    const wrapper = mount(GraphShortcutsHelp, {
      attachTo: document.body,
      props: { open: false, isMac: false },
    })

    await wrapper.setProps({ open: true })
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('button[aria-label="關閉操作說明"]').element)
    wrapper.unmount()
  })

  it('點關閉按鈕時應該 emit close', async () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: true, isMac: false } })

    await wrapper.get('button[aria-label="關閉操作說明"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it.each([
    { isMac: true, modifier: '⌘' },
    { isMac: false, modifier: 'Ctrl' },
  ])('isMac 為 $isMac 時應該顯示 $modifier 滑鼠快捷鍵', ({ isMac, modifier }) => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: true, isMac } })

    expect(wrapper.text()).toContain(`按住 ${modifier} 再滾動滾輪：縮放`)
  })

  it('面板打開過且元件卸載時應該中止尺寸觀察', async () => {
    const wrapper = mount(GraphShortcutsHelp, { props: { open: false, isMac: false } })

    await wrapper.setProps({ open: true })
    await nextTick()
    expect(observe).toHaveBeenCalledOnce()

    wrapper.unmount()

    expect(disconnect).toHaveBeenCalledOnce()
  })
})
