import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { buildFootnoteIndex, stackSidenotes } from './footnotes'

const parse = (source: string) =>
  unified().use(remarkParse).use(remarkGfm).parse(source) as unknown as Parameters<typeof buildFootnoteIndex>[0]
const summary = (source: string) => buildFootnoteIndex(parse(source)).list.map((f) => [f.identifier, f.number, f.refCount])

describe('buildFootnoteIndex', () => {
  it('它應該依第一次引用的順序編號，不是依定義寫在哪裡', () => {
    expect(summary('甲[^b]乙[^a]\n\n[^a]: A\n\n[^b]: B')).toEqual([
      ['b', 1, 1],
      ['a', 2, 1],
    ])
  })

  it('它應該讓同一則註釋被多次引用時沿用同一個編號並累計次數', () => {
    expect(summary('甲[^x]乙[^y]丙[^x]\n\n[^x]: X\n\n[^y]: Y')).toEqual([
      ['x', 1, 2],
      ['y', 2, 1],
    ])
  })

  it('它應該把沒有引用的定義排在被引用的後面，次數為 0', () => {
    expect(summary('只引用一個[^b]\n\n[^a]: 孤兒\n\n[^b]: 被引用\n\n[^c]: 另一個孤兒')).toEqual([
      ['b', 1, 1],
      ['a', 2, 0],
      ['c', 3, 0],
    ])
  })

  it('它應該把引用與定義的標籤大小寫視為同一個', () => {
    expect(summary('甲[^Note]\n\n[^note]: 內容')).toEqual([['note', 1, 1]])
  })

  it('它應該在同一個標籤定義兩次時採用第一個', () => {
    const idx = buildFootnoteIndex(parse('甲[^1]\n\n[^1]: 先\n\n[^1]: 後'))
    expect(idx.list).toHaveLength(1)
    expect(JSON.stringify(idx.list[0]!.definition)).toContain('先')
    expect(JSON.stringify(idx.list[0]!.definition)).not.toContain('後')
  })

  it('它應該不替沒有定義的引用編號（remark 把它留成一般文字）', () => {
    expect(summary('甲[^nope]乙')).toEqual([])
  })

  it('它應該不把註釋內容裡的巢狀引用算進去', () => {
    expect(summary('甲[^1]\n\n[^1]: 內容又引用[^2]\n\n[^2]: 第二則')).toEqual([
      ['1', 1, 1],
      ['2', 2, 0],
    ])
  })

  it('它應該在沒有註腳時回傳空清單', () => {
    expect(summary('一般的段落')).toEqual([])
  })
})

describe('stackSidenotes', () => {
  it('它應該讓位置夠遠的邊注保持原位', () => {
    expect(stackSidenotes([0, 100, 300], [40, 40, 40])).toEqual([0, 100, 300])
  })

  it('它應該把太近的邊注往下推，留出間距', () => {
    expect(stackSidenotes([0, 10, 20], [50, 50, 50], 12)).toEqual([0, 62, 124])
  })

  it('它應該在一長串密集的註釋裡任兩則都不重疊、順序不變', () => {
    const tops = [5, 6, 7, 8, 200, 201, 202]
    const heights = [60, 20, 80, 40, 100, 30, 30]
    const result = stackSidenotes(tops, heights)
    result.forEach((top, i) => {
      expect(top).toBeGreaterThanOrEqual(tops[i]!)
      if (i > 0) expect(top).toBeGreaterThanOrEqual(result[i - 1]! + heights[i - 1]!)
    })
  })

  it('它應該容許空輸入', () => {
    expect(stackSidenotes([], [])).toEqual([])
  })
})
