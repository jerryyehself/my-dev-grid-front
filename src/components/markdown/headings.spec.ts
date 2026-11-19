import { describe, expect, it } from 'vitest'
import { extractHeadings, slugify, stripHeadingIds } from './headings'

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
  it('它應該略過註腳定義裡的標題，免得後面的 slug 錯開', () => {
    expect(extractHeadings('## 甲\n\n文字[^1]\n\n[^1]: # 註內標題\n\n## 乙').map((h) => h.slug)).toEqual(['甲', '乙'])
  })

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

  it('它應該避開原標題已經使用的流水號', () => {
    expect(extractHeadings('# A\n\n# A-2\n\n# A').map((heading) => heading.slug)).toEqual([
      'a',
      'a-2',
      'a-3',
    ])
  })

  it('它應該在自帶流水號的標題先出現時仍依序避開衝突', () => {
    expect(extractHeadings('# A-2\n\n# A\n\n# A').map((heading) => heading.slug)).toEqual([
      'a-2',
      'a',
      'a-3',
    ])
  })

  it('它應該連續跳過已用流水號並避開產生過的 slug', () => {
    const source = '# A\n\n# A-2\n\n# A-3\n\n# A\n\n# A-4\n\n# A'

    expect(extractHeadings(source).map((heading) => heading.slug)).toEqual([
      'a',
      'a-2',
      'a-3',
      'a-4',
      'a-4-2',
      'a-5',
    ])
  })

  it('它應該在空標題使用預設 slug 時避開既有的流水號', () => {
    expect(extractHeadings('#\n\n# section-2\n\n#').map((heading) => heading.slug)).toEqual([
      'section',
      'section-2',
      'section-3',
    ])
  })
})

describe('stripHeadingIds', () => {
  const strip = (s: string) => stripHeadingIds(s).source

  it('它應該剝掉標題行尾的 {#id} 並回報行號對應的 ID', () => {
    const r = stripHeadingIds('## 標題 {#intro}\n\n文字')
    expect(r.source).toBe('## 標題\n\n文字')
    expect(r.ids.get(1)).toBe('intro')
  })

  it('它應該容許收尾井號與尾端空白', () => {
    expect(strip('## 標題 {#a-1} ##  ')).toBe('## 標題 ##  ')
    expect(stripHeadingIds('### T {#x_y} ###').ids.get(1)).toBe('x_y')
  })

  it.each(['## 標題 {#}', '## 標題 {#-bad}', '## 標題 {#a b}', '## 標題 {#a} 後面', '## 標題 {#ok}x', '    ## 標題 {#a}', '##標題 {#a}'])(
    '它應該不動格式不合的：%s',
    (line) => {
      expect(strip(line)).toBe(line)
    },
  )

  it('它應該不動程式碼區塊裡的標題樣子（含較長圍欄與 ~~~）', () => {
    const src = '```\n## 標題 {#a}\n```\n\n~~~\n## 標題 {#b}\n~~~\n\n````\n```\n## 標題 {#c}\n````\n\n## 真標題 {#d}'
    expect(strip(src)).toBe(src.replace('## 真標題 {#d}', '## 真標題'))
  })

  it.each(['\u00a0', '\u3000'])('它應該不把後面接 NBSP／全形空白的圍欄當成關閉：%j', (space) => {
    const src = '```\n```' + space + '\n## x {#a}\n```'
    expect(strip(src)).toBe(src)
  })

  it('它應該不讓不同字元的圍欄關閉區塊', () => {
    const src = '```\n~~~\n## x {#a}\n```'
    expect(strip(src)).toBe(src)
  })

  it('它應該不把資訊字串含反引號的行當成圍欄', () => {
    expect(strip('```js `x`\n## z {#a}')).toBe('```js `x`\n## z')
  })

  it('它應該不把關閉圍欄後接資訊字串的行當成關閉', () => {
    const src = '```\n```js\n## x {#a}\n```'
    expect(strip(src)).toBe(src)
    expect(strip('```\n## x {#a}\n```js\n```')).toBe('```\n## x {#a}\n```js\n```')
  })

  it('它應該不動內文裡的 {#keep}，標題行只剝行尾那個', () => {
    expect(strip('段落 {#keep}\n\n## 標題 {#keep} 中間 {#id1}')).toBe('段落 {#keep}\n\n## 標題 {#keep} 中間')
  })

  it('它應該處理 CRLF 並保留換行', () => {
    const r = stripHeadingIds('## 標題 {#crlf}\r\n\r\n文字\r\n')
    expect(r.source).toBe('## 標題\r\n\r\n文字\r\n')
    expect(r.ids.get(1)).toBe('crlf')
  })
})

describe('extractHeadings 明確 ID', () => {
  it('它應該用明確 ID 當 slug，文字是剝掉之後的', () => {
    expect(extractHeadings('## 背景 {#bg}\n\n## 方法')).toEqual([
      { depth: 2, text: '背景', slug: 'bg' },
      { depth: 2, text: '方法', slug: '方法' },
    ])
  })

  it('它應該讓自動 slug 避開明確 ID', () => {
    expect(extractHeadings('## 甲\n\n## 乙 {#abc}').map((h) => h.slug)).toEqual(['甲', 'abc'])
    expect(extractHeadings('## a\n\n## 別的 {#a}').map((h) => h.slug)).toEqual(['a-2', 'a'])
  })

  it('它應該在兩個標題寫同一個明確 ID 時只讓第一個用原 ID', () => {
    expect(extractHeadings('## 甲 {#a}\n\n## 乙 {#a}').map((h) => h.slug)).toEqual(['a', 'a-2'])
  })

  it('它應該讓重複的明確 ID 避開其他已用的 slug', () => {
    expect(extractHeadings('## 甲 {#a}\n\n## 乙 {#a}\n\n## 丙 {#a-2}\n\n## 丁 {#a}').map((h) => h.slug)).toEqual([
      'a',
      'a-3',
      'a-2',
      'a-4',
    ])
    const slugs = extractHeadings('## a\n\n## 甲 {#a}\n\n## 乙 {#a}').map((h) => h.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('它應該不影響 CRLF 原稿的標題', () => {
    expect(extractHeadings('## 甲 {#x}\r\n\r\n文字\r\n')).toEqual([{ depth: 2, text: '甲', slug: 'x' }])
  })
})
