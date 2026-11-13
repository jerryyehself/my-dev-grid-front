import { describe, expect, it } from 'vitest'
import { insertFootnote, nextFootnoteNumber } from './insertFootnote'

describe('nextFootnoteNumber', () => {
  it('它應該在空內文回傳 1', () => {
    expect(nextFootnoteNumber('')).toBe(1)
  })

  it('它應該在沒有任何註腳的內文回傳 1', () => {
    expect(nextFootnoteNumber('只是一段文字，還有 [連結](/graph) 和 [1] 這種方括號')).toBe(1)
  })

  it('它應該在已有 1 到 3 的引用與定義時回傳 4', () => {
    const body = '甲[^1] 乙[^2] 丙[^3]\n\n[^1]: 一\n[^2]: 二\n[^3]: 三'
    expect(nextFootnoteNumber(body)).toBe(4)
  })

  it('它應該在有缺口（1、3）時接在最大值後面回傳 4，不補 2', () => {
    expect(nextFootnoteNumber('甲[^1] 乙[^3]\n\n[^1]: 一\n[^3]: 三')).toBe(4)
  })

  it('它應該把只有定義沒有引用的編號也算進去', () => {
    expect(nextFootnoteNumber('內文\n\n[^5]: 孤兒定義')).toBe(6)
  })

  it('它應該把只有引用沒有定義的編號也算進去', () => {
    expect(nextFootnoteNumber('內文[^2]')).toBe(3)
  })

  it('它應該忽略非數字標籤，也不被它們影響數字編號', () => {
    expect(nextFootnoteNumber('甲[^note] 乙[^2]\n\n[^note]: 備註')).toBe(3)
    expect(nextFootnoteNumber('甲[^note]')).toBe(1)
  })

  it('它應該把 01 這種前導零視為 1', () => {
    expect(nextFootnoteNumber('甲[^01]')).toBe(2)
  })

  it('它應該不被超出安全整數的標籤弄成 NaN 或 Infinity', () => {
    expect(nextFootnoteNumber('甲[^99999999999999999999999] 乙[^2]')).toBe(3)
  })

  it('它應該忽略 fenced code block 裡的 [^n]（反引號與波浪線兩種）', () => {
    expect(nextFootnoteNumber('```md\n範例[^7]\n\n[^7]: x\n```\n')).toBe(1)
    expect(nextFootnoteNumber('~~~\n[^9]\n~~~\n正文[^1]')).toBe(2)
  })

  it('它應該只在同種且夠長的 fence 才結束程式碼區塊', () => {
    // 四個反引號開頭，裡面的三個反引號不是結尾，[^8] 仍在程式碼裡
    expect(nextFootnoteNumber('````\n```\n[^8]\n```\n````\n[^2]')).toBe(3)
    // 用波浪線不能關反引號 fence
    expect(nextFootnoteNumber('```\n[^8]\n~~~\n[^9]\n```\n')).toBe(1)
  })

  it('它應該在 fence 沒有關起來時把後面都當程式碼', () => {
    expect(nextFootnoteNumber('正文[^1]\n\n```\n[^5]')).toBe(2)
  })

  it('它應該在 fence 關掉後繼續計算後面的註腳', () => {
    expect(nextFootnoteNumber('```\n[^5]\n```\n\n正文[^2]')).toBe(3)
  })

  it('它應該把反引號後面帶反引號的一行當行內程式碼，不當 fence 開頭', () => {
    expect(nextFootnoteNumber('```not a fence``` [^4]')).toBe(5)
  })

  it('它應該忽略行內程式碼裡的 [^n]', () => {
    expect(nextFootnoteNumber('寫法是 `[^6]`，不是真的引用')).toBe(1)
    expect(nextFootnoteNumber('寫法是 ``含 ` 的 [^6]``，真的引用[^2]')).toBe(3)
  })

  it('它應該不讓一個沒配對的反引號吃掉後面的段落', () => {
    expect(nextFootnoteNumber('孤單的 ` 反引號\n\n後面段落[^3]')).toBe(4)
  })

  it('它應該忽略被反斜線跳脫的 [^n]', () => {
    expect(nextFootnoteNumber('寫成 \\[^5] 就不會變註腳')).toBe(1)
  })
})

