import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// useTheme.ts 裡的 `theme` 是模組層級的單例 ref，在 import 當下就依照
// document.documentElement 的 class 決定初始值——每個測試都要用
// vi.resetModules() + 動態 import 拿到全新的模組實例，不然測試之間會
// 共用同一個 theme.value，彼此互相干擾。
async function freshUseTheme() {
  vi.resetModules()
  const mod = await import('./useTheme')
  return mod.useTheme
}

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('theme-terminal')
    localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.classList.remove('theme-terminal')
    localStorage.clear()
  })

  it('初始狀態是 library', async () => {
    const useTheme = await freshUseTheme()
    const { theme } = useTheme()

    expect(theme.value).toBe('library')
  })

  it('toggleTheme 會把 library 切成 terminal，並掛上對應的 class', async () => {
    const useTheme = await freshUseTheme()
    const { theme, toggleTheme } = useTheme()

    toggleTheme()

    expect(theme.value).toBe('terminal')
    expect(document.documentElement.classList.contains('theme-terminal')).toBe(true)
  })

  it('連續呼叫兩次 toggleTheme 會切回原本的主題', async () => {
    const useTheme = await freshUseTheme()
    const { theme, toggleTheme } = useTheme()

    toggleTheme()
    toggleTheme()

    expect(theme.value).toBe('library')
    expect(document.documentElement.classList.contains('theme-terminal')).toBe(false)
  })

  it('toggleTheme 後會把選擇寫進 localStorage', async () => {
    const useTheme = await freshUseTheme()
    const { toggleTheme } = useTheme()

    toggleTheme()

    expect(localStorage.getItem('theme')).toBe('terminal')
  })

  it('文件上已經是 terminal 主題時，初始狀態要讀成 terminal', async () => {
    document.documentElement.classList.add('theme-terminal')
    const useTheme = await freshUseTheme()
    const { theme } = useTheme()

    expect(theme.value).toBe('terminal')
  })
})
