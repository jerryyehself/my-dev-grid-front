import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiGet, apiPost } from './client'
import { useAuthStore } from '@/stores/useAuthStore'

const mockFetch = vi.fn()

// vi.mock 的 factory 會被 hoist 到檔案最上面，裡面引用的變數要用
// vi.hoisted 宣告，不能直接用外面的 const（那樣會撞到 TDZ）。
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))

// client.ts 的 401 處理要導頁，這裡假路由，不吃真的 router/views——
// 那些是 client.ts 認證邏輯以外的東西，不該被這份測試間接載入。
vi.mock('@/router', () => ({
  default: {
    push: mockPush,
    currentRoute: { value: { fullPath: '/articles/manage' } },
  },
}))

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockPush.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  setActivePinia(createPinia())
})

describe('authHeaders', () => {
  it('沒有 token 時不帶 Authorization header', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }))

    await apiGet('/scopes')

    const [, init] = mockFetch.mock.calls[0]!
    expect(init?.headers as Record<string, string>).not.toHaveProperty('Authorization')
  })

  it('有 token 時每個請求都帶 Authorization: Bearer', async () => {
    useAuthStore().token = 'plain-text-token'
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }))

    await apiGet('/scopes')
    await apiPost('/scopes', { name: 'x' })

    for (const [, init] of mockFetch.mock.calls) {
      const headers = init?.headers as Record<string, string> | undefined
      expect(headers?.Authorization).toBe('Bearer plain-text-token')
    }
  })
})

describe('401 handling', () => {
  it('清掉 token/user 並導去登入頁，帶上原本要去的路徑', async () => {
    const auth = useAuthStore()
    auth.token = 'expired-token'
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Unauthenticated.' }, 401))

    await expect(apiGet('/scopes')).rejects.toThrow('Unauthorized')

    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
    expect(mockPush).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/articles/manage' },
    })
  })
})
