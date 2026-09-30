import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseSegmented from './BaseSegmented.vue'

const OPTIONS = [
  { value: 'timeline', label: '時間軸' },
  { value: 'folder', label: '分類夾' },
] as const

function mountSeg(modelValue: 'timeline' | 'folder') {
  return mount(BaseSegmented, {
    props: {
      options: OPTIONS,
      label: '文章排列方式',
      modelValue,
      'onUpdate:modelValue': () => {},
    },
  })
}

describe('BaseSegmented', () => {
  it('整組有 group 角色跟用途說明，給螢幕報讀器唸', () => {
    const group = mountSeg('timeline').find('[role="group"]')
    expect(group.attributes('aria-label')).toBe('文章排列方式')
  })

  it('只有選中的那顆 aria-pressed="true"，並套上選中的 token', () => {
    const [a, b] = mountSeg('timeline').findAll('button')
    expect(a!.attributes('aria-pressed')).toBe('true')
    expect(b!.attributes('aria-pressed')).toBe('false')
    expect(a!.classes()).toContain('bg-(--bg-selected)')
    expect(b!.classes()).not.toContain('bg-(--bg-selected)')
  })

  it('點另一顆會送出新的值（v-model）', async () => {
    const wrapper = mountSeg('timeline')
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['folder'])
  })
})
