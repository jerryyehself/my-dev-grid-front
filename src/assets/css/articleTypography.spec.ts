import { describe, it, expect } from 'vitest'
import { readCss, tokenPx, tokenRaw } from '@/test/cssTokens'

const variablesCss = readCss('variables.css')
const baseCss = readCss('base.css')

// 文章內頁的字級與間距（定案值）：數字只存在 variables.css 的 --article-* 變數，
// 元件讀變數，不寫死。這裡守的是變數本身的值，元件有沒有用對變數在各元件的 spec。
describe('文章頁字級變數（variables.css）', () => {
  it('它應該是定案的值：標題 36／48、內文 16／28、h2 24／36、h3 16、段距 24、註腳 14／24、標籤 13／20', () => {
    expect([tokenPx('--article-title-size'), tokenPx('--article-title-leading')]).toEqual([36, 48])
    expect([tokenPx('--article-body-size'), tokenPx('--article-body-leading')]).toEqual([16, 28])
    expect([tokenPx('--article-h2-size'), tokenPx('--article-h2-leading')]).toEqual([24, 36])
    expect(tokenPx('--article-h3-size')).toBe(16)
    expect(tokenPx('--article-paragraph-gap')).toBe(24)
    expect([tokenPx('--article-footnote-size'), tokenPx('--article-footnote-leading')]).toEqual([14, 24])
    expect([tokenPx('--article-label-size'), tokenPx('--article-label-leading')]).toEqual([13, 20])
  })

  it('它應該把標籤字距設在 0.05em 以內（中文標籤字距拉寬只會把字拉開）', () => {
    const tracking = tokenRaw('--article-label-tracking')
    expect(tracking.endsWith('em')).toBe(true)
    expect(parseFloat(tracking)).toBeLessThanOrEqual(0.05)
  })

  it('它應該放在 :root，兩個主題共用，不跟著主題區塊重複', () => {
    const rootBlock = variablesCss.slice(variablesCss.lastIndexOf(':root {'))
    expect(rootBlock).toContain('--article-title-size')
    expect(variablesCss.match(/--article-title-size:/g)).toHaveLength(1)
  })

  it('它應該對不存在的變數丟錯，不默默回傳 undefined（守住測試輔助本身的失敗路徑）', () => {
    expect(() => tokenPx('--article-no-such-token')).toThrow()
    expect(() => tokenRaw('--article-no-such-token')).toThrow()
  })
})

// 全站背景：全站背景是純色。深色主題的掃描線與暗角、全站的漸層都拿掉。
describe('全站背景（base.css／variables.css）', () => {
  it('它應該讓 body 只用 --bg-page 一個純色，沒有任何漸層', () => {
    const body = baseCss.match(/^body\s*\{[^}]*\}/m)?.[0] ?? ''
    expect(body).toContain('background-color: var(--bg-page)')
    expect(body).not.toContain('background-image')
    expect(baseCss).not.toMatch(/\.theme-terminal\s+body/)
  })

  it('它應該在 base.css 裡一個漸層也沒有（掃描線是 repeating-linear-gradient、暗角是 radial-gradient）', () => {
    // 註解可能提到這些字，先把註解拿掉再找
    const code = baseCss.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toMatch(/gradient\(/)
  })

  it('它應該兩個主題都定義 --bg-page，而且只是指向既有的紙張色（沒有新色值）', () => {
    expect(variablesCss).toMatch(/\.theme-library\s*\{[^}]*--bg-page:\s*var\(--bg-paper-light\);/)
    expect(variablesCss).toMatch(/\.theme-terminal\s*\{[^}]*--bg-page:\s*var\(--bg-paper-dark\);/)
  })
})
