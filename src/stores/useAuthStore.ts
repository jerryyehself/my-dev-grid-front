import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface AuthUser {
  id: number
  name: string
  email: string
}

/** 登入／登出結果的提示（AuthNotice.vue 顯示）。2026-10-03 使用者：「登入成功與否要有提示」 */
export interface AuthNotice {
  tone: 'success' | 'error'
  text: string
}

/** 後端登入／換發端點共用的回應形狀（`expires_in` 是 access token 還剩幾秒） */
interface TokenPairResponse {
  token: string
  expires_in?: number | null
  data: AuthUser
}

/**
 * 「這個瀏覽器上次是登入狀態」的提示旗標，存在 localStorage。裡面沒有任何秘密
 * （只有 '1'），真正的憑證是後端設的 httpOnly refresh cookie，JS 讀不到也不用讀。
 * 用途只有一個：訪客（絕大多數人）開站時不用白打一次 POST /auth/refresh 拿 401——
 * 那會讓每個訪客的主控台都多一行紅字，也白白消耗 refresh 的 rate limit 額度。
 * 旗標不見了（清掉網站資料、無痕視窗）最壞只是要重新登入，不會有安全問題。
 */
const SESSION_HINT_KEY = 'mdg_auth_session'

function readSessionHint(): boolean {
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

function writeSessionHint(on: boolean) {
  try {
    if (on) window.localStorage.setItem(SESSION_HINT_KEY, '1')
    else window.localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    // 儲存空間被封鎖時就當沒有旗標，最壞是下次要重新登入
  }
}

/**
 * 同一個瀏覽器的多個分頁共用同一顆 refresh cookie，而 refresh token 是單次使用：
 * 用 Web Locks 讓同一個 origin 的換發排隊，後到的分頁等前一個做完才送，
 * 送出時帶的已經是新的 cookie。
 * 不支援 Web Locks 的環境（舊瀏覽器、jsdom）就直接送：兩個分頁撞在一起時，後端在
 * 寬限秒數內認得出是同一支剛被用掉，不當成被偷——通常直接從剛換出來的那支接著換發給
 * 後到的請求；三個以上撞在一起才會有人拿到 409（不清 cookie），refresh() 稍等用新
 * cookie 重試一次（REFRESH_CONFLICT_RETRY_MS）。
 */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks ? locks.request('mdg-auth-refresh', task) : task()
}

/**
 * 換發收到 409 之後等多久再重試一次（毫秒）。409 是後端說「這支 refresh token 幾秒前
 * 剛被別的請求用掉，從它換出來的那支也已經用掉了」——沒有 Web Locks 時好幾個請求同時換發才會發生。
 * 這時瀏覽器的 cookie 多半已經（或馬上就會）被先到那個的回應換成新值，稍等再用新 cookie
 * 換一次就好。後端刻意不在 409 清 cookie，也不撤銷整個登入（見後端 RefreshTokenFamilies）。
 */
export const REFRESH_CONFLICT_RETRY_MS = 300

