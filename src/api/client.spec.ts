import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiDelete, apiGet, apiPost } from './client'
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
  it('換發也失敗：清掉 token/user 並導去登入頁，帶上原本要去的路徑', async () => {
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

// access token 只活 15 分鐘：帶 token 的請求收到 401，先用 refresh cookie 換一支新的、重送一次
describe('401 → refresh → retry', () => {
  function pathOf(url: string) {
    return url.replace(/^.*\/api/, '')
  }

  it('GET：換到新 token 後用新 token 重送一次，呼叫端拿到正常結果', async () => {
    const auth = useAuthStore()
    auth.token = 'expired'
    mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const path = pathOf(url)
      const bearer = (init.headers as Record<string, string> | undefined)?.Authorization
      if (path === '/auth/refresh') {
        return jsonResponse({ token: 'fresh', data: { id: 1, name: 'J', email: 'j@x' } })
      }
      return bearer === 'Bearer fresh' ? jsonResponse({ data: ['ok'] }) : jsonResponse({}, 401)
    })

    await expect(apiGet('/scopes')).resolves.toEqual({ data: ['ok'] })

    const paths = mockFetch.mock.calls.map(([url]) => pathOf(url as string))
    expect(paths).toEqual(['/scopes', '/auth/refresh', '/scopes'])
    expect(auth.token).toBe('fresh')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('POST／DELETE 也一樣，重送時 body、method 跟原本相同', async () => {
    const auth = useAuthStore()
    auth.token = 'expired'
    mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
      if (pathOf(url) === '/auth/refresh') return jsonResponse({ token: 'fresh', data: {} })
      const bearer = (init.headers as Record<string, string>).Authorization
      return bearer === 'Bearer fresh' ? jsonResponse({ id: 9 }) : jsonResponse({}, 401)
    })

    await expect(apiPost('/scopes', { name: 'x' })).resolves.toEqual({ id: 9 })
    const retried = mockFetch.mock.calls[2]![1] as RequestInit
    expect(retried.method).toBe('POST')
    expect(retried.body).toBe(JSON.stringify({ name: 'x' }))
    expect((retried.headers as Record<string, string>)['Content-Type']).toBe('application/json')

    auth.token = 'expired'
    mockFetch.mockClear()
    await expect(apiDelete('/scopes/1')).resolves.toEqual({ id: 9 })
    expect((mockFetch.mock.calls[2]![1] as RequestInit).method).toBe('DELETE')
  })

  it('只重試一次：換到新 token 重送還是 401，就導去登入頁', async () => {
    const auth = useAuthStore()
    auth.token = 'expired'
    mockFetch.mockImplementation(async (url: string) =>
      pathOf(url) === '/auth/refresh'
        ? jsonResponse({ token: 'fresh', data: {} })
        : jsonResponse({}, 401),
    )

    await expect(apiGet('/scopes')).rejects.toThrow('Unauthorized')

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(auth.token).toBeNull()
    expect(mockPush).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/articles/manage' },
    })
  })

  it('同時好幾個請求 401：共用同一次換發', async () => {
    const auth = useAuthStore()
    auth.token = 'expired'
    mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
      if (pathOf(url) === '/auth/refresh') return jsonResponse({ token: 'fresh', data: {} })
      const bearer = (init.headers as Record<string, string>).Authorization
      return bearer === 'Bearer fresh' ? jsonResponse({ data: [] }) : jsonResponse({}, 401)
    })

    await Promise.all([apiGet('/scopes'), apiGet('/relations'), apiGet('/techniques')])

    const refreshCalls = mockFetch.mock.calls.filter(
      ([url]) => pathOf(url as string) === '/auth/refresh',
    )
    expect(refreshCalls).toHaveLength(1)
  })

  it('沒帶 token 的請求收到 401：不換發，直接導去登入頁', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 401))

    await expect(apiGet('/scopes')).rejects.toThrow('Unauthorized')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalled()
  })
})

// 後端冷啟動時前一兩個請求會 502：GET 自己重試，不要一碰到就退回示範資料（2026-10-04 站主回報）
describe('GET 重試', () => {
  it('502 之後重試，第二次成功就回正常結果', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 502))
      .mockResolvedValueOnce(jsonResponse({ data: [1] }))

    await expect(apiGet('/documentations')).resolves.toEqual({ data: [1] })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('網路層失敗（TypeError）也重試', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))

    await expect(apiGet('/scopes')).resolves.toEqual({ data: [] })
  })

  it('最多重試兩次，三次都 503 就丟出 ApiHttpError', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 503))

    await expect(apiGet('/scopes')).rejects.toMatchObject({ name: 'ApiHttpError', status: 503 })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('404、500 重試也不會變：不重試，直接丟', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 404))
    await expect(apiGet('/documentations/9')).rejects.toMatchObject({ status: 404 })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    mockFetch.mockReset()
    mockFetch.mockResolvedValue(jsonResponse({}, 500))
    await expect(apiGet('/scopes')).rejects.toMatchObject({ status: 500 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('POST 不重試（不是冪等的）', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 502))

    await expect(apiPost('/documentations', {})).rejects.toBeTruthy()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
