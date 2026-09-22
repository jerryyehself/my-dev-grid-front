import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface AuthUser {
  id: number
  name: string
  email: string
}

/**
 * Token 故意只存在記憶體裡（一個 ref），不落 localStorage/sessionStorage——
 * 這個專案是跨 origin 的 Sanctum API token 模式（decision-register.md D-56），
 * token 存 Web Storage 的話，任何跑在頁面上的 script（含 XSS 注入）都能直接
 * 讀到；存記憶體代表整頁重新整理就會登出，這是刻意的取捨，不是遺漏——
 * 見 daily-claude-summary/reports/frontend-build-tooling-qa.md 對這個
 * 權衡的完整說明。之後如果要做「記得我」，該加的是 refresh token（httpOnly
 * cookie）機制，不是把這支 access token 改存 localStorage。
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const checked = ref(false)

  const isAuthenticated = computed(() => token.value !== null)

  const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

  function authHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  /** 開機時沒有 token 就一定是未登入——沒有 session 可以問後端「我是誰」。 */
  async function checkAuth() {
    if (!token.value) {
      user.value = null
      checked.value = true
      return
    }
    await fetchCurrentUser()
    checked.value = true
  }

  async function fetchCurrentUser() {
    try {
      const res = await fetch(`${BASE_URL}/user`, { headers: authHeaders() })
      user.value = res.ok ? await res.json() : null
      if (!res.ok) token.value = null
    } catch {
      user.value = null
    }
  }

  async function login(
    email: string,
    password: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
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

    const body = await res.json()
    token.value = body.token
    user.value = body.data
    return { ok: true }
  }

  /** OAuth 回呼把 token 放在 URL fragment（AuthCallbackView 呼叫這支）。 */
  async function setTokenFromOAuthCallback(newToken: string) {
    token.value = newToken
    await fetchCurrentUser()
  }

  async function logout() {
    await fetch(`${BASE_URL}/auth/logout`, { method: 'POST', headers: authHeaders() }).catch(
      () => {},
    )
    token.value = null
    user.value = null
  }

  return {
    token,
    user,
    checked,
    isAuthenticated,
    checkAuth,
    login,
    logout,
    setTokenFromOAuthCallback,
  }
})
