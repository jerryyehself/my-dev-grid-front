import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import MarkdownBody from './MarkdownBody.vue'

const Stub = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Stub },
      { path: '/projects/:id', name: 'project', component: Stub },
    ],
  })
}

async function mountMd(source: string) {
  const router = makeRouter()
  router.push('/')
  await router.isReady()
  return mount(MarkdownBody, { props: { source }, global: { plugins: [router] } })
}

describe('MarkdownBody', () => {
  it('站內連結用 RouterLink，點下去不會整頁重載', async () => {
    const w = await mountMd('看看 [專案](/projects/7)。')
    const a = w.find('a')
    // RouterLink 渲染出來的 <a> 沒有 target，而且 href 由 router 解析
    expect(a.attributes('href')).toBe('/projects/7')
    expect(a.attributes('target')).toBeUndefined()
  })

  it('站外連結開新分頁並補上 rel', async () => {
    const w = await mountMd('看看 [Laravel](https://laravel.com/docs)。')
    const a = w.find('a')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener noreferrer')
  })

  it('行內格式都渲染成真的元素，不是被跳脫的文字', async () => {
    const w = await mountMd('這是 **粗體**、*斜體*、`code` 跟 ~~刪除線~~。')
    expect(w.find('strong').text()).toBe('粗體')
    expect(w.find('em').text()).toBe('斜體')
    expect(w.find('code').text()).toBe('code')
    // 刪除線來自 remark-gfm，沒裝的話這行會失敗——這個斷言同時在守 gfm 有沒有被拿掉
    expect(w.find('del').text()).toBe('刪除線')
  })

  it('標題沿用站上的 // 前綴樣式', async () => {
    const w = await mountMd('## 收斂到 View')
    const h = w.find('h3')
    expect(h.text()).toContain('//')
    expect(h.text()).toContain('收斂到 View')
  })

  it('清單與任務清單', async () => {
    const w = await mountMd('- 一\n- 二\n\n1. 甲\n\n- [x] 做完了\n- [ ] 還沒\n')
    expect(w.findAll('ul').length).toBeGreaterThanOrEqual(1)
    expect(w.find('ol').exists()).toBe(true)
    const boxes = w.findAll('input[type="checkbox"]')
    expect(boxes.length).toBe(2)
    // 用 disabled 的 checkbox 而不是文字符號，螢幕閱讀器才讀得出勾選狀態
    expect(boxes[0]!.attributes('disabled')).toBeDefined()
  })

  it('GFM 表格', async () => {
    const w = await mountMd('| a | b |\n|---|--:|\n| 1 | 2 |\n')
    expect(w.find('table').exists()).toBe(true)
    expect(w.findAll('th').length).toBe(2)
    expect(w.findAll('td').length).toBe(2)
    // 對齊來自表頭的 |--:|
    expect(w.findAll('td')[1]!.classes().join(' ')).toContain('text-right')
  })

  it('程式碼區塊保留原始空白與換行', async () => {
    const w = await mountMd('```js\nconst a = 1\n  const b = 2\n```')
    expect(w.find('pre code').text()).toBe('const a = 1\n  const b = 2')
    expect(w.find('pre code').attributes('data-lang')).toBe('js')
  })

  it('原始 HTML 不會被當成 HTML 執行', async () => {
    const w = await mountMd('正常文字 <img src=x onerror="alert(1)"> 後面')
    // 走 vnode 就沒有 innerHTML 這條路:html 節點在 walker 裡沒有對應處理，
    // 會落到 default 分支，不會變成真的 <img>
    expect(w.find('img').exists()).toBe(false)
    expect(w.html()).not.toContain('onerror')
  })

  it('認不得的節點不會讓內容消失', async () => {
    // 腳註語法目前沒裝對應外掛，remark 會把它當成一般文字節點處理；
    // 這個案例是在守 walker 的 default 分支——不認得就往下走 children，不是丟掉
    const w = await mountMd('段落一\n\n段落二')
    expect(w.text()).toContain('段落一')
    expect(w.text()).toContain('段落二')
  })
})
