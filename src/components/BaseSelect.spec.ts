import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseSelect from './BaseSelect.vue'

const options = [
  { value: 0, label: '文件', suffix: 'DOC' },
  { value: 7, label: '技術' },
]

describe('BaseSelect', () => {
  it('它應該將預設 placeholder 放在第一列並禁止選取', () => {
    const wrapper = mount(BaseSelect, { props: { options, modelValue: null } })
    const placeholder = wrapper.findAll('option')[0]!

    expect(placeholder.text()).toBe('請選擇')
    expect(placeholder.element.disabled).toBe(true)
  })

  it('它應該顯示呼叫端傳入的 placeholder', () => {
    const wrapper = mount(BaseSelect, {
      props: { options, modelValue: null, placeholder: '選擇分類' },
    })

    expect(wrapper.findAll('option')[0]!.text()).toBe('選擇分類')
  })

  it('它應該逐筆顯示選項並只在有 suffix 時加入分隔文字', () => {
    const wrapper = mount(BaseSelect, { props: { options, modelValue: null } })
    const rendered = wrapper.findAll('option')

    expect(rendered).toHaveLength(options.length + 1)
    expect(rendered.slice(1).map((option) => option.text())).toEqual(['文件 · DOC', '技術'])
    expect(rendered.slice(1).map((option) => option.element.value)).toEqual(['0', '7'])
  })

  it.each([0, 7])('它應該將選取的 id %i 以 number 送出', async (value) => {
    const wrapper = mount(BaseSelect, { props: { options, modelValue: null } })

    await wrapper.get('select').setValue(String(value))

    expect(wrapper.emitted('update:modelValue')).toEqual([[value]])
    expect(typeof wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('number')
  })

  it('它應該在 modelValue 為 null 時停在 placeholder，並在清空後回到該列', async () => {
    const wrapper = mount(BaseSelect, { props: { options, modelValue: null } })
    const select = wrapper.get('select').element

    expect(select.selectedIndex).toBe(0)
    await wrapper.setProps({ modelValue: 7 })
    expect(select.selectedIndex).toBe(2)
    await wrapper.setProps({ modelValue: null })
    expect(select.selectedIndex).toBe(0)
  })

  it('它應該依 disabled 決定 select 的停用狀態', async () => {
    const wrapper = mount(BaseSelect, { props: { options, modelValue: null } })
    const select = wrapper.get('select')

    expect(select.element.disabled).toBe(false)
    await wrapper.setProps({ disabled: true })
    expect(select.attributes()).toHaveProperty('disabled')
    expect(select.element.disabled).toBe(true)
  })
})
