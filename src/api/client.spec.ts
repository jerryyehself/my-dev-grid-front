import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  it('它應該在沒有 token 時不帶 Authorization header', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }))

    await apiGet('/scopes')

    const [, init] = mockFetch.mock.calls[0]!
    expect(init?.headers as Record<string, string>).not.toHaveProperty('Authorization')
  })

  it('它應該在有 token 時讓每個請求都帶 Authorization: Bearer', async () => {
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
  it('它應該在換發也失敗時清掉 token/user 並導去登入頁，帶上原本要去的路徑', async () => {
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

  it('它應該在 GET 換到新 token 後用新 token 重送一次，讓呼叫端拿到正常結果', async () => {
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

  it('它應該在重送 POST／DELETE 時保留原本的 body、method', async () => {
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

  it('它應該只重試一次，在換到新 token 重送還是 401 時導去登入頁', async () => {
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

  it('它應該在同時好幾個請求收到 401 時共用同一次換發', async () => {
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

  it('它應該在沒帶 token 的請求收到 401 時不換發，直接導去登入頁', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 401))

    await expect(apiGet('/scopes')).rejects.toThrow('Unauthorized')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalled()
  })
})

// 後端冷啟動時前一兩個請求會 502：GET 自己重試，不要一碰到就退回示範資料（2026-10-04 站主回報）
describe('GET 重試', () => {
  it('它應該在 502 之後重試，第二次成功就回正常結果', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 502))
      .mockResolvedValueOnce(jsonResponse({ data: [1] }))

    await expect(apiGet('/documentations')).resolves.toEqual({ data: [1] })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('它應該在網路層失敗（TypeError）時也重試', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))

    await expect(apiGet('/scopes')).resolves.toEqual({ data: [] })
  })

  it('它應該最多重試兩次，在三次都 503 時丟出 ApiHttpError', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 503))

    await expect(apiGet('/scopes')).rejects.toMatchObject({ name: 'ApiHttpError', status: 503 })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('它應該在 404、500 時不重試，直接丟錯', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 404))
    await expect(apiGet('/documentations/9')).rejects.toMatchObject({ status: 404 })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    mockFetch.mockReset()
    mockFetch.mockResolvedValue(jsonResponse({}, 500))
    await expect(apiGet('/scopes')).rejects.toMatchObject({ status: 500 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('它應該不重試非冪等的 POST 請求', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 502))

    await expect(apiPost('/documentations', {})).rejects.toBeTruthy()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

// D-128：4xx／5xx 在 console 記一行 error，帶 X-Request-Id 方便對後端 log
describe('錯誤回應的 console.error', () => {
  const errorSpy = vi.spyOn(console, 'error')

  beforeEach(() => {
    errorSpy.mockReset()
    errorSpy.mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockReset()
  })

  function errorResponse(status: number, requestId?: string) {
    const headers = new Headers(requestId ? { 'X-Request-Id': requestId } : {})
    return { ok: false, status, headers, json: async () => ({}) }
  }

  it('它應該在 4xx 有 X-Request-Id 時記錄方法、路徑、狀態碼跟 request id', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'req-abc-123'))

    await expect(apiGet('/documentations/9')).rejects.toMatchObject({ status: 404 })

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const line = errorSpy.mock.calls[0]![0] as string
    expect(line).toContain('GET')
    expect(line).toContain('/documentations/9')
    expect(line).toContain('404')
    expect(line).toContain('request id: req-abc-123')
  })

  it('它應該在 4xx 沒有 X-Request-Id 時印出 (none)', async () => {
    mockFetch.mockResolvedValue(errorResponse(403))

    await expect(apiDelete('/scopes/1')).rejects.toThrow()

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const line = errorSpy.mock.calls[0]![0] as string
    expect(line).toContain('DELETE')
    expect(line).toContain('/scopes/1')
    expect(line).toContain('403')
    expect(line).toContain('request id: (none)')
  })

  it('它應該在 5xx 有 X-Request-Id 時記錄 request id', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'req-500-xyz'))

    await expect(apiPost('/scopes', { name: 'x' })).rejects.toThrow()

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const line = errorSpy.mock.calls[0]![0] as string
    expect(line).toContain('POST')
    expect(line).toContain('/scopes')
    expect(line).toContain('500')
    expect(line).toContain('request id: req-500-xyz')
  })

  it('它應該在 5xx 沒有 X-Request-Id 時印出 (none)', async () => {
    mockFetch.mockResolvedValue(errorResponse(500))

    await expect(apiGet('/scopes')).rejects.toMatchObject({ status: 500 })

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0]![0]).toContain('request id: (none)')
  })

  it('它應該在 2xx 時不記錄錯誤', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }))

    await apiGet('/scopes')

    expect(errorSpy).not.toHaveBeenCalled()
  })
})
