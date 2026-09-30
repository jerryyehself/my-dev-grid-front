import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AuthOnly from './AuthOnly.vue'
import { useAuthStore } from '@/stores/useAuthStore'

// 寫入入口（管理／編輯／新增）只給登入的人看——各頁都靠這個元件，規則只測這一次。

function mountWithSlot() {
  return mount(AuthOnly, { slots: { default: '<a class="write-entry">編輯</a>' } })
}

describe('AuthOnly', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('沒登入時不渲染裡面的寫入入口', () => {
    expect(mountWithSlot().find('.write-entry').exists()).toBe(false)
  })

  it('登入後才渲染', () => {
    useAuthStore().token = 'test-token'
    expect(mountWithSlot().find('.write-entry').exists()).toBe(true)
  })
})
