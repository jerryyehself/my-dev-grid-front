import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import AuthNotice from './AuthNotice.vue'
import { useAuthStore } from '@/stores/useAuthStore'

describe('AuthNotice', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('它應該在沒有提示時只留一個空的 aria-live 區塊', () => {
    const wrapper = mount(AuthNotice)
    expect(wrapper.attributes('aria-live')).toBe('polite')
    expect(wrapper.text()).toBe('')
  })

  it('它應該在成功提示時顯示文字，並在 5 秒後自己消失', async () => {
    const auth = useAuthStore()
    const wrapper = mount(AuthNotice)
    auth.setNotice({ tone: 'success', text: '已登入：Jerry' })
    await nextTick()
    expect(wrapper.find('[role="status"]').text()).toContain('已登入：Jerry')

    vi.advanceTimersByTime(5000)
    await nextTick()
    expect(auth.notice).toBeNull()
    expect(wrapper.text()).toBe('')
  })

  it('它應該在錯誤提示時使用 role="alert"，不會自己消失，按關閉才收起來', async () => {
    const auth = useAuthStore()
    const wrapper = mount(AuthNotice)
    auth.setNotice({ tone: 'error', text: '登入失敗' })
    await nextTick()
    expect(wrapper.find('[role="alert"]').text()).toContain('登入失敗')

    vi.advanceTimersByTime(60000)
    await nextTick()
    expect(auth.notice).not.toBeNull()

    await wrapper.find('button[aria-label="關閉提示"]').trigger('click')
    expect(auth.notice).toBeNull()
  })
})
