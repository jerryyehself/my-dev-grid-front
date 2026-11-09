import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  AuthRefreshUnavailableError,
  AuthSessionChangedError,
  apiDelete,
  apiGet,
  apiPost,
} from './client'
import { useAuthStore } from '@/stores/useAuthStore'

const mockFetch = vi.fn()

// vi.mock 的 factory 會被 hoist 到檔案最上面，裡面引用的變數要用
// vi.hoisted 宣告，不能直接用外面的 const（那樣會撞到 TDZ）。
const { mockPush, mockCurrentRoute } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockCurrentRoute: { value: { name: 'article-manage', fullPath: '/articles/manage' } },
}))

// client.ts 的 401 處理要導頁，這裡假路由，不吃真的 router/views——
// 那些是 client.ts 認證邏輯以外的東西，不該被這份測試間接載入。
vi.mock('@/router', () => ({
  default: {
    push: mockPush,
    currentRoute: mockCurrentRoute,
  },
}))

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockPush.mockReset()
  mockCurrentRoute.value = { name: 'article-manage', fullPath: '/articles/manage' }
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

    // 先確定真的送了兩次，下面的迴圈才不會在一次都沒送時空轉通過
    expect(mockFetch).toHaveBeenCalledTimes(2)
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

  it('它應該在已經停在登入頁時不再導一次，免得登入後的 redirect 變成 /login', async () => {
    mockCurrentRoute.value = { name: 'login', fullPath: '/login?redirect=/admin' }
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Unauthenticated.' }, 401))

    await expect(apiGet('/scopes')).rejects.toThrow('Unauthorized')

    expect(mockPush).not.toHaveBeenCalled()
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

    await expect(
      Promise.all([apiGet('/scopes'), apiGet('/relations'), apiGet('/techniques')]),
    ).resolves.toEqual([{ data: [] }, { data: [] }, { data: [] }])

    const refreshCalls = mockFetch.mock.calls.filter(
      ([url]) => pathOf(url as string) === '/auth/refresh',
    )
    expect(refreshCalls).toHaveLength(1)
    // 三個請求各送兩次：第一次帶過期的 token，重送帶換到的新 token
    const sent = mockFetch.mock.calls
      .filter(([url]) => pathOf(url as string) !== '/auth/refresh')
      .map(([url, init]) => [
        pathOf(url as string),
        (init.headers as Record<string, string>).Authorization,
      ])
    expect(sent).toHaveLength(6)
    for (const path of ['/scopes', '/relations', '/techniques']) {
      expect(sent).toContainEqual([path, 'Bearer expired'])
      expect(sent).toContainEqual([path, 'Bearer fresh'])
    }
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('它應該在舊 token 的 401 於換發完成後才回來時直接用新 token 重送，不再換發', async () => {
    const auth = useAuthStore()
    auth.token = 'expired'
    let issued = 0
    let releaseSlow!: () => void
    const slowGate = new Promise<void>((resolve) => (releaseSlow = resolve))
    mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const path = pathOf(url)
      if (path === '/auth/refresh') {
        issued++
        return jsonResponse({ token: `fresh-${issued}`, data: {} })
      }
      const bearer = (init.headers as Record<string, string>).Authorization
      // 跟後端一樣：每換發一次，上一次換出來的 access token 就作廢，只認最新的那支
      if (issued > 0 && bearer === `Bearer fresh-${issued}`) return jsonResponse({ path })
      // /slow 帶舊 token 的那次 401 晚一點才回來（換發已經做完了）
      if (path === '/slow' && bearer === 'Bearer expired') await slowGate
      return jsonResponse({}, 401)
    })

    const slow = apiGet('/slow')
    await expect(apiGet('/fast')).resolves.toEqual({ path: '/fast' })
    releaseSlow()
    await expect(slow).resolves.toEqual({ path: '/slow' })

    const refreshCalls = mockFetch.mock.calls.filter(
      ([url]) => pathOf(url as string) === '/auth/refresh',
    )
    expect(refreshCalls).toHaveLength(1)
    expect(auth.token).toBe('fresh-1')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('它應該在 401 回來之前已經登出時不換發、不重送也不導頁，丟 AuthSessionChangedError', async () => {
    const auth = useAuthStore()
    auth.token = 'expired'
    mockFetch.mockImplementation(async (url: string) => {
      const path = pathOf(url)
      if (path === '/auth/refresh') return jsonResponse({ token: 'fresh', data: {} })
      if (path === '/auth/logout') return jsonResponse({ message: '已登出。' })
      await auth.logout()
      return jsonResponse({}, 401)
    })

    await expect(apiGet('/scopes')).rejects.toBeInstanceOf(AuthSessionChangedError)

    expect(mockFetch.mock.calls.map(([url]) => pathOf(url as string))).toEqual([
      '/scopes',
      '/auth/logout',
    ])
    expect(auth.token).toBeNull()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('它應該在舊帳號的寫入請求 401 晚回來、期間已經換成別的帳號登入時不拿新帳號的 token 重送', async () => {
    const auth = useAuthStore()
    auth.token = 'token-A'
    auth.user = { id: 1, name: 'A', email: 'a@x' }
    let releaseA!: () => void
    const gateA = new Promise<void>((resolve) => (releaseA = resolve))
    mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const path = pathOf(url)
      if (path === '/auth/login') {
        return jsonResponse({ token: 'token-B', data: { id: 2, name: 'B', email: 'b@x' } })
      }
      if (path === '/auth/refresh') return jsonResponse({ token: 'refreshed', data: {} })
      const bearer = (init.headers as Record<string, string>).Authorization
      if (bearer === 'Bearer token-A') {
        await gateA
        return jsonResponse({}, 401)
      }
      return jsonResponse({ savedAs: bearer })
    })

    const pending = apiPost('/documentations', { title: 'A 的草稿' })
    await auth.login('b@x', 'pw')
    releaseA()

    await expect(pending).rejects.toBeInstanceOf(AuthSessionChangedError)
    const paths = mockFetch.mock.calls.map(([url]) => pathOf(url as string))
    expect(paths).toEqual(['/documentations', '/auth/login'])
    expect(auth.token).toBe('token-B')
    expect(auth.user).toEqual({ id: 2, name: 'B', email: 'b@x' })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it.each([
    ['換發成功', () => jsonResponse({ token: 'A-rotated', data: { id: 1, name: 'A', email: 'a@x' } })],
    ['換發 401', () => jsonResponse({}, 401)],
    ['換發 503', () => jsonResponse({}, 503)],
  ])('它應該在換發進行中換成別的登入時（舊換發%s）不重送原本的請求，也不清掉新的登入', async (label, lateRefresh) => {
    const auth = useAuthStore()
    auth.token = 'token-A'
    let refreshSent!: () => void
    const refreshStarted = new Promise<void>((resolve) => (refreshSent = resolve))
    let releaseRefresh!: () => void
    const refreshGate = new Promise<void>((resolve) => (releaseRefresh = resolve))
    mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const path = pathOf(url)
      if (path === '/auth/login') {
        return jsonResponse({ token: 'token-B', data: { id: 2, name: 'B', email: 'b@x' } })
      }
      if (path === '/auth/refresh') {
        refreshSent()
        await refreshGate
        return lateRefresh()
      }
      const bearer = (init.headers as Record<string, string>).Authorization
      return bearer === 'Bearer token-A' ? jsonResponse({}, 401) : jsonResponse({ savedAs: bearer })
    })

    const pending = apiPost('/documentations', { title: 'A 的草稿' })
    await refreshStarted
    await auth.login('b@x', 'pw')
    releaseRefresh()

    await expect(pending).rejects.toBeInstanceOf(AuthSessionChangedError)
    const documentationCalls = mockFetch.mock.calls.filter(
      ([url]) => pathOf(url as string) === '/documentations',
    )
    expect(documentationCalls).toHaveLength(1)
    expect(auth.token).toBe('token-B')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('它應該在同一次登入裡目前的 token 也已經失效時再換發一次、用換到的 token 重送', async () => {
    const auth = useAuthStore()
    auth.token = 'expired'
    let issued = 0
    // 後端目前只認的那支 access token
    let accepted: string | null = null
    let releaseSlow!: () => void
    const slowGate = new Promise<void>((resolve) => (releaseSlow = resolve))
    mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const path = pathOf(url)
      if (path === '/auth/refresh') {
        accepted = `fresh-${++issued}`
        return jsonResponse({ token: accepted, data: {} })
      }
      const bearer = (init.headers as Record<string, string>).Authorization
      if (bearer === `Bearer ${accepted}`) return jsonResponse({ path })
      if (path === '/slow' && bearer === 'Bearer expired') await slowGate
      return jsonResponse({}, 401)
    })

    const slow = apiGet('/slow')
    await expect(apiGet('/fast')).resolves.toEqual({ path: '/fast' })
    // 另一個分頁接著換發：後端作廢這個分頁手上的 fresh-1，cookie 也換成新的了
    accepted = `fresh-${++issued}`
    releaseSlow()

    await expect(slow).resolves.toEqual({ path: '/slow' })
    const slowBearers = mockFetch.mock.calls
      .filter(([url]) => pathOf(url as string) === '/slow')
      .map(([, init]) => (init.headers as Record<string, string>).Authorization)
    expect(slowBearers).toEqual(['Bearer expired', 'Bearer fresh-1', 'Bearer fresh-3'])
    expect(auth.token).toBe('fresh-3')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('它應該在目前的 token 失效、再換發一次重送還是 401 時就停，只換發一次並導去登入頁', async () => {
    const auth = useAuthStore()
    auth.token = 'expired'
    let issued = 0
    let accepted: string | null = null
    let backendRejectsAll = false
    let releaseSlow!: () => void
    const slowGate = new Promise<void>((resolve) => (releaseSlow = resolve))
    mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const path = pathOf(url)
      if (path === '/auth/refresh') {
        const token = `fresh-${++issued}`
        if (!backendRejectsAll) accepted = token
        return jsonResponse({ token, data: {} })
      }
      const bearer = (init.headers as Record<string, string>).Authorization
      if (bearer === `Bearer ${accepted}`) return jsonResponse({ path })
      if (path === '/slow' && bearer === 'Bearer expired') await slowGate
      return jsonResponse({}, 401)
    })

    const slow = apiGet('/slow')
    await expect(apiGet('/fast')).resolves.toEqual({ path: '/fast' })
    backendRejectsAll = true
    accepted = null
    releaseSlow()

    await expect(slow).rejects.toThrow('Unauthorized')
    const paths = mockFetch.mock.calls.map(([url]) => pathOf(url as string))
    expect(paths.filter((p) => p === '/auth/refresh')).toHaveLength(2)
    expect(paths.filter((p) => p === '/slow')).toHaveLength(3)
    expect(auth.token).toBeNull()
    expect(mockPush).toHaveBeenCalledTimes(1)
  })

  it('它應該在確定沒登入、清掉狀態時讓進行中的換發結果作廢，不在導去登入頁之後又登入回來', async () => {
    window.localStorage.setItem('mdg_auth_session', '1')
    const auth = useAuthStore()
    auth.token = 'T0'
    let refreshes = 0
    let userRequests = 0
    let sentRetry!: () => void
    const retrySent = new Promise<void>((resolve) => (sentRetry = resolve))
    let releaseRetry!: () => void
    const retryGate = new Promise<void>((resolve) => (releaseRetry = resolve))
    let releaseLateRefresh!: () => void
    const lateRefreshGate = new Promise<void>((resolve) => (releaseLateRefresh = resolve))
    mockFetch.mockImplementation(async (url: string) => {
      if (pathOf(url) === '/auth/refresh') {
        if (++refreshes === 1) return jsonResponse({ token: 'T1', data: {} })
        await lateRefreshGate
        return jsonResponse({ token: 'late', data: { id: 1, name: 'J', email: 'j@x' } })
      }
      if (++userRequests === 1) return jsonResponse({}, 401)
      sentRetry()
      await retryGate
      return jsonResponse({}, 401)
    })

    const request = apiGet('/user')
    await retrySent
    // 換到的 T1 重送還在路上時，另一個呼叫端開始了下一次換發
    const lateRefresh = auth.refresh()
    releaseRetry()
    await expect(request).rejects.toThrow('Unauthorized')
    expect(auth.token).toBeNull()
    expect(mockPush).toHaveBeenCalledTimes(1)

    releaseLateRefresh()
    const outcome = await lateRefresh
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
    expect(window.localStorage.getItem('mdg_auth_session')).toBeNull()
    expect(outcome).toBe('superseded')
  })

  it.each([
    ['後端一直 503', () => jsonResponse({}, 503)],
    ['後端連不上', () => {
      throw new TypeError('Failed to fetch')
    }],
  ])('它應該在換發暫時失敗（%s）時丟可重試的錯誤，保留登入狀態、不導去登入頁', async (label, refreshHandler) => {
    const auth = useAuthStore()
    auth.token = 'expired'
    auth.user = { id: 1, name: 'J', email: 'j@x' }
    mockFetch.mockImplementation(async (url: string) =>
      pathOf(url) === '/auth/refresh' ? refreshHandler() : jsonResponse({}, 401),
    )

    await expect(apiPost('/documentations', { title: '還沒存的內容' })).rejects.toBeInstanceOf(
      AuthRefreshUnavailableError,
    )

    expect(auth.token).toBe('expired')
    expect(auth.user).toEqual({ id: 1, name: 'J', email: 'j@x' })
    expect(mockPush).not.toHaveBeenCalled()
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

    await expect(apiPost('/documentations', {})).rejects.toThrow(
      'API 請求失敗（502）：POST /documentations',
    )
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
