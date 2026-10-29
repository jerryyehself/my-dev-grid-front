import { describe, it, expect } from 'vitest'
import { techniqueLabel } from './techniqueLabel'

// 案例刻意跟後端 my-dev-grid 的 tests/Unit/TechniqueLabelTest.php 一樣：兩邊是同一條規則
describe('techniqueLabel', () => {
  it('它應該在有版本時接在 title 後面，中間一個空白', () => {
    expect(techniqueLabel('Vue', '3')).toBe('Vue 3')
    expect(techniqueLabel('Bootstrap', '5')).toBe('Bootstrap 5')
  })

  it('它應該在版本留空時只保留 title', () => {
    expect(techniqueLabel('Vue', null)).toBe('Vue')
    expect(techniqueLabel('Vue', undefined)).toBe('Vue')
    expect(techniqueLabel('Vue', '')).toBe('Vue')
    expect(techniqueLabel('Vue')).toBe('Vue')
  })

  it('它應該將只有空白的版本視為沒填，不會變成「Vue   」', () => {
    expect(techniqueLabel('Vue', '  ')).toBe('Vue')
  })
})
