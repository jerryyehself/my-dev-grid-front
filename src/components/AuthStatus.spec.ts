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
      { path: '/admin', name: 'admin', component: Stub },
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

  it('已登入：名字旁標明是登入狀態（報讀器唸「已登入：」，滑過看得到完整名字）', async () => {
    const auth = useAuthStore()
    auth.token = 'test-token'
    auth.user = { id: 1, name: 'Jerry', email: 'j@example.com' }
    const wrapper = await mountStatus()
    const user = wrapper.find('[data-test="auth-user"]')
    expect(user.text()).toBe('已登入：Jerry')
    expect(user.attributes('title')).toBe('已登入：Jerry')
  })

  it('已登入但沒有名字：退回顯示 email', async () => {
    const auth = useAuthStore()
    auth.token = 'test-token'
    auth.user = { id: 1, name: '', email: 'j@example.com' }
    const wrapper = await mountStatus()
    expect(wrapper.find('[data-test="auth-user"]').text()).toBe('已登入：j@example.com')
  })

  it('已登入：顯示連到 /admin 的「管理」', async () => {
    vi.stubEnv('DEV', false)
    useAuthStore().token = 'test-token'
    const wrapper = await mountStatus()
    expect(wrapper.find('a[href="/admin"]').text()).toBe('管理')
  })

  it('開機換回登入狀態中（restoring）：本機開發也先不顯示「登入」，不閃一下未登入的樣子', async () => {
    vi.stubEnv('DEV', true)
    useAuthStore().restoring = true
    const wrapper = await mountStatus()
    expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('沒登入：不管哪個環境都沒有「管理」（訪客看到的導覽列不變）', async () => {
    for (const dev of [false, true]) {
      vi.stubEnv('DEV', dev)
      const wrapper = await mountStatus()
      expect(wrapper.find('a[href="/admin"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('管理')
    }
  })
})
