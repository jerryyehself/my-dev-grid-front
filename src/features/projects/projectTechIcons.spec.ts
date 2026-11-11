import { describe, it, expect } from 'vitest'
import { techIconOf } from './projectTechIcons'

describe('techIconOf', () => {
  it.each(['Vue', 'vue', 'VUE', '  Vue  '])('它應該不分大小寫、忽略前後空白地找到 %j 的圖示', (name) => {
    expect(techIconOf(name)?.title).toBe('Vue.js')
  })

  it.each([
    ['laravel', 'Laravel'],
    ['Nuxt', 'Nuxt'],
    ['HTML', 'HTML5'],
    ['CSS', 'CSS'],
    ['Shell', 'GNU Bash'],
    ['Dockerfile', 'Docker'],
    ['Jupyter Notebook', 'Jupyter'],
    ['appscript', 'Google Apps Script'],
    ['linebot', 'LINE'],
    ['github-pages', 'GitHub Pages'],
  ])('它應該把後端的技術名稱 %s 對到 %s 的圖示', (name, title) => {
    expect(techIconOf(name)?.title).toBe(title)
  })

  it.each(['', 'Blade', 'database', 'Vue 3'])('它應該在沒有對應圖示時回 undefined（%j）', (name) => {
    expect(techIconOf(name)).toBeUndefined()
  })

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
    '它應該不讓 %s 這種物件原型上的名稱查到東西',
    (name) => {
      expect(techIconOf(name)).toBeUndefined()
    },
  )

  it('它應該回傳可以直接畫成 SVG 的路徑資料', () => {
    const icon = techIconOf('laravel')
    expect(icon?.path).toMatch(/^M/)
  })
})
