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
    document.documentElement.classList.remove('theme-dark')
    localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.classList.remove('theme-dark')
    localStorage.clear()
  })

  it('它應該預設是明亮模式（light）：「明亮模式」被按下、「暗黑模式」沒有', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    const on = wrapper.findAll('button')[0]!
    const off = wrapper.findAll('button')[1]!
    expect(on.text()).toBe('明亮模式')
    expect(off.text()).toBe('暗黑模式')
    expect(on.attributes('aria-pressed')).toBe('true')
    expect(off.attributes('aria-pressed')).toBe('false')
  })

  it('它應該用 group 包起來並帶上名稱，讓螢幕閱讀器讀得出這是顯示模式切換', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    const group = wrapper.find('[role="group"]')
    expect(group.attributes('aria-label')).toBe('顯示模式')
  })

  it('它應該在點「暗黑模式」後切成 dark、掛上 theme-dark、aria-pressed 跟著換', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    await wrapper.findAll('button')[1]!.trigger('click')

    const on = wrapper.findAll('button')[0]!
    const off = wrapper.findAll('button')[1]!
    expect(on.attributes('aria-pressed')).toBe('false')
    expect(off.attributes('aria-pressed')).toBe('true')
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('它應該在點「明亮模式」後切回 light、拿掉 theme-dark', async () => {
    document.documentElement.classList.add('theme-dark')
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    await wrapper.findAll('button')[0]!.trigger('click')

    expect(document.documentElement.classList.contains('theme-dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('它應該在已是目前主題時再點同一顆不改變狀態', async () => {
    const ThemeToggle = await freshThemeToggle()
    const wrapper = mount(ThemeToggle)

    await wrapper.findAll('button')[0]!.trigger('click')

    expect(wrapper.findAll('button')[0]!.attributes('aria-pressed')).toBe('true')
    expect(localStorage.getItem('theme')).toBeNull()
  })
})