describe('insertFootnote', () => {
  it('它應該在空內文插入 [^1]，並接上空一行的定義，游標在定義之後', () => {
    const r = insertFootnote('', 0, 0)
    expect(r.number).toBe(1)
    expect(r.value).toBe('[^1]\n\n[^1]: ')
    expect(r.caret).toBe(r.value.length)
  })

  it('它應該在游標處插入引用，並把定義補在文末（內文結尾沒有換行）', () => {
    const r = insertFootnote('前面後面', 2, 2)
    expect(r.value).toBe('前面[^1]後面\n\n[^1]: ')
    expect(r.caret).toBe(r.value.length)
  })

  it('它應該在內文已有一個結尾換行時只再補一個換行', () => {
    expect(insertFootnote('內文\n', 0, 0).value).toBe('[^1]內文\n\n[^1]: ')
  })

  it('它應該在內文已有空行結尾時不再多補換行', () => {
    expect(insertFootnote('內文\n\n', 0, 0).value).toBe('[^1]內文\n\n[^1]: ')
  })

  it('它應該不在已有多個結尾空行時再多補', () => {
    expect(insertFootnote('內文\n\n\n', 0, 0).value).toBe('[^1]內文\n\n\n[^1]: ')
  })

  it('它應該在最後一行已是別的定義時只換行，讓定義連在一起', () => {
    const r = insertFootnote('甲[^1]\n\n[^1]: 第一則', 1, 1)
    expect(r.number).toBe(2)
    expect(r.value).toBe('甲[^2][^1]\n\n[^1]: 第一則\n[^2]: ')
  })

  it('它應該在最後一個定義後已有一個換行時不再補換行', () => {
    const r = insertFootnote('甲[^1]\n\n[^1]: 第一則\n', 0, 0)
    expect(r.value).toBe('[^2]甲[^1]\n\n[^1]: 第一則\n[^2]: ')
  })

  it('它應該只在文末是定義行才連在一起，內文中間提到 [^1]: 的字樣不算', () => {
    const r = insertFootnote('說明 [^1]: 是定義的寫法', 0, 0)
    expect(r.value).toBe('[^2]說明 [^1]: 是定義的寫法\n\n[^2]: ')
  })

  it('它應該有選取時保留選取的文字，引用接在選取範圍後面', () => {
    const r = insertFootnote('這是重點文字，後面接著說明', 2, 6)
    expect(r.value).toBe('這是重點文字[^1]，後面接著說明\n\n[^1]: ')
    expect(r.caret).toBe(r.value.length)
  })

  it('它應該在游標在內文最後面時，引用與定義之間仍空一行', () => {
    const body = '全部文字'
    expect(insertFootnote(body, body.length, body.length).value).toBe('全部文字[^1]\n\n[^1]: ')
  })

  it('它應該把超出範圍的選取夾回內文長度之內', () => {
    expect(insertFootnote('短', 50, 99).value).toBe('短[^1]\n\n[^1]: ')
    expect(insertFootnote('短', -5, -1).value).toBe('[^1]短\n\n[^1]: ')
  })

  it('它應該用下一個未用編號：已有 1、3 時用 4', () => {
    const r = insertFootnote('甲[^1] 乙[^3]\n\n[^1]: 一\n[^3]: 三', 0, 0)
    expect(r.number).toBe(4)
    expect(r.value.endsWith('\n[^4]: ')).toBe(true)
  })

  it('它應該不被程式碼裡的 [^n] 影響編號', () => {
    expect(insertFootnote('`[^9]`\n\n```\n[^8]\n```', 0, 0).number).toBe(1)
  })

  it('它應該讓 from／to／text 套用到原文後等於 value（一次編輯）', () => {
    const cases: [string, number, number][] = [
      ['', 0, 0],
      ['前面後面', 2, 2],
      ['這是重點文字，後面', 2, 6],
      ['甲[^1]\n\n[^1]: 一\n', 1, 1],
      ['尾端', 2, 2],
    ]
    for (const [body, s, e] of cases) {
      const r = insertFootnote(body, s, e)
      expect(body.slice(0, r.from) + r.text + body.slice(r.to)).toBe(r.value)
    }
  })

  it('它應該連續插入兩次得到 1、2 兩個編號且游標都在最後一個定義之後', () => {
    const first = insertFootnote('第一句。第二句。', 4, 4)
    // first.value 是「第一句。[^1]第二句。」加定義；12 是「第二句。」後面
    const second = insertFootnote(first.value, 12, 12)
    expect(second.number).toBe(2)
    expect(second.value).toBe('第一句。[^1]第二句。[^2]\n\n[^1]: \n[^2]: ')
    expect(second.caret).toBe(second.value.length)
  })
})