/**
 * Access token 只存在記憶體裡（一個 ref），不落 localStorage/sessionStorage——
 * 跨 origin 的 Sanctum API token 模式（decision-register.md D-56），token 存
 * Web Storage 的話任何跑在頁面上的 script（含 XSS 注入）都能直接讀到。
 *
 * 「重新整理後維持登入」靠的是後端另外發的 refresh token：它放在 API 網域的
 * httpOnly＋Partitioned cookie 裡，JS 碰不到。整頁重新整理後記憶體裡的 access
 * token 沒了，開機時 restore() 打 POST /auth/refresh（`credentials: 'include'`
 * 讓瀏覽器帶上那顆 cookie）換回一支新的 access token 跟使用者資料。
 * access token 只活 15 分鐘，過期時 api/client.ts 收到 401 會呼叫 refresh() 換新的再重送一次。
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)

  const notice = ref<AuthNotice | null>(null)

  /** 開機時正在用 refresh cookie 換回登入狀態——這段期間不要把畫面畫成「未登入」 */
  const restoring = ref(false)

  const isAuthenticated = computed(() => token.value !== null)

  /** 導覽列、提示用的顯示名稱：有名字用名字，沒有退回 email */
  const displayName = computed(() => user.value?.name || user.value?.email || '')

  function setNotice(next: AuthNotice | null) {
    notice.value = next
  }

  const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

  function authHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  function applySession(body: TokenPairResponse) {
    token.value = body.token
    user.value = body.data
    writeSessionHint(true)
  }

  function clearSession() {
    token.value = null
    user.value = null
    writeSessionHint(false)
  }

  let refreshInFlight: Promise<boolean> | null = null

  /**
   * 用 refresh cookie 換一組新的 token。同一個分頁同時有好幾個請求 401 時，
   * 共用同一次換發（refresh token 單次使用，各換各的只會互相作廢）。
   * 成功回 true；cookie 無效／過期（401）會清掉登入狀態，回 false。
   * 網路斷線或後端暫時出錯（5xx、429）也回 false，但保留「上次是登入狀態」的旗標，
   * 下次開站還會再試。
   */
  function refresh(): Promise<boolean> {
    refreshInFlight ??= (async () => {
      try {
        const send = () =>
          withRefreshLock(() =>
            fetch(`${BASE_URL}/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
              headers: { Accept: 'application/json' },
            }),
          )
        let res = await send()
        // 409：同一支 refresh token 剛被另一個分頁用掉，稍等用新 cookie 重試一次。
        // 重試還是 409 就當成暫時失敗（下面的非 401 分支：保留旗標、下次再試）
        if (res.status === 409) {
          await new Promise((resolve) => setTimeout(resolve, REFRESH_CONFLICT_RETRY_MS))
          res = await send()
        }
        if (!res.ok) {
          if (res.status === 401) clearSession()
          else {
            token.value = null
            user.value = null
          }
          return false
        }
        applySession(await res.json())
        return true
      } catch {
        token.value = null
        user.value = null
        return false
      } finally {
        refreshInFlight = null
      }
    })()
    return refreshInFlight
  }

  let restorePromise: Promise<void> | null = null

  /**
   * 開機時呼叫一次（main.ts），之後重複呼叫拿到的都是同一個 Promise——
   * 路由守衛在進 requiresAuth 頁面前 await 它，整頁重新整理 /admin 才不會
   * 先被當成未登入導去 /login。成功失敗都不顯示提示：這是背景動作，不是使用者按的登入。
   */
  function restore(): Promise<void> {
    restorePromise ??= (async () => {
      if (token.value || !readSessionHint()) return
      restoring.value = true
      try {
        await refresh()
      } finally {
        restoring.value = false
      }
    })()
    return restorePromise
  }

  async function login(
    email: string,
    password: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    // credentials: 'include'：跨 origin 的回應要讓瀏覽器存下 refresh cookie，一定要帶
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const body: { message?: string; errors?: Record<string, string[] | string> } = await res
        .json()
        .catch(() => ({}))
      const message =
        body.message || Object.values(body.errors ?? {})[0]?.[0] || '登入失敗，請確認帳號密碼'
      return { ok: false, message }
    }

    applySession(await res.json())
    notice.value = { tone: 'success', text: `已登入：${displayName.value}` }
    return { ok: true }
  }

  /**
   * OAuth 回呼把短效 token 放在 URL fragment（AuthCallbackView 呼叫這支）。
   * 這支 token 不直接拿來用：先打 POST /auth/session 換成正式的 access token，
   * 同一個回應會設定 refresh cookie。為什麼要多這一步：後端在 OAuth 回呼（run.app
   * 的頂層頁面）設的 Partitioned cookie 會存進 run.app 自己的分區，在這個網站裡讀
   * 不到；要在這個網站的頁面裡用 fetch 拿到的 cookie 才會落在正確的分區。
   *
   * 回傳是否真的登入成功：換發失敗（token 無效、後端掛了）也算失敗——以前這種情況
   * 會安靜地導回首頁，看起來像什麼都沒發生。
   */
  async function setTokenFromOAuthCallback(callbackToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/auth/session`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', Authorization: `Bearer ${callbackToken}` },
      })
      if (!res.ok) {
        clearSession()
        return false
      }
      applySession(await res.json())
    } catch {
      clearSession()
      return false
    }
    notice.value = { tone: 'success', text: `已登入：${displayName.value}` }
    return true
  }

  /**
   * 登出：帶 Bearer（如果還有）跟 refresh cookie（credentials: 'include'）。後端兩個任一個
   * 有效就撤銷這次登入的所有 token、清 cookie——access token 閒置過期了也不用先換發。
   *
   * 只有後端確認（2xx）才清掉前端的登入狀態。連不上、5xx、429 時伺服器上的 refresh
   * token 還活著：這時把畫面改成「已登出」是騙人的——重新整理會自動登入回來，在共用電腦上
   * 下一個人也能這樣進來。所以保留登入狀態，顯示錯誤，讓使用者再按一次登出。
   * 回傳是否真的登出了。
   */
  async function logout(): Promise<boolean> {
    let ok = false
    try {
      const res = await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', ...authHeaders() },
      })
      ok = res.ok
    } catch {
      // 連不上後端：當成登出失敗
    }

    if (!ok) {
      notice.value = { tone: 'error', text: '登出失敗，目前仍是登入狀態，請再按一次登出' }
      return false
    }

    clearSession()
    notice.value = { tone: 'success', text: '已登出' }
    return true
  }

  return {
    token,
    user,
    isAuthenticated,
    restoring,
    displayName,
    notice,
    setNotice,
    login,
    logout,
    refresh,
    restore,
    setTokenFromOAuthCallback,
  }
})
