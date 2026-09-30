import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AuthStatus from './AuthStatus.vue'
import { useAuthStore } from '@/stores/useAuthStore'

const Stub = { template: '<div />' }

async function mountStatus() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/login', component: Stub },
    ],
  })
  router.push('/')
  await router.isReady()
  return mount(AuthStatus, { global: { plugins: [router] } })
}

describe('AuthStatus', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('正式建置、沒登入：不顯示「登入」按鈕（訪客登入不了，按鈕只會誤導）', async () => {
    vi.stubEnv('DEV', false)
    const wrapper = await mountStatus()
    expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('本機開發、沒登入：顯示「登入」按鈕', async () => {
    vi.stubEnv('DEV', true)
    const wrapper = await mountStatus()
    expect(wrapper.find('a[href="/login"]').text()).toBe('登入')
  })

  it('已登入：不管哪個環境都顯示使用者跟「登出」', async () => {
    vi.stubEnv('DEV', false)
    const auth = useAuthStore()
    auth.token = 'test-token'
    auth.user = { name: 'Jerry' } as typeof auth.user
    const wrapper = await mountStatus()
    expect(wrapper.text()).toContain('Jerry')
    expect(wrapper.find('button').text()).toBe('登出')
  })
})
