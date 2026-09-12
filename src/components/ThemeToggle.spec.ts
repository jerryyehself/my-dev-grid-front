import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// ThemeToggle 底下用的 useTheme composable 是模組層級單例（見
// useTheme.spec.ts 的說明），這裡一樣要 vi.resetModules() + 動態
// import 才能讓每個測試案例拿到乾淨的初始主題狀態。
async function freshThemeToggle() {
  vi.resetModules()
  const mod = await import('./ThemeToggle.vue')
  return mod.default
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('theme-terminal')
    localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.classList.remove('theme-terminal')
    localStorage.clear()
  })

  it('預設顯示「☀ 淺色」（目前是 library 主題）', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    expect(wrapper.text()).toContain('☀')
    expect(wrapper.text()).toContain('淺色')
  })

  it('點擊後切換主題，圖示與文字跟著變成「☽ 深色」', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('☽')
    expect(wrapper.text()).toContain('深色')
    expect(document.documentElement.classList.contains('theme-terminal')).toBe(true)
  })

  it('aria-pressed 會隨主題切換更新（深色主題＝pressed）', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    expect(wrapper.find('button').attributes('aria-pressed')).toBe('false')

    await wrapper.find('button').trigger('click')

    expect(wrapper.find('button').attributes('aria-pressed')).toBe('true')
  })
})
