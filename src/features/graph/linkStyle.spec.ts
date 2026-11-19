import { describe, expect, it } from 'vitest'
import { aboutMarkerStyle, directLinkStyle, isAboutLink } from './linkStyle'

const base = {
  edgeReal: '#6d7686',
  accent: '#922e39',
  hasFocus: false,
  touchesFocus: false,
  filterDimmed: false,
}
const gray = (alpha: number) => `rgba(109,118,134,${alpha})`

describe('directLinkStyle', () => {
  it('它應該讓一般直接連線是不透明的 --edge-real、線寬 1.5', () => {
    expect(directLinkStyle(base)).toEqual({ color: '#6d7686', width: 1.5 })
  })

  it('它應該讓選取中沒碰到選取點的連線淡成 0.18、線寬維持 1.5', () => {
    expect(directLinkStyle({ ...base, hasFocus: true })).toEqual({ color: gray(0.18), width: 1.5 })
  })

  it('它應該讓碰到選取點的連線是不透明 accent、線寬 2.2', () => {
    expect(directLinkStyle({ ...base, hasFocus: true, touchesFocus: true })).toEqual({
      color: '#922e39',
      width: 2.2,
    })
  })

  it('它應該讓沒有選取時被顯示層篩掉的連線淡成 0.22', () => {
    expect(directLinkStyle({ ...base, filterDimmed: true })).toEqual({ color: gray(0.22), width: 1.5 })
  })

  it('它應該讓碰到選取點但被顯示層篩掉的連線跟沒碰到的一樣淡', () => {
    const dimmed = { ...base, hasFocus: true, touchesFocus: true, filterDimmed: true }
    expect(directLinkStyle(dimmed)).toEqual({ color: gray(0.18), width: 1.5 })
  })

  it('它應該在沒有選取時忽略 touchesFocus', () => {
    expect(directLinkStyle({ ...base, touchesFocus: true })).toEqual(directLinkStyle(base))
  })
})

describe('isAboutLink', () => {
  it('它應該認得「關於」的兩個述詞（subjectOfProject、projectAbout）', () => {
    expect(isAboutLink('subjectOfProject')).toBe(true)
    expect(isAboutLink('projectAbout')).toBe(true)
  })

  it('它應該不把「使用」或其他述詞、空述詞當成「關於」', () => {
    expect(isAboutLink('usedBy')).toBe(false)
    expect(isAboutLink('about')).toBe(false)
    expect(isAboutLink(null)).toBe(false)
    expect(isAboutLink(undefined)).toBe(false)
  })
})

describe('「關於」與「使用」的線樣式', () => {
  it('它應該讓「關於」的線跟「使用」一樣：同色、線寬 1.5（圈是額外畫的）', () => {
    expect(directLinkStyle(base)).toEqual({ color: '#6d7686', width: 1.5 })
  })
})

describe('aboutMarkerStyle', () => {
  const bg = '#e4ebf5'

  it('它應該畫半徑 3、描邊 1.5、填畫布底色的空心圈', () => {
    const line = directLinkStyle(base)
    expect(aboutMarkerStyle({ lineColor: line.color, canvasBg: bg })).toEqual({
      radius: 3,
      lineWidth: 1.5,
      stroke: '#6d7686',
      fill: bg,
    })
  })

  it('它應該讓 hover／選取時圈的描邊跟著線變 accent', () => {
    const line = directLinkStyle({ ...base, hasFocus: true, touchesFocus: true })
    expect(aboutMarkerStyle({ lineColor: line.color, canvasBg: bg }).stroke).toBe('#922e39')
  })

  it('它應該讓淡出時圈的描邊跟線一起淡出', () => {
    const line = directLinkStyle({ ...base, hasFocus: true })
    expect(aboutMarkerStyle({ lineColor: line.color, canvasBg: bg }).stroke).toBe(gray(0.18))
    const filtered = directLinkStyle({ ...base, filterDimmed: true })
    expect(aboutMarkerStyle({ lineColor: filtered.color, canvasBg: bg }).stroke).toBe(gray(0.22))
  })
})
