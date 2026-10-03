import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './useAuthStore'

// 登入／登出結果的提示（AuthNotice 顯示的 notice）。2026-10-03 使用者：「登入成功與否要有提示」

function mockFetch(handler: (url: string) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => handler(url)),
  )
}

describe('useAuthStore：登入結果提示', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('OAuth 回呼成功：回傳 true，提示「已登入：名字」', async () => {
    mockFetch(() => Response.json({ id: 1, name: 'Jerry', email: 'j@example.com' }))
    const auth = useAuthStore()
    expect(await auth.setTokenFromOAuthCallback('t')).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.notice).toEqual({ tone: 'success', text: '已登入：Jerry' })
  })

  it('OAuth 回呼拿到 token 但 GET /user 失敗：回傳 false、不算登入、不提示成功', async () => {
    mockFetch(() => new Response(null, { status: 401 }))
    const auth = useAuthStore()
    expect(await auth.setTokenFromOAuthCallback('bad')).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.notice).toBeNull()
  })

  it('OAuth 回呼時後端連不上：同樣算失敗，token 不留著', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const auth = useAuthStore()
    expect(await auth.setTokenFromOAuthCallback('t')).toBe(false)
    expect(auth.token).toBeNull()
  })

  it('帳密登入成功：提示「已登入：名字」', async () => {
    mockFetch(() =>
      Response.json({ token: 't', data: { id: 1, name: 'Jerry', email: 'j@example.com' } }),
    )
    const auth = useAuthStore()
    expect(await auth.login('j@example.com', 'pw')).toEqual({ ok: true })
    expect(auth.notice).toEqual({ tone: 'success', text: '已登入：Jerry' })
  })

  it('登出：提示「已登出」', async () => {
    mockFetch(() => new Response(null, { status: 204 }))
    const auth = useAuthStore()
    auth.token = 't'
    await auth.logout()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.notice).toEqual({ tone: 'success', text: '已登出' })
  })
})
