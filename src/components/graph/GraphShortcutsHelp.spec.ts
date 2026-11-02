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
