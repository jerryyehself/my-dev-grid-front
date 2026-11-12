import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GraphZoomControls from './GraphZoomControls.vue'

const labels = ['放大', '縮小', '全部置中', '操作說明']
const events = ['zoomIn', 'zoomOut', 'fit', 'help'] as const

describe('GraphZoomControls', () => {
  it('它應該依序顯示四顆具有快捷鍵標示的按鈕', () => {
    const wrapper = mount(GraphZoomControls, { props: { helpOpen: false } })
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(4)
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual(labels)
    expect(buttons.every((button) => button.attributes('aria-keyshortcuts') !== undefined)).toBe(
      true,
    )
  })

  it('它應該讓四顆按鈕都是 button 型別', () => {
    const wrapper = mount(GraphZoomControls, { props: { helpOpen: false } })

    expect(wrapper.findAll('button').map((button) => button.attributes('type'))).toEqual([
      'button',
      'button',
      'button',
      'button',
    ])
  })

  it.each(events)('它應該在點擊對應按鈕時只送出 %s 事件', async (eventName) => {
    const wrapper = mount(GraphZoomControls, { props: { helpOpen: false } })
    const index = events.indexOf(eventName)

    await wrapper.get(`button[aria-label="${labels[index]}"]`).trigger('click')

    expect(wrapper.emitted(eventName)).toHaveLength(1)
    for (const otherEvent of events.filter((event) => event !== eventName)) {
      expect(wrapper.emitted(otherEvent)).toBeUndefined()
    }
  })

  it('它應該在 disabled 時只停用前三顆按鈕', async () => {
    const wrapper = mount(GraphZoomControls, { props: { disabled: true, helpOpen: false } })
    const actionButtons = labels
      .slice(0, 3)
      .map((label) => wrapper.get(`button[aria-label="${label}"]`))
    const helpButton = wrapper.get('button[aria-label="操作說明"]')

    expect(actionButtons.every((button) => button.attributes('disabled') !== undefined)).toBe(
      true,
    )
    expect(helpButton.attributes('disabled')).toBeUndefined()

    await helpButton.trigger('click')
    expect(wrapper.emitted('help')).toHaveLength(1)
  })

  it('它應該只讓操作說明按鈕的 aria-expanded 跟著 helpOpen', async () => {
    const wrapper = mount(GraphZoomControls, { props: { helpOpen: false } })
    const actionButtons = labels
      .slice(0, 3)
      .map((label) => wrapper.get(`button[aria-label="${label}"]`))
    const helpButton = wrapper.get('button[aria-label="操作說明"]')

    expect(
      actionButtons.every((button) => button.attributes('aria-expanded') === undefined),
    ).toBe(
      true,
    )
    expect(helpButton.attributes('aria-expanded')).toBe('false')

    await wrapper.setProps({ helpOpen: true })
    expect(helpButton.attributes('aria-expanded')).toBe('true')
  })
})
