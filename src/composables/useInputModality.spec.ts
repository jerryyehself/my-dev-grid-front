import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getInputModality, initInputModality } from './useInputModality'

const root = () => document.documentElement.getAttribute('data-input')

describe('useInputModality', () => {
  let stop: () => void

  beforeEach(() => {
    stop = initInputModality()
  })

  afterEach(() => {
    stop()
  })

  it('它應該在還沒有任何輸入時是 pointer（維持有動畫的預設），並寫在 <html data-input>', () => {
    expect(getInputModality()).toBe('pointer')
    expect(root()).toBe('pointer')
  })

  it('它應該在按鍵（含 ? 與 Esc）之後變成 keyboard，從 window 以外的元素冒泡上來也算', () => {
    const button = document.createElement('button')
    document.body.appendChild(button)
    button.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    expect(getInputModality()).toBe('keyboard')
    expect(root()).toBe('keyboard')
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(getInputModality()).toBe('keyboard')
    button.remove()
  })

  it('它應該把 Tab 鍵（聚焦打開下拉）算成 keyboard', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(getInputModality()).toBe('keyboard')
  })

  it.each(['pointerdown', 'mousedown', 'touchstart', 'wheel'])(
    '它應該在鍵盤之後的 %s 切回 pointer',
    (type) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
      expect(getInputModality()).toBe('keyboard')
      window.dispatchEvent(new Event(type, { bubbles: true }))
      expect(getInputModality()).toBe('pointer')
      expect(root()).toBe('pointer')
    },
  )

  it('它應該以最後一次輸入為準：指標 → 鍵盤 → 指標 → 鍵盤', () => {
    window.dispatchEvent(new Event('pointerdown'))
    expect(getInputModality()).toBe('pointer')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(getInputModality()).toBe('keyboard')
    window.dispatchEvent(new Event('pointerdown'))
    expect(getInputModality()).toBe('pointer')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(getInputModality()).toBe('keyboard')
  })

  it('它應該不被無關事件（例如 click、mousemove）改變來源', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    window.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
    expect(getInputModality()).toBe('keyboard')
  })

  it('它應該重複呼叫只裝一次，移除後不再追蹤並清掉屬性', () => {
    expect(initInputModality()).toBe(stop)
    stop()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(getInputModality()).toBe('pointer')
    expect(root()).toBeNull()
    stop = initInputModality()
  })
})

describe('main.css 的鍵盤瞬間開合規則', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf-8')

  it('它應該在 data-input="keyboard" 時只把 panel-open／panel-close 兩個時長歸零', () => {
    const block = css.match(/html\[data-input='keyboard'\]\s*\{([^}]*)\}/)
    expect(block).not.toBeNull()
    const decls = block![1]!
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
    expect(decls).toEqual([
      '--transition-duration-panel-open: 0ms',
      '--transition-duration-panel-close: 0ms',
    ])
  })
})
