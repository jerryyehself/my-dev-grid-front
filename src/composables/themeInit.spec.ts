import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// public/theme-init.js 是畫面繪製前同步執行的一般 script（不是 module，沒辦法 import），
// 這裡把檔案內容讀進來，塞進 <script> 元素在 jsdom 的 window／document 上執行，
// 驗證「localStorage 的選擇、舊值轉換、第一次造訪照系統設定」三條路。
const source = readFileSync(resolve(process.cwd(), 'public/theme-init.js'), 'utf-8')

// <script> 在 jsdom 自己的 window 裡執行，跟 vitest 的全域 window 不是同一個物件，
// 從外面替換 matchMedia 它看不到，所以把系統偏好的替身寫在 script 文字的最前面一起執行。
function runThemeInit(prefersDark: boolean) {
  const script = document.createElement('script')
  script.textContent = `window.matchMedia = function (q) {
    return { matches: q === '(prefers-color-scheme: dark)' && ${prefersDark} }
  };\n${source}`
  document.head.appendChild(script)
  script.remove()
}

function isDark() {
  return document.documentElement.classList.contains('theme-dark')
}

describe('theme-init.js', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('theme-dark')
    localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.classList.remove('theme-dark')
    localStorage.clear()
  })

  it('它應該在第一次造訪、系統偏好深色時掛上 theme-dark，且不寫進 localStorage', () => {
    runThemeInit(true)

    expect(isDark()).toBe(true)
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('它應該在第一次造訪、系統偏好淺色時不掛 theme-dark', () => {
    runThemeInit(false)

    expect(isDark()).toBe(false)
  })

  it('它應該在使用者切換過時以記住的選擇為準，不管系統偏好', () => {
    localStorage.setItem('theme', 'light')
    runThemeInit(true)

    expect(isDark()).toBe(false)
  })

  it('它應該把舊值 terminal 讀成 dark，並把 localStorage 改寫成新值', () => {
    localStorage.setItem('theme', 'terminal')
    runThemeInit(false)

    expect(isDark()).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('它應該把舊值 library 讀成 light，即使系統偏好深色也維持淺色，並改寫成新值', () => {
    localStorage.setItem('theme', 'library')
    runThemeInit(true)

    expect(isDark()).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('它應該把認不得的值當作沒記過，照系統偏好', () => {
    localStorage.setItem('theme', 'banana')
    runThemeInit(true)

    expect(isDark()).toBe(true)
  })

  it('它應該包在 IIFE 裡，不在 window 上留下 stored／theme 全域變數', () => {
    localStorage.setItem('theme', 'dark')
    runThemeInit(false)

    expect('stored' in window).toBe(false)
    expect('theme' in window).toBe(false)
  })

  it('它應該在 setItem 寫入失敗時，仍然套用剛讀到的舊值', () => {
    localStorage.setItem('theme', 'terminal')
    // 讓 setItem 丟錯（模擬額度滿了）；script 在 jsdom 同一個 window，Storage.prototype 是共用的
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    try {
      runThemeInit(false)
    } finally {
      spy.mockRestore()
    }

    expect(isDark()).toBe(true)
    expect(localStorage.getItem('theme')).toBe('terminal')
  })
})
