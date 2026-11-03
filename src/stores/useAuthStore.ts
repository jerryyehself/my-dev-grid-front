import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface AuthUser {
  id: number
  name: string
  email: string
}

/** 登入／登出結果的提示（AuthNotice.vue 顯示）。2026-10-03 起登入成功與否都要有提示 */
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
 * 換發碰到 502／503／504 時重試的等待時間（毫秒），陣列長度就是重試次數。後端 Cloud Run
 * 冷啟動時前一兩個請求會 502（跟 api/client.ts 的 RETRY_DELAYS_MS 同一個原因）：開站的
 * restore() 只換發一次，碰到就會被當成沒登入。測試環境不等。
 *
 * 重送換發會再送一次同一支 refresh token。後端只在「上一次用掉它」之後的寬限秒數內
 * （預設 10 秒）把重送當成正常重試；超過就當成 token 被偷，撤銷整個登入。所以：
 * - 網路層失敗（fetch 丟 TypeError）不重試：請求可能已經到後端、換發也做完了，只是回應
 *   沒傳回來，不知道什麼時候做完的，重送可能已經在寬限外。
 * - 502／503／504 才重試，而且從第一次送出算起超過 REFRESH_RETRY_BUDGET_MS 就不再送。
 *   這個時間包含每次請求本身花的時間跟排隊等 Web Locks 的時間，不是只算等待間隔——
 *   光看等待間隔加總保證不了什麼，請求本身可能就卡了好幾秒。
 */
const REFRESH_RETRY_DELAYS_MS = import.meta.env.MODE === 'test' ? [0, 0] : [800, 2000]
const REFRESH_RETRYABLE_STATUS = new Set([502, 503, 504])
export const REFRESH_RETRY_BUDGET_MS = 4000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 換發的結果：
 * - `refreshed`：換到新的 access token，而且這段期間還是同一次登入。
 * - `unauthorized`：refresh cookie 無效、過期或被撤銷（後端 401），登入狀態已清掉，要重新登入。
 * - `unavailable`：連不上後端、後端暫時出錯（5xx、429），或 409 重試後還是 409
 *   （409 回來時已經超過 REFRESH_RETRY_BUDGET_MS 就不重試，也是這個）。
 *   後端那邊的登入多半還活著，所以不清登入狀態、不清旗標，呼叫端當成「稍後再試」。
 * - `superseded`：換發期間登入狀態換掉了（登出、重新登入、換帳號，見 loginGeneration），
 *   結果直接丟掉。原本的請求是上一次登入送的，呼叫端不能拿目前的 token 重送，也不要登出。
 */
export type RefreshOutcome = 'refreshed' | 'unauthorized' | 'unavailable' | 'superseded'

/** sendRefresh 在出發前就發現登入狀態換掉了，沒有送出 */
const SUPERSEDED = Symbol('superseded')

/**
 * 帳密登入失敗、但不是帳號密碼錯的時候顯示的訊息（登入頁看得到，照 copy-language
 * 的錯誤訊息格式：發生什麼事、該怎麼做）。跟「請確認帳號密碼」分開，免得使用者以為打錯了。
 */
export const LOGIN_ERROR_MESSAGES = {
  network: '登入失敗：連不上伺服器，請確認網路連線後再試一次。',
  server: '登入失敗：伺服器暫時出了問題，請稍後再試一次。',
} as const

