import { describe, expect, it } from 'vitest'
import { excerptOf } from './excerpt'

describe('excerptOf', () => {
  it('它應該只回傳第一個段落的純文字', () => {
    expect(excerptOf('第一段文字。\n\n第二段不應成為摘要。')).toBe('第一段文字。')
  })

  it('它應該跳過開頭的標題與程式碼區塊', () => {
    const source = ['# 文章標題', '', '```ts', 'const value = 1', '```', '', '正文第一段。'].join('\n')

    expect(excerptOf(source)).toBe('正文第一段。')
  })

  it('它應該移除粗體、連結與行內程式碼語法並保留文字', () => {
    expect(excerptOf('這是 **粗體**、[連結](https://example.com) 與 `code`。')).toBe(
      '這是 粗體、連結 與 code。',
    )
  })

  it.each(['', '# 只有標題', '```ts\nconst value = 1\n```'])(
    '它應該在沒有段落時回傳空字串：%j',
    (source) => {
      expect(excerptOf(source)).toBe('')
    },
  )

  it('它應該記錄首段只有圖片時目前回傳空字串，不繼續取後面的正文', () => {
    // 只記錄目前選取第一個 paragraph 的行為；是否跳過圖片段落由另一個修正處理。
    expect(excerptOf('![圖片說明](https://example.com/image.png)\n\n後面的正文。')).toBe('')
  })
})
