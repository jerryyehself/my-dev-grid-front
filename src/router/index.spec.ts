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

  it('它應該在路由設定標上 requiresAuth', () => {
    const resolved = router.resolve('/admin')
    expect(resolved.name).toBe('admin')
    expect(resolved.meta.requiresAuth).toBe(true)
  })

  it('它應該在沒登入時導去登入頁，redirect 帶回 /admin', async () => {
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin')
  })

  it('它應該在登入後進入 /admin', async () => {
    useAuthStore().token = 'test-token'
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin')
  })
})

// 本體論的一覽與詳情頁是管理用的頁面（唯一入口是 /admin），跟新增/編輯頁一樣要登入
describe.each([
  ['/ontology/scopes', 'ontology-scopes'],
  ['/ontology/scopes/1', 'ontology-scope'],
  ['/ontology/relations', 'ontology-relations'],
  ['/ontology/relations/1', 'ontology-relation'],
])('router：%s', (path, name) => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.push('/about')
  })

  it('它應該在路由設定標上 requiresAuth', () => {
    const resolved = router.resolve(path)
    expect(resolved.name).toBe(name)
    expect(resolved.meta.requiresAuth).toBe(true)
  })

  it('它應該在沒登入時導去登入頁，redirect 帶回原本的路徑', async () => {
    await router.push(path)
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe(path)
  })

  it('它應該在登入後進入該頁', async () => {
    useAuthStore().token = 'test-token'
    await router.push(path)
    expect(router.currentRoute.value.name).toBe(name)
  })
})

// 後端 OAuth 失敗導回 `/?auth_error=…`，前端要轉去登入頁說明原因（2026-10-03 使用者回報畫面沒反應）
describe('router：auth_error', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.push('/about')
  })

  it('它應該在首頁帶 auth_error 時轉去登入頁，錯誤代碼一起帶過去', async () => {
    await router.push('/?auth_error=not_authorized')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.auth_error).toBe('not_authorized')
  })

  it('它應該在沒有 auth_error 時照常顯示首頁', async () => {
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

  it('它應該在上次是登入狀態且 cookie 有效時等換發完成才導頁，完成後進入 /admin', async () => {
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

  it('它應該在 cookie 無效時等換發失敗才導去登入頁', async () => {
    window.localStorage.setItem('mdg_auth_session', '1')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    )

    await router.push('/admin')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin')
  })

  it('它應該在頁面不需要登入時不等 restore', async () => {
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

// 對不到任何路由的網址：兜底到 404 頁（以前只剩空白頁）
describe('router：not-found', () => {
  it('它應該將不存在的網址解析到 not-found，並將原路徑保留在網址上', () => {
    const resolved = router.resolve('/no/such/page?x=1')
    expect(resolved.name).toBe('not-found')
    expect(resolved.fullPath).toBe('/no/such/page?x=1')
  })

  it('它應該讓既有的頁面不被兜底路由搶走', () => {
    expect(router.resolve('/articles/12').name).toBe('article-detail')
    expect(router.resolve('/graph').name).toBe('graph')
  })
})
