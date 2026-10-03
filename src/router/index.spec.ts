import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from './index'
import { useAuthStore } from '@/stores/useAuthStore'

// /admin 是後台入口，跟其他寫入頁一樣掛 requiresAuth：沒登入就被導去登入頁，帶著原本要去的路徑。

describe('router：/admin', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.push('/about')
  })

  it('路由設定標了 requiresAuth', () => {
    const resolved = router.resolve('/admin')
    expect(resolved.name).toBe('admin')
    expect(resolved.meta.requiresAuth).toBe(true)
  })

  it('沒登入：導去登入頁，redirect 帶回 /admin', async () => {
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin')
  })

  it('登入後：進得去', async () => {
    useAuthStore().token = 'test-token'
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin')
  })
})

// 後端 OAuth 失敗導回 `/?auth_error=…`，前端要轉去登入頁說明原因（2026-10-03 使用者回報畫面沒反應）
describe('router：auth_error', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.push('/about')
  })

  it('首頁帶 auth_error：轉去登入頁，錯誤代碼一起帶過去', async () => {
    await router.push('/?auth_error=not_authorized')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.auth_error).toBe('not_authorized')
  })

  it('沒有 auth_error：首頁照常', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).not.toBe('login')
  })
})
