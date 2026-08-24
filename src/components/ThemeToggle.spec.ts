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

  it('預設顯示「晝間」文字（目前是 library 主題，按下去會切成晝間）', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    expect(wrapper.text()).toContain('晝間')
  })

  it('點擊後切換主題，按鈕文字跟著變成「夜讀」', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('夜讀')
    expect(document.documentElement.classList.contains('theme-terminal')).toBe(true)
  })

  it('aria-label 會隨主題切換更新', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    expect(wrapper.find('button').attributes('aria-label')).toBe('切換成夜讀主題')

    await wrapper.find('button').trigger('click')

    expect(wrapper.find('button').attributes('aria-label')).toBe('切換成晝間主題')
  })
})
