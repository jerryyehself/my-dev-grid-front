import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from './BaseButton.vue'

describe('BaseButton', () => {
  it('它應該將 slot 內容顯示在按鈕裡', () => {
    const wrapper = mount(BaseButton, { slots: { default: '<span>儲存變更</span>' } })

    expect(wrapper.get('button span').text()).toBe('儲存變更')
  })

  it('它應該預設套用 primary 的代表 class', () => {
    const wrapper = mount(BaseButton)

    expect(wrapper.get('button').classes()).toContain('rounded-full')
  })

  it.each([
    { variant: 'primary', representative: 'rounded-full' },
    { variant: 'ghost', representative: 'px-1' },
    { variant: 'tab', representative: 'rounded-t' },
    { variant: 'page', representative: 'rounded-xs' },
    { variant: 'add', representative: 'border-dashed' },
  ] as const)('它應該為 $variant 套用對應的代表 class', ({ variant, representative }) => {
    const wrapper = mount(BaseButton, { props: { variant } })

    expect(wrapper.get('button').classes()).toContain(representative)
  })

  it.each(['tab', 'page'] as const)('它應該讓 %s 樣式隨 active 切換', async (variant) => {
    const wrapper = mount(BaseButton, { props: { variant, active: false } })
    const button = wrapper.get('button')

    expect(button.classes()).not.toContain('font-bold')
    await wrapper.setProps({ active: true })
    expect(button.classes()).toContain('font-bold')
    await wrapper.setProps({ active: false })
    expect(button.classes()).not.toContain('font-bold')
  })

  it('它應該將 disabled 與 aria-label 傳到原生 button', () => {
    const wrapper = mount(BaseButton, {
      attrs: { disabled: true, 'aria-label': '儲存文章' },
    })
    const button = wrapper.get('button')

    expect(button.element.disabled).toBe(true)
    expect(button.attributes()).toHaveProperty('disabled')
    expect(button.attributes('aria-label')).toBe('儲存文章')
  })

  it('它應該將原生 click 事件傳給呼叫端', async () => {
    const onClick = vi.fn()
    const wrapper = mount(BaseButton, { attrs: { onClick } })

    await wrapper.get('button').trigger('click')

    expect(onClick).toHaveBeenCalledOnce()
    expect(onClick.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent)
  })

  it('它應該記錄未傳 type 時沒有該屬性，原生 type 預設為 submit', () => {
    const wrapper = mount(BaseButton)
    const button = wrapper.get('button')

    expect(button.attributes('type')).toBeUndefined()
    expect(button.element.type).toBe('submit')
  })

  it('它應該保留呼叫端明確指定的 button type', () => {
    const wrapper = mount(BaseButton, { attrs: { type: 'button' } })

    expect(wrapper.get('button').attributes('type')).toBe('button')
    expect(wrapper.get('button').element.type).toBe('button')
  })
})
