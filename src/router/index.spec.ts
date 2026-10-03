import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

// 整頁重新整理後 token 不在記憶體裡，requiresAuth 的頁面要等 restore() 用 refresh cookie
// 換回登入狀態，不然重新整理 /admin 會被當成沒登入、導去 /login
describe('router：等 restore() 做完再判斷', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    await router.push('/about')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('上次是登入狀態、cookie 有效：換發完成前不導頁，完成後進得去 /admin', async () => {
    window.localStorage.setItem('mdg_auth_session', '1')
    let resolve!: (r: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((r) => (resolve = r))),
    )
    // 模擬 main.ts 開機時就先開始 restore
    const auth = useAuthStore()
    void auth.restore()

    const navigation = router.push('/admin')
    await Promise.resolve()
    expect(auth.restoring).toBe(true)
    expect(router.currentRoute.value.name).toBe('about')

    resolve(Response.json({ token: 'restored', data: { id: 1, name: 'J', email: 'j@x' } }))
    await navigation

    expect(router.currentRoute.value.name).toBe('admin')
  })

  it('cookie 無效：換發失敗後才導去登入頁', async () => {
    window.localStorage.setItem('mdg_auth_session', '1')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    )

    await router.push('/admin')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin')
  })

  it('不需要登入的頁面不等 restore', async () => {
    window.localStorage.setItem('mdg_auth_session', '1')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    void useAuthStore().restore()

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('home')
  })
})
