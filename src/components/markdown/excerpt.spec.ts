import { describe, expect, it } from 'vitest'
import { excerptOf } from './excerpt'
import fixture from '@/data/articlesDemoFixture.json'

describe('excerptOf', () => {
  it('它應該只回傳第一個段落的純文字', () => {
    expect(excerptOf('第一段文字。\n\n第二段不應成為摘要。')).toBe('第一段文字。')
  })

  it('它應該跳過開頭的標題與程式碼區塊', () => {
    const source = ['# 文章標題', '', '```ts', 'const value = 1', '```', '', '正文第一段。'].join('\n')

    expect(excerptOf(source)).toBe('正文第一段。')
  })

  it('它應該跳過帶 {#id} 的標題，摘要裡不會出現', () => {
    expect(excerptOf('## 標題 {#intro}\n\n正文第一段。')).toBe('正文第一段。')
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

  it('它應該跳過首段只有圖片的段落，取後面的正文', () => {
    expect(excerptOf('![圖片說明](https://example.com/image.png)\n\n後面的正文。')).toBe(
      '後面的正文。',
    )
  })

  it('它應該在圖片和文字同段時保留那段的文字', () => {
    expect(excerptOf('![圖](x.png) 文字\n\n後面的正文。')).toBe(' 文字')
  })

  it('它應該跳過純文字只有空白的段落', () => {
    expect(excerptOf('`   `\n\n後面的正文。')).toBe('後面的正文。')
  })

  it('它應該在全部段落都沒有非空白文字時回傳空字串', () => {
    expect(excerptOf('![圖](x.png)\n\n`   `\n\n![另一張圖](y.png)')).toBe('')
  })

  it('它應該保留只有一般連結的首段文字', () => {
    expect(excerptOf('[連結](https://example.com)\n\n後面的正文。')).toBe('連結')
  })

  it('它應該跳過開頭是清單、表格的內容，取後面的段落', () => {
    expect(excerptOf('- 項目一\n- 項目二\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n清單後的正文。')).toBe(
      '清單後的正文。',
    )
  })

  it('它應該取標題之前引言區塊裡的段落，不是標題之後的段落', () => {
    expect(excerptOf('> 引言一句話。\n\n## 小節\n\n小節裡的正文。')).toBe('引言一句話。')
  })

  it('它應該忽略標題之後的引言區塊', () => {
    expect(excerptOf('## 小節\n\n> 引用別人的話。\n\n小節裡的正文。')).toBe('小節裡的正文。')
  })

  it('它應該讓結尾是冒號、後面接表格或清單的引言句排在其他段落之後', () => {
    expect(excerptOf('比較如下：\n\n| a | b |\n|---|---|\n\n結論段落。')).toBe('結論段落。')
    expect(excerptOf('步驟如下:\n\n1. 第一步\n\n結論段落。')).toBe('結論段落。')
  })

  it('它應該在只有結尾是冒號的引言句時用它並拿掉冒號', () => {
    expect(excerptOf('比較如下：\n\n| a | b |\n|---|---|')).toBe('比較如下')
    expect(excerptOf('步驟如下:\n\n- 第一步')).toBe('步驟如下')
  })

  it('它應該保留結尾是冒號、但後面接的是段落的句子', () => {
    expect(excerptOf('他說：\n\n後面接另一段。')).toBe('他說：')
  })

  it('它應該保留文字中間的冒號', () => {
    expect(excerptOf('結論：先做這個。\n\n- 清單')).toBe('結論：先做這個。')
  })
})

// 以下用正式站發佈過的文章原文（src/data/articlesDemoFixture.json，後端連不上時示範用的那份）
// 當輸入。三篇摘要以前各有各的問題：只有 Markdown 引言區塊（`>`）當開頭的文章會取到文末附註、
// 或停在「：」。
describe('excerptOf 用正式文章原文', () => {
  const bodyOf = (id: number) => (fixture as { id: number; body: string }[]).find((a) => a.id === id)!.body

  it('它應該取〈節省 Token／降變異度機制盤點〉開頭引言的第一段，不是文末的附註', () => {
    const text = excerptOf(bodyOf(8))
    expect(text).toBe(
      '這份盤點涵蓋本專案目前現行中與已停用的所有跨 session 協作／文件管理機制，只收「真的有實際施作過、可以講出使用時機跟效果」的機制——不含單純被評估過但從未採用的方案（那些列在文末「考慮過但未採用」，不佔正式欄位，因為它們沒有「施作期間」可講）。',
    )
    expect(text).not.toContain('整理自')
  })

  it('它應該取〈首頁知識視覺化設計決策記錄〉的引言，不是含 <template><main></main></template> 長字串的段落', () => {
    const text = excerptOf(bodyOf(7))
    expect(text).toBe(
      '對應 jerryyehself/my-dev-grid-front issue #18（首頁重新設計）。這份文件記錄整個決策過程的\n前因後果、考慮過的圖形類型、引用的文獻、討論中的關鍵轉折，供之後回顧「為什麼是這個方向」時查。',
    )
    expect(text).not.toContain('<template>')
  })

  it('它應該讓〈my-dev-grid-front 部署到 Cloudflare 的完整流程〉的摘要不停在冒號', () => {
    const text = excerptOf(bodyOf(9))
    expect(text).toBe(
      '這份文件記錄把 my-dev-grid-front（Vue 3 + Vite 純 SPA）部署到 Cloudflare 的完整過程，包含選型理由、兩次真的踩到的部署失敗、根因與修法、CI 與 CD 的分工，以及部署完之後怎麼先擋住公開存取。所有踩坑都是這次實際部署時發生的，不是紙上談兵。',
    )
    expect(text).not.toMatch(/[：:]$/)
  })

  it('它應該在拿掉引言區塊後，仍不讓〈…部署到 Cloudflare 的完整流程〉的摘要停在冒號', () => {
    // 同一篇拿掉開頭引言：第一個段落是「…第三節）：」，後面接表格，要往後取下一個段落
    const withoutQuote = bodyOf(9).split('\n').slice(2).join('\n')
    const text = excerptOf(withoutQuote)
    expect(text).not.toMatch(/[：:]$/)
    expect(text.startsWith('**')).toBe(false)
    expect(text).toContain('關鍵澄清')
  })

  it('它應該讓目前正式站的文章第一段照舊成為摘要（含中英混排）', () => {
    expect(
      excerptOf(
        '把Vue 3＋Vite的單頁應用（SPA）透過GitHub整合部署到Cloudflare Workers的紀錄：`wrangler.jsonc`的設定、兩次部署失敗的錯誤訊息與修法。\n\n> 狀態：2026-09-25。\n\n## 前提\n\n| a | b |\n|---|---|',
      ),
    ).toBe('把Vue 3＋Vite的單頁應用（SPA）透過GitHub整合部署到Cloudflare Workers的紀錄：wrangler.jsonc的設定、兩次部署失敗的錯誤訊息與修法。')
  })
})
