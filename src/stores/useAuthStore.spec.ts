import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './useAuthStore'

// 登入／登出結果的提示（AuthNotice 顯示的 notice）。2026-10-03 起登入成功與否都要有提示，
// 以及重新整理後維持登入：restore()／refresh() 用 httpOnly refresh cookie 換回登入狀態。

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
  it('它應該在 OAuth 回呼成功時打 /auth/session 換正式 token，回傳 true，提示「已登入：名字」', async () => {
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

  it('它應該在 OAuth 回呼拿到 token 但換發失敗時回傳 false、不算登入、不提示成功', async () => {
    mockFetch(() => new Response(null, { status: 401 }))
    const auth = useAuthStore()
    expect(await auth.setTokenFromOAuthCallback('bad')).toBe(false)
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.notice).toBeNull()
  })

  it('它應該在 OAuth 回呼時後端連不上時同樣算失敗，token 不留著', async () => {
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

  it('它應該在帳密登入成功時帶 credentials 讓瀏覽器存下 refresh cookie，提示「已登入：名字」', async () => {
    const fetchMock = mockFetch(() => Response.json({ token: 't', expires_in: 900, data: USER }))
    const auth = useAuthStore()
    expect(await auth.login('j@example.com', 'pw')).toEqual({ ok: true })
    expect(auth.notice).toEqual({ tone: 'success', text: '已登入：Jerry' })
    expect(fetchMock.mock.calls[0]![1].credentials).toBe('include')
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })

  it('它應該在登出時帶 Bearer 跟 credentials，清掉登入狀態，提示「已登出」', async () => {
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

  it('它應該在登出時只打一次 /auth/logout，access token 過期也不先換發（後端靠 refresh cookie 就能撤銷）', async () => {
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
  ])('它應該在登出失敗（%s）時保留登入狀態跟旗標、顯示錯誤，不假裝已登出', async (label, handler) => {
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

  it('它應該在登出失敗後再按一次且這次成功時才清掉登入狀態', async () => {
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
  it('它應該稍等再重試一次，成功就算換發成功', async () => {
    let attempt = 0
    const fetchMock = mockFetch(() =>
      ++attempt === 1
        ? Response.json({ message: '登入狀態剛更新過，請重試。' }, { status: 409 })
        : Response.json({ token: 'after-retry', expires_in: 900, data: USER }),
    )
    const auth = useAuthStore()
    expect(await auth.refresh()).toBe('refreshed')
    expect(auth.token).toBe('after-retry')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('它應該只重試一次；重試還是 409 就當暫時失敗：不算登入，但保留旗標下次再試', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const fetchMock = mockFetch(() => new Response(null, { status: 409 }))
    const auth = useAuthStore()
    expect(await auth.refresh()).toBe('unavailable')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(auth.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })

  // 409 的重試跟 502 重試共用同一個時間上限（從第一次送出算起）：409 晚到時 cookie 可能還是
  // 舊的那支，重送可能落在後端寬限外，被當成 token 被偷、撤銷整個登入
  describe('跟 502 重試共用的總時間上限', () => {
    beforeEach(() => {
      // 只假造 Date：409 之後的等待用真的 setTimeout
      vi.useFakeTimers({ toFake: ['Date'] })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('它應該在 409 回來時已經超過上限就不重試，回 unavailable，保留目前的登入狀態跟旗標', async () => {
      window.localStorage.setItem(SESSION_HINT_KEY, '1')
      const fetchMock = mockFetch(() => {
        // 409 因為網路延遲 9.9 秒後才回來
        vi.setSystemTime(Date.now() + 9900)
        return new Response(null, { status: 409 })
      })
      const auth = useAuthStore()
      auth.token = 'expired'
      auth.user = USER

      expect(await auth.refresh()).toBe('unavailable')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(auth.token).toBe('expired')
      expect(auth.user).toEqual(USER)
      expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
    })

    it('它應該在 409 很快回來（還在上限內）時照樣重試，成功就算換發成功', async () => {
      let attempt = 0
      const fetchMock = mockFetch(() => {
        if (++attempt > 1) return Response.json({ token: 'after-retry', expires_in: 900, data: USER })
        vi.setSystemTime(Date.now() + 500)
        return new Response(null, { status: 409 })
      })
      const auth = useAuthStore()
      auth.token = 'expired'

      expect(await auth.refresh()).toBe('refreshed')
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(auth.token).toBe('after-retry')
    })
  })
})

describe('useAuthStore：restore()（重新整理後換回登入狀態）', () => {
  it('它應該在上次是登入狀態且 refresh cookie 有效時安靜地換回 token 跟使用者，不顯示提示', async () => {
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

  it('它應該在 refresh cookie 無效（401）時維持未登入、清掉旗標，不顯示提示', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    mockFetch(() => Response.json({ message: '登入已過期' }, { status: 401 }))
    const auth = useAuthStore()

    await auth.restore()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.notice).toBeNull()
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBeNull()
  })

  it('它應該在後端連不上時維持未登入，但保留旗標，下次開站再試', async () => {
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

  it('它應該在後端冷啟動回 502 時重試換發，重試成功就換回登入狀態', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    let attempt = 0
    const fetchMock = mockFetch(() =>
      ++attempt === 1
        ? new Response(null, { status: 502 })
        : Response.json({ token: 'restored', data: USER }),
    )
    const auth = useAuthStore()

    await auth.restore()

    expect(auth.token).toBe('restored')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('它應該在換發重試完仍暫時失敗時讓下一次 restore() 再試一次', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    let available = false
    mockFetch(() =>
      available
        ? Response.json({ token: 'restored', data: USER })
        : new Response(null, { status: 503 }),
    )
    const auth = useAuthStore()

    await auth.restore()
    expect(auth.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')

    available = true
    await auth.restore()
    expect(auth.token).toBe('restored')
  })

  it('它應該在沒有「上次是登入狀態」的旗標（一般訪客）時完全不打 API', async () => {
    const fetchMock = mockFetch(() => Response.json({}))
    const auth = useAuthStore()

    await auth.restore()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('它應該只跑一次，重複呼叫拿到同一個結果，不會重打', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const fetchMock = mockFetch(() => Response.json({ token: 'restored', data: USER }))
    const auth = useAuthStore()

    await Promise.all([auth.restore(), auth.restore()])
    await auth.restore()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('它應該在換發進行中讓 restoring 是 true，做完變回 false', async () => {
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
  it('它應該在同時好幾個呼叫時共用同一次換發（refresh token 單次使用，各換各的會互相作廢）', async () => {
    const fetchMock = mockFetch(() => Response.json({ token: 'fresh', data: USER }))
    const auth = useAuthStore()

    const results = await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()])

    expect(results).toEqual(['refreshed', 'refreshed', 'refreshed'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(auth.token).toBe('fresh')
  })

  it('它應該在 refresh cookie 無效（401）時回 unauthorized，清掉登入狀態跟旗標', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    mockFetch(() => new Response(null, { status: 401 }))
    const auth = useAuthStore()
    auth.token = 'expired'
    auth.user = USER

    expect(await auth.refresh()).toBe('unauthorized')
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBeNull()
  })

  it.each([
    ['後端連不上', () => {
      throw new TypeError('Failed to fetch')
    }],
    ['後端一直 503', () => new Response(null, { status: 503 })],
    ['後端 500', () => new Response(null, { status: 500 })],
    ['被限流 429', () => new Response(null, { status: 429 })],
  ])('它應該在暫時失敗（%s）時回 unavailable，保留目前的登入狀態跟旗標', async (label, handler) => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    mockFetch(handler)
    const auth = useAuthStore()
    auth.token = 'expired'
    auth.user = USER

    expect(await auth.refresh()).toBe('unavailable')
    expect(auth.token).toBe('expired')
    expect(auth.user).toEqual(USER)
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })

  it('它應該只重試 502／503／504，最多重試兩次', async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 504 }))
    const auth = useAuthStore()
    expect(await auth.refresh()).toBe('unavailable')
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const fetch500 = mockFetch(() => new Response(null, { status: 500 }))
    expect(await auth.refresh()).toBe('unavailable')
    expect(fetch500).toHaveBeenCalledTimes(1)
  })

  // 換發可能已經在後端做完、只是回應沒傳回來；重送同一支 refresh token 可能落在後端寬限外，
  // 被當成 token 被偷、撤銷整個登入
  it('它應該在網路層失敗（TypeError）時不重試換發', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const fetchMock = mockFetch(() => {
      throw new TypeError('Failed to fetch')
    })
    const auth = useAuthStore()
    auth.token = 'expired'

    expect(await auth.refresh()).toBe('unavailable')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(auth.token).toBe('expired')
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })

  describe('重試的總時間上限', () => {
    beforeEach(() => {
      // 只假造 Date：重試間隔在測試環境是 0，setTimeout 照常跑
      vi.useFakeTimers({ toFake: ['Date'] })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('它應該在從第一次送出算起超過時間上限時就不再重試 502，請求本身花的時間也算', async () => {
      const fetchMock = mockFetch(() => {
        // 每次換發請求都卡 2.5 秒才回 502：第二次回來時已經超過上限，不送第三次
        vi.setSystemTime(Date.now() + 2500)
        return new Response(null, { status: 502 })
      })
      const auth = useAuthStore()

      expect(await auth.refresh()).toBe('unavailable')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('它應該把排隊等 Web Locks 的時間也算進上限，等到鎖時已經超過就不送', async () => {
      let lockRequests = 0
      vi.stubGlobal('navigator', {
        locks: {
          request: async (...args: [string, () => Promise<unknown>]) => {
            // 第二次排隊等了 5 秒（例如另一個分頁正在換發）
            if (++lockRequests === 2) vi.setSystemTime(Date.now() + 5000)
            return args[1]()
          },
        },
      })
      const fetchMock = mockFetch(() => new Response(null, { status: 503 }))
      const auth = useAuthStore()

      expect(await auth.refresh()).toBe('unavailable')
      expect(lockRequests).toBe(2)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })
})

describe('useAuthStore：換發結果晚到時不蓋掉比較新的登入狀態', () => {
  /** /auth/refresh 先掛著，由測試決定什麼時候、回什麼；其他端點照 handler 立刻回 */
  function holdRefresh(handler: Handler) {
    const pending: Array<(r: Response) => void> = []
    const fetchMock = mockFetch((url, init) =>
      pathOf(url) === '/auth/refresh'
        ? new Promise<Response>((resolve) => pending.push(resolve))
        : handler(url, init),
    )
    return { fetchMock, pending }
  }

  it('它應該在換發進行中登出時丟掉晚到的換發結果，維持已登出', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const { pending } = holdRefresh(() => Response.json({ message: '已登出。' }))
    const auth = useAuthStore()
    auth.token = 'expired'
    auth.user = USER

    const refreshing = auth.refresh()
    expect(await auth.logout()).toBe(true)
    pending[0]!(Response.json({ token: 'late', data: USER }))

    expect(await refreshing).toBe('superseded')
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBeNull()
  })

  it.each([
    ['後端 503', () => new Response(null, { status: 503 })],
    ['後端連不上', () => {
      throw new TypeError('Failed to fetch')
    }],
  ])('它應該在換發進行中登出、換發之後暫時失敗（%s）時回 superseded，不說「仍是登入狀態」', async (label, lateRefresh) => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    const fetchMock = mockFetch(async (url) => {
      if (pathOf(url) !== '/auth/refresh') return Response.json({ message: '已登出。' })
      await held
      return lateRefresh()
    })
    const auth = useAuthStore()
    auth.token = 'expired'
    auth.user = USER

    const refreshing = auth.refresh()
    expect(await auth.logout()).toBe(true)
    release()

    const outcome = await refreshing
    // 登出之後不再重試換發：瀏覽器這時已經沒有這次登入的 refresh cookie 了
    expect(fetchMock.mock.calls.filter(([url]) => pathOf(url) === '/auth/refresh')).toHaveLength(1)
    expect(auth.token).toBeNull()
    expect(outcome).toBe('superseded')
  })

  it('它應該在換發進行中換成別的登入、舊的換發回 401 時回 superseded，不回 refreshed', async () => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const USER_B = { id: 2, name: 'B', email: 'b@example.com' }
    const { pending } = holdRefresh(() => Response.json({ token: 'B', data: USER_B }))
    const auth = useAuthStore()
    auth.token = 'A'
    auth.user = USER

    const refreshing = auth.refresh()
    await auth.login('b@example.com', 'pw')
    pending[0]!(new Response(null, { status: 401 }))

    // 回 refreshed 的話，呼叫端會拿 B 的 token 重送 A 的請求
    expect(await refreshing).toBe('superseded')
    expect(auth.token).toBe('B')
    expect(auth.user).toEqual(USER_B)
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })

  it('它應該在 502 重試的等待期間登入狀態換掉時不再重試，不用掉新登入的 refresh cookie', async () => {
    let refreshCalls = 0
    const auth = useAuthStore()
    auth.token = 'A'
    mockFetch(async (url) => {
      if (pathOf(url) === '/auth/login') return Response.json({ token: 'B', data: USER })
      refreshCalls++
      // 第一次換發回 502 之前，使用者已經用別的帳號登入了
      await auth.login('b@example.com', 'pw')
      return new Response(null, { status: 502 })
    })

    const outcome = await auth.refresh()
    expect(refreshCalls).toBe(1)
    expect(auth.token).toBe('B')
    expect(outcome).toBe('superseded')
  })

  it.each([
    ['換發成功', () => Response.json({ token: 'old-family', data: USER })],
    ['換發 401', () => new Response(null, { status: 401 })],
  ])('它應該在開機的 restore() 比 OAuth 登入晚回來（%s）時保留 OAuth 登入的狀態', async (label, lateRefresh) => {
    window.localStorage.setItem(SESSION_HINT_KEY, '1')
    const { pending } = holdRefresh(() => Response.json({ token: 'oauth', data: USER }))
    const auth = useAuthStore()

    const restoring = auth.restore()
    expect(await auth.setTokenFromOAuthCallback('callback-token')).toBe(true)
    pending[0]!(lateRefresh())
    await restoring

    expect(auth.token).toBe('oauth')
    expect(auth.user).toEqual(USER)
    expect(window.localStorage.getItem(SESSION_HINT_KEY)).toBe('1')
  })

  it('它應該在登入狀態換過之後另外送一次換發，不共用舊的那次', async () => {
    const { fetchMock, pending } = holdRefresh(() => Response.json({ token: 'login', data: USER }))
    const auth = useAuthStore()

    const first = auth.refresh()
    await auth.login('j@example.com', 'pw')
    const second = auth.refresh()

    // Pinia 的 action 每次呼叫都包一個新的 Promise，比對 Promise 本身看不出有沒有共用；
    // 要看實際送了幾次換發，以及兩個呼叫是不是各自跟著自己那次換發結束
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => pathOf(url) === '/auth/refresh')
    expect(refreshCalls).toHaveLength(2)
    let firstSettled = false
    void first.then(() => (firstSettled = true))
    pending[1]!(Response.json({ token: 'fresh', data: USER }))
    expect(await second).toBe('refreshed')
    expect(firstSettled).toBe(false)
    expect(auth.token).toBe('fresh')

    pending[0]!(Response.json({ token: 'stale', data: USER }))
    expect(await first).toBe('superseded')
    expect(auth.token).toBe('fresh')
  })

  it('它應該在舊登入的換發晚回來時不把新登入進行中的換發清掉，第三個呼叫照樣共用新的那次', async () => {
    const { fetchMock, pending } = holdRefresh(() => Response.json({ token: 'login', data: USER }))
    const auth = useAuthStore()
    const refreshCalls = () =>
      fetchMock.mock.calls.filter(([url]) => pathOf(url) === '/auth/refresh').length

    const first = auth.refresh()
    await auth.login('j@example.com', 'pw')
    const second = auth.refresh()
    pending[0]!(Response.json({ token: 'stale', data: USER }))
    expect(await first).toBe('superseded')

    // 舊的那次結束時如果把進行中的登記一起清掉，這裡會再送一次換發，跟 second 用同一顆
    // cookie 撞在一起（refresh token 單次使用，會互相作廢）
    const third = auth.refresh()
    expect(refreshCalls()).toBe(2)

    pending[1]!(Response.json({ token: 'fresh', data: USER }))
    expect(await second).toBe('refreshed')
    expect(await third).toBe('refreshed')
    expect(auth.token).toBe('fresh')
  })
})
