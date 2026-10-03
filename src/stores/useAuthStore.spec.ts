import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './useAuthStore'

// 登入／登出結果的提示（AuthNotice 顯示的 notice）。2026-10-03 使用者：「登入成功與否要有提示」
// 以及「重新整理後維持登入」：restore()／refresh() 用 httpOnly refresh cookie 換回登入狀態。

const SESSION_HINT_KEY = 'mdg_auth_session'
const USER = { id: 1, name: 'Jerry', email: 'j@example.com' }

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>

function mockFetch(handler: Handler) {
  // store 的每個 fetch 都有帶 init，這裡宣告成必填，測試讀 mock.calls 時型別才不會是 undefined
  const fn = vi.fn(async (url: string, init: RequestInit) => handler(url, init ?? {}))
  vi.stubGlobal('fetch', fn)
  return fn
}

function pathOf(url: string) {
  return url.replace(/^.*\/api/, '')
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAuthStore：登入結果提示', () => {
  it('OAuth 回呼成功：打 /auth/session 換正式 token，回傳 true，提示「已登入：名字」', async () => {
    const fetchMock = mockFetch(() =>
      Response.json({ token: 'access', expires_in: 900, data: USER }),
    )
    const auth = useAuthStore()
    expect(await auth.setTokenFromOAuthCallback('callback-token')).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    // 存的是換發後的 token，不是回呼帶來的那支
    expect(auth.token).toBe('access')
    expect(auth.notice).toEqual({ tone: 'success', text: '已登入：Jerry' })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(pathOf(url)).toBe('/auth/session')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer callback-token')
  })

  it('OAuth 回呼拿到 token 但換發失敗：回傳 false、不算登入、不提示成功', async () => {
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

  it('帳密登入成功：帶 credentials 讓瀏覽器存下 refresh cookie，提示「已登入：名字」', async () => {
    const fetchMock = mockFetch(() => Response.json({ token: 't', expires_in: 900, data: USER }))
    const auth = useAuthStore()
    expect(await auth.login('j@example.com', 'pw')).toEqual({ ok: true })
    expect(auth.notice).toEqual({ tone: 'success', text: '已登入：Jerry' })
    expect(fetchMock.mock.calls[0]![1].credentials).toBe('include')
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })

  it('登出：帶 Bearer 跟 credentials，清掉登入狀態，提示「已登出」', async () => {
    const fetchMock = mockFetch(() => Response.json({ message: '已登出。' }))
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const auth = useAuthStore()
    auth.token = 't'
    await auth.logout()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.notice).toEqual({ tone: 'success', text: '已登出' })
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBeNull()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(pathOf(url)).toBe('/auth/logout')
    expect(init.credentials).toBe('include')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t')
  })

  it('登出只打一次 /auth/logout：access token 過期也不先換發（後端靠 refresh cookie 就能撤銷）', async () => {
    const fetchMock = mockFetch(() => Response.json({ message: '已登出。' }))
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const auth = useAuthStore()
    auth.token = 'expired'
    expect(await auth.logout()).toBe(true)
    expect(fetchMock.mock.calls.map(([url]) => pathOf(url))).toEqual(['/auth/logout'])
    expect(auth.isAuthenticated).toBe(false)
  })

  it.each([
    ['後端連不上', () => {
      throw new TypeError('Failed to fetch')
    }],
    ['後端 500', () => new Response(null, { status: 500 })],
    ['被限流 429', () => new Response(null, { status: 429 })],
  ])('登出失敗（%s）：保留登入狀態跟旗標、顯示錯誤，不假裝已登出', async (_label, handler) => {
    mockFetch(handler)
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const auth = useAuthStore()
    auth.token = 't'
    auth.user = USER
    expect(await auth.logout()).toBe(false)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.token).toBe('t')
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
    expect(auth.notice?.tone).toBe('error')
  })

  it('登出失敗後再按一次、這次成功：才清掉登入狀態', async () => {
    let attempt = 0
    mockFetch(() =>
      ++attempt === 1 ? new Response(null, { status: 503 }) : Response.json({ message: '已登出。' }),
    )
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const auth = useAuthStore()
    auth.token = 't'
    expect(await auth.logout()).toBe(false)
    expect(await auth.logout()).toBe(true)
    expect(auth.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBeNull()
    expect(auth.notice).toEqual({ tone: 'success', text: '已登出' })
  })
})

describe('useAuthStore：refresh() 收到 409（另一個分頁剛用掉同一支 refresh token）', () => {
  it('稍等再重試一次，成功就算換發成功', async () => {
    let attempt = 0
    const fetchMock = mockFetch(() =>
      ++attempt === 1
        ? Response.json({ message: '登入狀態剛更新過，請重試。' }, { status: 409 })
        : Response.json({ token: 'after-retry', expires_in: 900, data: USER }),
    )
    const auth = useAuthStore()
    expect(await auth.refresh()).toBe(true)
    expect(auth.token).toBe('after-retry')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('只重試一次；重試還是 409 就當暫時失敗：不算登入，但保留旗標下次再試', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const fetchMock = mockFetch(() => new Response(null, { status: 409 }))
    const auth = useAuthStore()
    expect(await auth.refresh()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(auth.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })
})

describe('useAuthStore：restore()（重新整理後換回登入狀態）', () => {
  it('上次是登入狀態、refresh cookie 有效：安靜地換回 token 跟使用者，不顯示提示', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const fetchMock = mockFetch(() =>
      Response.json({ token: 'restored', expires_in: 900, data: USER }),
    )
    const auth = useAuthStore()

    await auth.restore()

    expect(auth.token).toBe('restored')
    expect(auth.user).toEqual(USER)
    expect(auth.notice).toBeNull()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(pathOf(url)).toBe('/auth/refresh')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    // refresh 只靠 cookie，不帶 Authorization
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('refresh cookie 無效（401）：維持未登入、清掉旗標，不顯示提示', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    mockFetch(() => Response.json({ message: '登入已過期' }, { status: 401 }))
    const auth = useAuthStore()

    await auth.restore()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.notice).toBeNull()
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBeNull()
  })

  it('後端連不上：維持未登入，但保留旗標，下次開站再試', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const auth = useAuthStore()

    await auth.restore()

    expect(auth.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })

  it('沒有「上次是登入狀態」的旗標（一般訪客）：完全不打 API', async () => {
    const fetchMock = mockFetch(() => Response.json({}))
    const auth = useAuthStore()

    await auth.restore()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('只跑一次：重複呼叫拿到同一個結果，不會重打', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const fetchMock = mockFetch(() => Response.json({ token: 'restored', data: USER }))
    const auth = useAuthStore()

    await Promise.all([auth.restore(), auth.restore()])
    await auth.restore()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('換發進行中 restoring 是 true，做完變回 false', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    let resolve!: (r: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((r) => (resolve = r))),
    )
    const auth = useAuthStore()

    const pending = auth.restore()
    expect(auth.restoring).toBe(true)
    resolve(Response.json({ token: 'restored', data: USER }))
    await pending

    expect(auth.restoring).toBe(false)
    expect(auth.isAuthenticated).toBe(true)
  })
})

describe('useAuthStore：refresh()', () => {
  it('同時好幾個呼叫共用同一次換發（refresh token 單次使用，各換各的會互相作廢）', async () => {
    const fetchMock = mockFetch(() => Response.json({ token: 'fresh', data: USER }))
    const auth = useAuthStore()

    const results = await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()])

    expect(results).toEqual([true, true, true])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(auth.token).toBe('fresh')
  })
})