/**
 * Access token 只存在記憶體裡（一個 ref），不落 localStorage/sessionStorage——
 * 跨 origin 的 Sanctum API token 模式（D-56），token 存
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

  /**
   * 登入世代：「是哪一次登入」的編號。登入（帳密、OAuth、開站從沒有 token 換回登入狀態）
   * 跟清掉登入狀態（登出、換發確定失效、請求確定沒登入）都 +1；同一次登入裡換發 access
   * token 不變。
   *
   * 用途有兩個：
   * - 換發出發時記下世代，回來時世代變了（等待期間使用者登出，或 OAuth 回呼／帳密登入換上了
   *   新的登入）就把結果丟掉，不讓晚到的舊結果蓋掉比較新的狀態。main.ts 開機的 restore()
   *   不 await，它的換發可能比 OAuth 回呼的 /auth/session 晚回來。
   * - api/client.ts 每個請求送出時記下世代，401 回來時世代變了就不重送：那個請求是上一次
   *   登入（可能是另一個帳號）送的，拿目前的 token 重送等於用別人的身分做原本的操作。
   *
   * 所有寫入、清掉登入狀態的地方都要經過 startSession／rotateSession／clearSession，
   * 不要直接改 token、user，不然世代不會更新，上面兩個保護都會失效。
   */
  let loginGeneration = 0

  function writeSession(body: TokenPairResponse) {
    token.value = body.token
    user.value = body.data
    writeSessionHint(true)
  }

  /** 換上一次新的登入 */
  function startSession(body: TokenPairResponse) {
    loginGeneration++
    writeSession(body)
  }

  /** 換發成功：原本就有 token 是同一次登入換新 token，世代不變；原本沒有就是換回登入狀態，算新的一次 */
  function rotateSession(body: TokenPairResponse) {
    if (token.value === null) loginGeneration++
    writeSession(body)
  }

  /** 清掉登入狀態跟旗標。api/client.ts 確定請求沒登入時也呼叫這支 */
  function clearSession() {
    loginGeneration++
    token.value = null
    user.value = null
    writeSessionHint(false)
  }

  /** 目前的登入世代（見 loginGeneration） */
  function currentLoginGeneration(): number {
    return loginGeneration
  }

  /** 進行中的換發，跟它出發時的世代。世代變了就不共用，另外送一次 */
  let refreshInFlight: { generation: number; promise: Promise<RefreshOutcome> } | null = null

  /**
   * 送一次換發；502／503／504 照 REFRESH_RETRY_DELAYS_MS 重試，從 startedAt 算起的總時間
   * 不超過 REFRESH_RETRY_BUDGET_MS。網路層失敗直接往外丟，不重試（原因見 REFRESH_RETRY_DELAYS_MS）。
   *
   * startedAt 是整次換發（含 409 之後的重試）第一次送出前的時間，所有重送共用同一個上限。
   * `initial` 是這次之前已經拿到的回應（409 重試時傳那個 409）：有的話，第一次送出前也要
   * 檢查上限，超過就不送，直接回它。
   *
   * 每次送出前（拿到 Web Locks 之後）先看登入狀態有沒有換掉：換掉了就不送。瀏覽器這時帶的
   * 已經是新登入的 refresh cookie，送出去會用掉新登入的 refresh token，換回來的結果又會被
   * 丟掉，新登入手上那支 access token 也跟著被後端作廢。
   */
  async function sendRefresh(
    superseded: () => boolean,
    startedAt: number,
    initial: Response | null = null,
  ): Promise<Response | typeof SUPERSEDED> {
    let last: Response | null = initial
    for (let attempt = 0; ; attempt++) {
      const previous: Response | null = last
      const res = await withRefreshLock(async (): Promise<Response | typeof SUPERSEDED> => {
        if (superseded()) return SUPERSEDED
        // 排隊等鎖的時間也算：等到的時候已經超過預算就不送，回上一次的結果
        if (previous && Date.now() - startedAt > REFRESH_RETRY_BUDGET_MS) return previous
        return fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
      })
      if (res === SUPERSEDED || res === previous) return res
      last = res
      const delay = REFRESH_RETRY_DELAYS_MS[attempt]
      if (!REFRESH_RETRYABLE_STATUS.has(res.status) || delay === undefined) return res
      if (Date.now() - startedAt + delay > REFRESH_RETRY_BUDGET_MS) return res
      await sleep(delay)
    }
  }

  /**
   * 用 refresh cookie 換一組新的 token。同一個分頁同時有好幾個請求 401 時，
   * 共用同一次換發（refresh token 單次使用，各換各的只會互相作廢）。
   * 結果分四種（見 RefreshOutcome）：只有後端明確回 401 才清掉登入狀態；
   * 暫時失敗不動目前的登入狀態，旗標也保留，下次開站還會再試。
   * 換發期間登入世代變了，不管後端回什麼（成功、401、5xx、連不上）都不寫入，回 superseded。
   */
  function refresh(): Promise<RefreshOutcome> {
    if (refreshInFlight?.generation === loginGeneration) return refreshInFlight.promise

    const generation = loginGeneration
    const superseded = () => generation !== loginGeneration

    const flight: { generation: number; promise: Promise<RefreshOutcome> } = {
      generation,
      promise: run(),
    }
    refreshInFlight = flight
    return flight.promise

    // finally 讀得到 flight：async 函式至少 await 一次才會跑到 finally，那時上面已經指定好了
    async function run(): Promise<RefreshOutcome> {
      try {
        const startedAt = Date.now()
        let res = await sendRefresh(superseded, startedAt)
        // 409：同一支 refresh token 剛被另一個分頁用掉，稍等用新 cookie 重試一次。
        // 重試還是 409 就當成暫時失敗（下面的 unavailable）。重試跟上面共用同一個時間上限：
        // 409 晚到、已經超過上限就不送（cookie 若還是舊的那支，可能已經在後端寬限外），
        // sendRefresh 直接回這個 409，下面當成 unavailable
        if (res !== SUPERSEDED && res.status === 409) {
          await sleep(REFRESH_CONFLICT_RETRY_MS)
          res = await sendRefresh(superseded, startedAt, res)
        }
        if (res === SUPERSEDED || superseded()) return 'superseded'
        if (res.status === 401) {
          clearSession()
          return 'unauthorized'
        }
        if (!res.ok) return 'unavailable'
        const body: TokenPairResponse = await res.json()
        if (superseded()) return 'superseded'
        rotateSession(body)
        return 'refreshed'
      } catch {
        return superseded() ? 'superseded' : 'unavailable'
      } finally {
        // 只清自己這一筆：世代換過之後，新世代的換發可能已經登記在這裡
        if (refreshInFlight === flight) refreshInFlight = null
      }
    }
  }

  let restorePromise: Promise<void> | null = null

  /**
   * 開機時呼叫一次（main.ts），之後重複呼叫拿到的都是同一個 Promise——
   * 路由守衛在進 requiresAuth 頁面前 await 它，整頁重新整理 /admin 才不會
   * 先被當成未登入導去 /login。成功失敗都不顯示提示：這是背景動作，不是使用者按的登入。
   * 換發暫時失敗（重試完還是連不上）時清掉快取的 Promise，下一次呼叫（路由守衛下次
   * 進需要登入的頁面）會再試一次，不會整個分頁都卡在未登入。換發期間已經登入或登出
   * （superseded）就不用再試了。
   */
  function restore(): Promise<void> {
    restorePromise ??= (async () => {
      if (token.value || !readSessionHint()) return
      restoring.value = true
      try {
        if ((await refresh()) === 'unavailable') restorePromise = null
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
    let res: Response
    try {
      res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    } catch {
      return { ok: false, message: LOGIN_ERROR_MESSAGES.network }
    }

    // 5xx（含冷啟動的 502）跟帳號密碼無關，不能顯示「請確認帳號密碼」，也不顯示後端的
    // 英文訊息（例如 Server Error）
    if (res.status >= 500) return { ok: false, message: LOGIN_ERROR_MESSAGES.server }

    if (!res.ok) {
      const body: { message?: string; errors?: Record<string, string[] | string> } = await res
        .json()
        .catch(() => ({}))
      const message =
        body.message || Object.values(body.errors ?? {})[0]?.[0] || '登入失敗，請確認帳號密碼'
      return { ok: false, message }
    }

    startSession(await res.json())
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
      startSession(await res.json())
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
    clearSession,
    currentLoginGeneration,
  }
})
