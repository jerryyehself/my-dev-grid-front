import { describe, expect, it } from 'vitest'
import { extractHeadings, slugify } from './headings'

describe('slugify', () => {
  it('它應該將英文轉小寫並將空白轉成連字號', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world')
  })

  it.each(['中文標題', 'ひらがなカタカナ'])('它應該保留中文與日文假名：%s', (text) => {
    expect(slugify(text)).toBe(text)
  })

  it('它應該移除標點、合併連字號並去掉頭尾連字號', () => {
    expect(slugify('---Hello,   World!!!----')).toBe('hello-world')
  })

  it.each(['!?。', '   ', '---'])('它應該在正規化結果為空時使用 section：%j', (text) => {
    expect(slugify(text)).toBe('section')
  })
})

describe('extractHeadings', () => {
  it('它應該依文件順序列出標題並保留正確 depth', () => {
    expect(extractHeadings('# 開始\n\n正文。\n\n### 細節\n\n## 下一段')).toEqual([
      { depth: 1, text: '開始', slug: '開始' },
      { depth: 3, text: '細節', slug: '細節' },
      { depth: 2, text: '下一段', slug: '下一段' },
    ])
  })

  it('它應該將標題中的行內程式碼與連結轉成純文字', () => {
    expect(extractHeadings('## 使用 `API` 與 [文件](https://example.com)')).toEqual([
      { depth: 2, text: '使用 API 與 文件', slug: '使用-api-與-文件' },
    ])
  })

  it('它應該在同名標題第二次起依序加上流水號', () => {
    expect(extractHeadings('# 標題\n\n## 標題\n\n### 標題').map((heading) => heading.slug)).toEqual([
      '標題',
      '標題-2',
      '標題-3',
    ])
  })

  it('它應該記錄原標題自帶流水號時目前仍可能產生相同 slug', () => {
    // 目前依原始 slug 計數，沒有避開其他標題已經使用的流水號；此任務只加測試。
    expect(extractHeadings('# A\n\n# A-2\n\n# A').map((heading) => heading.slug)).toEqual([
      'a',
      'a-2',
      'a-2',
    ])
  })
})
