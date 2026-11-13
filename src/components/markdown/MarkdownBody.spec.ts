import { afterEach, describe, it, expect, vi } from 'vitest'
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

async function mountMd(source: string, extra: { sidenotes?: boolean; attach?: boolean } = {}) {
  const router = makeRouter()
  router.push('/')
  await router.isReady()
  return mount(MarkdownBody, {
    props: { source, sidenotes: extra.sidenotes },
    global: { plugins: [router] },
    attachTo: extra.attach ? document.body : undefined,
  })
}

describe('MarkdownBody', () => {
  it('它應該用 RouterLink 渲染站內連結，點下去不會整頁重載', async () => {
    const w = await mountMd('看看 [專案](/projects/7)。')
    const a = w.find('a')
    // RouterLink 渲染出來的 <a> 沒有 target，而且 href 由 router 解析
    expect(a.attributes('href')).toBe('/projects/7')
    expect(a.attributes('target')).toBeUndefined()
  })

  it('它應該讓站外連結開新分頁並補上 rel', async () => {
    const w = await mountMd('看看 [Laravel](https://laravel.com/docs)。')
    const a = w.find('a')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener noreferrer')
  })

  it('它應該把行內格式渲染成真的元素，不是被跳脫的文字', async () => {
    const w = await mountMd('這是 **粗體**、*斜體*、`code` 跟 ~~刪除線~~。')
    expect(w.find('strong').text()).toBe('粗體')
    expect(w.find('em').text()).toBe('斜體')
    expect(w.find('code').text()).toBe('code')
    // 刪除線來自 remark-gfm，沒裝的話這行會失敗——這個斷言同時在守 gfm 有沒有被拿掉
    expect(w.find('del').text()).toBe('刪除線')
  })

  it('它應該不在標題加 // 前綴（程式碼註解的造型只留給技術頁）', async () => {
    const w = await mountMd('## 收斂到 View')
    const h = w.find('h3')
    expect(h.text()).toBe('收斂到 View')
  })

  it('它應該渲染清單與任務清單', async () => {
    const w = await mountMd('- 一\n- 二\n\n1. 甲\n\n- [x] 做完了\n- [ ] 還沒\n')
    expect(w.findAll('ul').length).toBeGreaterThanOrEqual(1)
    expect(w.find('ol').exists()).toBe(true)
    const boxes = w.findAll('input[type="checkbox"]')
    expect(boxes.length).toBe(2)
    // 用 disabled 的 checkbox 而不是文字符號，螢幕閱讀器才讀得出勾選狀態
    expect(boxes[0]!.attributes('disabled')).toBeDefined()
  })

  it('它應該讓任務項目的核取方塊跟第一段文字排在同一行，後面的段落另起一行', async () => {
    const w = await mountMd('- [x] 第一段\n\n  第二段\n- [ ] 單段\n- 一般項目\n')
    const items = w.findAll('li')
    const first = items[0]!.element
    // 核取方塊後面緊接著行內的 <span> 放第一段，不是區塊的 <p>
    const box = first.querySelector('input[type="checkbox"]')!
    expect(box.nextElementSibling!.tagName).toBe('SPAN')
    expect(box.nextElementSibling!.textContent).toBe('第一段')
    // 第一段不是 <p>；第二段仍是區塊的 <p>
    expect(Array.from(first.querySelectorAll('p')).map((p) => p.textContent)).toEqual(['第二段'])
    // 單段的任務項目整個沒有 <p>
    expect(items[1]!.find('p').exists()).toBe(false)
    expect(items[1]!.text()).toBe('單段')
    // 一般項目維持原樣，沒有核取方塊
    expect(items[2]!.find('input').exists()).toBe(false)
  })

  it('它應該讓任務項目裡的巢狀清單與程式碼區塊仍是區塊，排在第一段後面', async () => {
    const w = await mountMd('- [ ] 文字\n  - 子項目\n')
    const li = w.find('li')
    const box = li.element.querySelector('input[type="checkbox"]')!
    // 核取方塊後面接的是行內 <span>；舊版是區塊的 <p>
    expect(box.nextElementSibling!.tagName).toBe('SPAN')
    expect(box.nextElementSibling!.textContent).toBe('文字')
    const nested = li.find('ul')
    expect(nested.exists()).toBe(true)
    expect(nested.text()).toBe('子項目')
    // 巢狀清單的項目不是任務，沒有核取方塊
    expect(nested.find('input').exists()).toBe(false)
  })

  it('它應該渲染 GFM 表格', async () => {
    const w = await mountMd('| a | b |\n|---|--:|\n| 1 | 2 |\n')
    expect(w.find('table').exists()).toBe(true)
    expect(w.findAll('th').length).toBe(2)
    expect(w.findAll('td').length).toBe(2)
    // 對齊來自表頭的 |--:|
    expect(w.findAll('td')[1]!.classes().join(' ')).toContain('text-right')
  })

  it('它應該在程式碼區塊保留原始空白與換行', async () => {
    const w = await mountMd('```js\nconst a = 1\n  const b = 2\n```')
    expect(w.find('pre code').text()).toBe('const a = 1\n  const b = 2')
    expect(w.find('pre code').attributes('data-lang')).toBe('js')
  })

  describe('可橫向捲動的區塊（鍵盤要捲得到）', () => {
    // Safari 不讓鍵盤聚焦到捲動區域，要有 tabindex="0"；可聚焦就要有名字
    const regionAttrs = (el: { attributes: (k: string) => string | undefined }) => ({
      tabindex: el.attributes('tabindex'),
      role: el.attributes('role'),
      label: el.attributes('aria-label'),
    })

    it.each([
      { kind: '有語言', fence: '```js\nconst a = 1\n```', label: '程式碼（js）' },
      { kind: '沒有語言', fence: '```\nplain\n```', label: '程式碼' },
    ])('它應該讓內文的程式碼區塊（$kind）可用鍵盤聚焦，並有名稱', async ({ fence, label }) => {
      const w = await mountMd(fence)
      expect(regionAttrs(w.get('pre'))).toEqual({ tabindex: '0', role: 'region', label })
    })

    it('它應該讓內文的表格捲動容器可用鍵盤聚焦，並有名稱', async () => {
      const w = await mountMd('| a | b |\n|---|---|\n| 1 | 2 |\n')
      const scroller = w.get('table').element.parentElement!
      expect(scroller.classList.contains('overflow-x-auto')).toBe(true)
      expect({
        tabindex: scroller.getAttribute('tabindex'),
        role: scroller.getAttribute('role'),
        label: scroller.getAttribute('aria-label'),
      }).toEqual({ tabindex: '0', role: 'region', label: '表格' })
    })

    it('它應該只在鍵盤聚焦時畫外框（用 :focus-visible，不是 :focus）', async () => {
      const w = await mountMd('```js\nx\n```')
      const classes = w.get('pre').classes()
      expect(classes).toContain('focus-visible:outline-2')
      expect(classes.some((c) => c.startsWith('focus:'))).toBe(false)
    })

    it('它應該讓註釋裡的程式碼區塊與表格捲動容器也可用鍵盤聚焦，並有名稱', async () => {
      const w = await mountMd(
        '句子[^1]。\n\n[^1]: 說明：\n\n    ```ts\n    const a = 1\n    ```\n\n    | 欄 | 值 |\n    |---|---|\n    | 甲 | 1 |',
      )
      const note = w.get('[id*="fnnote"]')
      const code = note.get('code')
      const tableScroller = note.get('[role="table"]').element.parentElement!
      expect(regionAttrs(code)).toEqual({ tabindex: '0', role: 'region', label: '程式碼（ts）' })
      expect(tableScroller.getAttribute('tabindex')).toBe('0')
      expect(tableScroller.getAttribute('role')).toBe('region')
      expect(tableScroller.getAttribute('aria-label')).toBe('表格')
    })

    it('它應該不替不會捲動的行內程式碼加 tabindex', async () => {
      const w = await mountMd('這是 `inline` 程式碼')
      expect(w.find('[tabindex]').exists()).toBe(false)
    })
  })

  it('它應該不把原始 HTML 當成 HTML 執行', async () => {
    const w = await mountMd('正常文字 <img src=x onerror="alert(1)"> 後面')
    // 走 vnode 就沒有 innerHTML 這條路:html 節點在 walker 裡沒有對應處理，
    // 會落到 default 分支，不會變成真的 <img>
    expect(w.find('img').exists()).toBe(false)
    expect(w.html()).not.toContain('onerror')
  })

  it('它應該讓認不得的節點不使內容消失', async () => {
    // 這個案例是在守 walker 的 default 分支——不認得的節點就往下走 children，不是丟掉
    // （註腳以前就是掉進這條分支才消失的，現在有自己的 case，見下面「註腳」）
    const w = await mountMd('段落一\n\n段落二')
    expect(w.text()).toContain('段落一')
    expect(w.text()).toContain('段落二')
  })

  describe('連結網址白名單（safeLink）', () => {
    it.each([
      '[點我](javascript:alert(1))',
      '[點我](JaVaScRiPt:alert(1))',
      '[點我](&#106;avascript:alert(1))',
      '[點我](javascript&#58;alert(1))',
      '[點我](&#x6A;&#x61;vascript:alert(1))',
      '[點我](data:text/html,<b>x</b>)',
      '[點我](vbscript:msgbox(1))',
      '<javascript:alert(1)>',
      '[點我][ref]\n\n[ref]: javascript:alert(1)',
    ])('它應該對危險協定只留文字、不產生任何 <a>：%s', async (source) => {
      const w = await mountMd(source)
      expect(w.find('a').exists()).toBe(false)
      // 文字本身可以出現（`<javascript:…>` 的連結文字就是網址），但不能有任何 href
      expect(w.html()).not.toMatch(/href/i)
      expect(w.text()).toContain(source.startsWith('<') ? 'javascript:alert(1)' : '點我')
    })

    it('它應該照常把 https、mailto 當成站外連結', async () => {
      const w = await mountMd('[站外](https://example.com) 與 [信](mailto:a@example.com)')
      const links = w.findAll('a')
      expect(links.map((a) => a.attributes('href'))).toEqual([
        'https://example.com/',
        'mailto:a@example.com',
      ])
      expect(links[0]!.attributes('target')).toBe('_blank')
      expect(links[0]!.attributes('rel')).toBe('noopener noreferrer')
    })
  })

  it('它應該照常渲染 https 圖片', async () => {
    const w = await mountMd('![示意圖](https://example.com/a.png)')
    expect(w.find('img').attributes('src')).toBe('https://example.com/a.png')
  })

  it('它應該在圖片網址協定不在白名單時只留替代文字', async () => {
    const w = await mountMd('![示意圖](javascript:alert(1))')
    expect(w.find('img').exists()).toBe(false)
    expect(w.text()).toContain('示意圖')
  })

  describe('註腳', () => {
    const SOURCE = [
      '先講乙[^b]，再講甲[^a]，然後又講乙[^b]。',
      '',
      '[^a]: 甲的內容',
      '',
      '[^b]: 乙的內容，含 `code` 與 [連結](https://example.com)',
      '',
      '[^orphan]: 沒人引用',
    ].join('\n')

    type Wrapper = Awaited<ReturnType<typeof mountMd>>
    const markers = (w: Wrapper) => w.findAll('button[data-fn-number]')
    const endItems = (w: Wrapper) => w.findAll('section ol > li')

    // jsdom 沒有排版，寬窄靠替換 matchMedia 控制（SIDE_QUERY 只有一條）
    const original = window.matchMedia
    afterEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: original,
      })
    })
    const stubWide = (matches: boolean) =>
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
      })

    it('它應該把內文裡的引用渲染成上標編號按鈕，依第一次引用的順序編號、重複引用沿用同一個編號', async () => {
      const w = await mountMd(SOURCE)
      const found = markers(w)
      expect(found.map((m) => m.text())).toEqual(['1', '2', '1'])
      expect(found.every((m) => m.element.closest('sup'))).toBe(true)
      // 鍵盤 Enter／Space 靠原生 <button type="button"> 的啟動行為，不是 div／a
      expect(
        found.every((m) => m.element.tagName === 'BUTTON' && m.attributes('type') === 'button'),
      ).toBe(true)
      expect(found[0]!.attributes('aria-label')).toBe('註 1')
      // 每個引用有自己的 id，才能各自有回連結
      expect(new Set(found.map((m) => m.attributes('id'))).size).toBe(3)
    })

    describe('緊貼的編號不互相蓋住點擊範圍', () => {
      // jsdom 沒有排版，量不到實際位置；這裡驗「哪一側有加大」，實際點擊位置由瀏覽器實測
      const hasClass = (w: Wrapper, i: number, cls: string) =>
        markers(w)[i]!.classes().includes(cls)

      it('它應該讓單獨的編號左右各加大，上下也加大', async () => {
        const w = await mountMd('文字[^1]。\n\n[^1]: 一')
        expect(hasClass(w, 0, 'after:-left-3.5')).toBe(true)
        expect(hasClass(w, 0, 'after:-right-3.5')).toBe(true)
        expect(hasClass(w, 0, 'after:-inset-y-4')).toBe(true)
      })

      it('它應該讓緊貼的三個編號在相鄰的那一側不加大，最外側保留，上下都保留', async () => {
        const w = await mountMd('文字[^1][^2][^3]。\n\n[^1]: 一\n\n[^2]: 二\n\n[^3]: 三')
        const sides = [0, 1, 2].map((i) => [
          hasClass(w, i, 'after:left-px'),
          hasClass(w, i, 'after:right-px'),
        ])
        expect(sides).toEqual([
          [false, true],
          [true, true],
          [true, false],
        ])
        // 相鄰那一側不能是切齊（left-0／right-0）：數字寬度是小數，對齊到整數像素後會各多出約 1px 蓋到鄰居
        for (let i = 0; i < 3; i++) {
          expect(hasClass(w, i, 'after:left-0')).toBe(false)
          expect(hasClass(w, i, 'after:right-0')).toBe(false)
        }
        expect(hasClass(w, 0, 'after:-left-3.5')).toBe(true)
        expect(hasClass(w, 2, 'after:-right-3.5')).toBe(true)
        for (let i = 0; i < 3; i++) expect(hasClass(w, i, 'after:-inset-y-4')).toBe(true)
      })

      it('它應該在兩個編號中間隔著文字時各自照常加大', async () => {
        const w = await mountMd('甲[^1]，乙[^2]。\n\n[^1]: 一\n\n[^2]: 二')
        for (const i of [0, 1]) {
          expect(hasClass(w, i, 'after:-left-3.5')).toBe(true)
          expect(hasClass(w, i, 'after:-right-3.5')).toBe(true)
        }
      })

      it('它應該把沒有定義的引用當成普通文字，不算鄰居', async () => {
        // 單獨的 [^9] 沒有定義：remark 不產生 footnoteReference，編號 1 仍是單獨的
        const w = await mountMd('文字[^1][^9]。\n\n[^1]: 一')
        expect(hasClass(w, 0, 'after:-right-3.5')).toBe(true)
      })
    })

    describe('編號不會單獨落在行首', () => {
      // 中文任兩字之間都能斷行，編號又是不能再拆的行內方塊；所以前一個字要跟編號包進同一個 nowrap 的 span
      // （U+2060 在 Chromium 對行內方塊不生效，實測過，不能拿來代替）。jsdom 沒有排版，這裡驗結構。
      const wrapperOf = (w: Wrapper, i = 0) =>
        markers(w)[i]!.element.closest('sup')!.parentElement as HTMLElement

      it('它應該把文字結尾的最後一個字搬進編號的 nowrap span，前面的字留在原來的 span', async () => {
        const w = await mountMd('前面的句子結尾[^1]。後面。\n\n[^1]: 內容')
        const wrap = wrapperOf(w)
        expect(wrap.classList.contains('whitespace-nowrap')).toBe(true)
        expect(wrap.textContent).toBe('尾1')
        expect(wrap.previousElementSibling!.textContent).toBe('前面的句子結')
        // 文字內容沒變（編號後面接的是被收起來的註釋「1 內容」），也沒有多出任何不可見字元
        expect(w.find('p').text()).toBe('前面的句子結尾11內容。後面。')
        expect(w.find('p').text()).not.toMatch(/[\u2060\u200b]/)
      })

      it('它應該以字形為單位拆，不把 emoji 組合字拆成兩半', async () => {
        const w = await mountMd('家人👨‍👩‍👧[^1]\n\n[^1]: 內容')
        expect(wrapperOf(w).textContent).toBe('👨‍👩‍👧1')
      })

      it('它應該在結尾是空白時不拆（空白本來就是斷行點），段落開頭或前面是行內元素時只包編號', async () => {
        const spaced = await mountMd('word [^1]\n\n[^1]: 內容')
        expect(wrapperOf(spaced).textContent).toBe('1')
        expect(wrapperOf(spaced).previousElementSibling!.textContent).toBe('word ')
        const atStart = await mountMd('[^1]開頭\n\n[^1]: 內容')
        expect(wrapperOf(atStart).textContent).toBe('1')
        const afterStrong = await mountMd('**粗**[^1]\n\n[^1]: 內容')
        expect(wrapperOf(afterStrong).textContent).toBe('1')
      })

      it('它應該在文字只有一個字時不留空的 span', async () => {
        const w = await mountMd('註[^1]\n\n[^1]: 內容')
        const p = w.find('p').element
        expect(Array.from(p.children).map((el) => el.textContent)).toEqual(['註1', '1內容'])
      })

      it('它應該讓註釋元素留在 nowrap span 外面（不繼承 nowrap），仍緊接在編號後面', async () => {
        const w = await mountMd('甲乙[^1]\n\n[^1]: 內容')
        const wrap = wrapperOf(w)
        expect(wrap.nextElementSibling!.id).toBe(markers(w)[0]!.attributes('aria-controls'))
        expect(wrap.contains(wrap.nextElementSibling)).toBe(false)
      })

      it('它應該把找不到定義的引用、註釋裡的巢狀引用照舊留成文字，前面的文字不拆', async () => {
        const w = await mountMd('句子[^1]\n\n[^1]: 內容又引用[^2]\n\n[^2]: 第二則')
        expect(w.find('section ol li').text()).toContain('內容又引用[^2]')
        expect(w.find('section ol li sup').exists()).toBe(false)
      })

      it('它應該讓標題裡的編號不影響標題的 id', async () => {
        const w = await mountMd('## 標題[^1]\n\n[^1]: 內容')
        expect(w.find('h3').attributes('id')).toBe('標題')
      })
    })

    it('它應該不把定義在原地當成普通段落印出來，內容只出現在註釋清單與各引用處的註釋元素', async () => {
      const w = await mountMd('段落[^1]\n\n[^1]: 只能在註釋裡看到我')
      // 以前定義會變成緊接在後面的第二個 <p>；現在頂層只剩內文段落與文末的註釋區塊
      expect(Array.from((w.element as HTMLElement).children).map((el) => el.tagName)).toEqual([
        'P',
        'SECTION',
      ])
      expect(w.find('section ol li').text()).toContain('只能在註釋裡看到我')
    })

    it('它應該在文末列出「註釋」清單：依編號排序、孤兒定義也列出、被引用的每處都有回連結', async () => {
      const w = await mountMd(SOURCE)
      expect(w.find('section h3').text()).toBe('註釋')
      const items = endItems(w)
      expect(items.map((li) => li.text())).toEqual([
        expect.stringContaining('乙的內容'),
        expect.stringContaining('甲的內容'),
        expect.stringContaining('沒人引用'),
      ])

      const ids = markers(w).map((m) => m.attributes('id'))
      // 註釋 1（乙）被引用兩次：兩個回連結，各自指到對應引用的 id
      const backOfFirst = items[0]!.findAll('a[href^="#"]')
      expect(backOfFirst.map((a) => a.attributes('href'))).toEqual([`#${ids[0]}`, `#${ids[2]}`])
      expect(backOfFirst.map((a) => a.attributes('aria-label'))).toEqual([
        '回到內文第 1 處引用',
        '回到內文第 2 處引用',
      ])
      // 註釋 2（甲）一次：一個回連結
      expect(items[1]!.findAll('a[href^="#"]').map((a) => a.attributes('href'))).toEqual([
        `#${ids[1]}`,
      ])
      // 孤兒：沒有地方可回
      expect(items[2]!.findAll('a[href^="#"]')).toHaveLength(0)
      // 每個回連結的目標真的存在
      backOfFirst.forEach((a) =>
        expect(w.find(`[id="${a.attributes('href')!.slice(1)}"]`).exists()).toBe(true),
      )
    })

    it('它應該在沒有註腳的文章不產生「註釋」區塊', async () => {
      const w = await mountMd('一般的段落，[^nope] 沒有定義就只是文字。')
      expect(w.find('section').exists()).toBe(false)
      expect(markers(w)).toHaveLength(0)
      expect(w.text()).toContain('[^nope]')
    })

    it('它應該讓註腳定義裡的標題不使後面標題的 id 錯開', async () => {
      const w = await mountMd('## 甲\n\n文字[^1]\n\n[^1]: # 註內標題\n\n## 乙')
      // 註釋裡的標題不產生 id，也不佔用 slug；「註釋」區塊自己的標題另有 id，不在這份清單裡
      const slugs = w
        .findAll('h3[id]')
        .map((h) => h.attributes('id')!)
        .filter((id) => !id.endsWith('fn-title'))
      expect(slugs).toEqual(['甲', '乙'])
      expect(w.text()).toContain('註內標題')
    })

    describe('窄螢幕：點編號在原地展開', () => {
      it('它應該預設收起；點編號展開並更新 aria-expanded，再點收起', async () => {
        const w = await mountMd('句子[^1]。\n\n[^1]: 展開的內容')
        const marker = markers(w)[0]!
        const note = w.find(`[id="${marker.attributes('aria-controls')}"]`)
        expect(marker.attributes('aria-expanded')).toBe('false')
        expect(note.attributes('hidden')).toBeDefined()

        await marker.trigger('click')
        expect(marker.attributes('aria-expanded')).toBe('true')
        expect(note.attributes('hidden')).toBeUndefined()
        expect(note.text()).toContain('展開的內容')

        await marker.trigger('click')
        expect(marker.attributes('aria-expanded')).toBe('false')
        expect(note.attributes('hidden')).toBeDefined()
      })

      it('它應該讓同一則註釋的每個引用各自展開在自己旁邊', async () => {
        const w = await mountMd('甲[^1]，乙[^1]。\n\n[^1]: 內容')
        const [first, second] = markers(w)
        await second!.trigger('click')
        expect(first!.attributes('aria-expanded')).toBe('false')
        expect(second!.attributes('aria-expanded')).toBe('true')
        // 展開的註釋緊接在被點的編號後面
        expect(second!.element.closest('sup')!.parentElement!.nextElementSibling!.id).toBe(
          second!.attributes('aria-controls'),
        )
      })

      it('它應該在編號上按 Esc 時收起', async () => {
        const w = await mountMd('句子[^1]。\n\n[^1]: 內容', { attach: true })
        const marker = markers(w)[0]!
        await marker.trigger('click')
        await marker.trigger('keydown', { key: 'Escape' })
        expect(marker.attributes('aria-expanded')).toBe('false')
        w.unmount()
      })

      it('它應該在展開的註釋裡（例如連結上）按 Esc 時收起，焦點回到編號', async () => {
        const w = await mountMd('句子[^1]。\n\n[^1]: 內容 [連結](https://example.com)', {
          attach: true,
        })
        const marker = markers(w)[0]!
        await marker.trigger('click')
        const note = w.find(`[id="${marker.attributes('aria-controls')}"]`)
        const link = note.find('a')
        ;(link.element as HTMLElement).focus()
        await link.trigger('keydown', { key: 'Escape' })
        expect(marker.attributes('aria-expanded')).toBe('false')
        expect(document.activeElement).toBe(marker.element)
        w.unmount()
      })

      it('它應該在收起的狀態下按 Esc 時不做任何事', async () => {
        const w = await mountMd('句子[^1]。\n\n[^1]: 內容')
        const marker = markers(w)[0]!
        await marker.trigger('keydown', { key: 'Escape' })
        expect(marker.attributes('aria-expanded')).toBe('false')
      })
    })

    describe('寬螢幕：邊注', () => {
      it('它應該在開了 sidenotes 且夠寬時把第一次引用的註釋當邊注，之後的引用不另外顯示', async () => {
        stubWide(true)
        const w = await mountMd('甲[^1]，乙[^1]，丙[^2]。\n\n[^1]: 一\n\n[^2]: 二', {
          sidenotes: true,
        })
        await w.vm.$nextTick()
        const sides = w.findAll('[data-fn-side]')
        expect(sides).toHaveLength(2)
        expect(sides.map((n) => n.text())).toEqual([
          expect.stringContaining('一'),
          expect.stringContaining('二'),
        ])
        expect(sides.every((n) => n.attributes('hidden') === undefined)).toBe(true)
        // 同一則的第二次引用：註釋元素隱藏，右邊不會出現兩份
        expect(w.find('[id$="fnnote-1-2"]').attributes('hidden')).toBeDefined()
        // 寬螢幕不是展開／收起，不標 aria-expanded
        expect(markers(w)[0]!.attributes('aria-expanded')).toBeUndefined()
      })

      it('它應該在版面計算跑過後讓邊注有 top，而且依引用順序遞增（不重疊）', async () => {
        stubWide(true)
        const w = await mountMd('甲[^1]乙[^2]丙[^3]\n\n[^1]: 一\n\n[^2]: 二\n\n[^3]: 三', {
          sidenotes: true,
          attach: true,
        })
        await new Promise((resolve) => setTimeout(resolve, 50))
        const tops = w
          .findAll('[data-fn-side]')
          .map((n) => parseFloat((n.element as HTMLElement).style.top))
        expect(tops.every((t) => Number.isFinite(t))).toBe(true)
        expect(tops[1]!).toBeGreaterThan(tops[0]!)
        expect(tops[2]!).toBeGreaterThan(tops[1]!)
        w.unmount()
      })

      it('它應該在點編號時固定標亮對應的邊注，再點取消（觸控裝置沒有 hover）', async () => {
        stubWide(true)
        const w = await mountMd('甲[^1]。\n\n[^1]: 一', { sidenotes: true })
        const side = () => w.find('[data-fn-side]')
        expect(side().classes()).not.toContain('text-(--text-ink-main)')
        await markers(w)[0]!.trigger('click')
        expect(side().classes()).toContain('text-(--text-ink-main)')
        await markers(w)[0]!.trigger('click')
        expect(side().classes()).not.toContain('text-(--text-ink-main)')
      })

      it('它應該在沒開 sidenotes（例如編輯頁預覽）時，就算螢幕很寬也維持點開展開，不產生邊注', async () => {
        stubWide(true)
        const w = await mountMd('甲[^1]。\n\n[^1]: 一')
        expect(w.find('[data-fn-side]').exists()).toBe(false)
        expect(markers(w)[0]!.attributes('aria-expanded')).toBe('false')
      })

      it('它應該在螢幕不夠寬時，就算開了 sidenotes 也維持點開展開', async () => {
        stubWide(false)
        const w = await mountMd('甲[^1]。\n\n[^1]: 一', { sidenotes: true })
        expect(w.find('[data-fn-side]').exists()).toBe(false)
        expect(markers(w)[0]!.attributes('aria-expanded')).toBe('false')
      })

      it('它應該在任何模式下都保留文末清單', async () => {
        stubWide(true)
        const w = await mountMd('甲[^1]。\n\n[^1]: 一', { sidenotes: true })
        expect(w.find('section h3').text()).toBe('註釋')
        expect(endItems(w)).toHaveLength(1)
      })
    })

    describe('連結與標題裡的引用', () => {
      // 註釋元素（邊注／展開框）長在 <a> 裡，點邊注等於點連結、還會有 <a> 套 <a>；長在 <h3> 裡，
      // 註釋會被讀進標題的無障礙名稱。所以註釋要接在連結／標題後面；連結裡的編號按鈕也不能留在 <a> 裡。
      const LINKS = [
        { kind: '站外連結', source: '看[連結[^1]](https://example.com)吧。', text: '連結' },
        { kind: '站內連結（RouterLink）', source: '看[專案[^1]](/projects/7)吧。', text: '專案' },
        {
          kind: '連結裡有粗體再接引用',
          source: '看[**粗**連結[^1]](https://example.com)吧。',
          text: '粗連結',
        },
      ]
      const DEF = '\n\n[^1]: 註釋內容'
      const inside = (w: Wrapper, outer: string) =>
        w.findAll(`${outer} button, ${outer} [id*="fnnote"]`)

      describe.each([
        { name: '窄螢幕（點開展開）', wide: false },
        { name: '寬螢幕（邊注）', wide: true },
      ])('$name', ({ wide }) => {
        const mountIt = async (source: string) => {
          stubWide(wide)
          return mountMd(source + DEF, { sidenotes: true, attach: true })
        }

        it.each(LINKS)('它應該讓連結（$kind）裡不含編號按鈕或註釋元素', async ({ source }) => {
          const w = await mountIt(source)
          expect(w.findAll('a').length).toBeGreaterThan(0)
          expect(inside(w, 'a')).toHaveLength(0)
          if (!wide) {
            // 展開後註釋也不在連結裡
            await markers(w)[0]!.trigger('click')
            expect(inside(w, 'a')).toHaveLength(0)
          }
          w.unmount()
        })

        it.each(LINKS)(
          '它應該把編號與註釋接在連結（$kind）後面，連結文字保持完整',
          async ({ source, text }) => {
            const w = await mountIt(source)
            const a = w.find('a').element
            const marker = markers(w)[0]!
            const markerWrap = marker.element.closest('sup')!.parentElement!
            expect(a.nextElementSibling).toBe(markerWrap)
            expect(markerWrap.nextElementSibling!.id).toBe(
              wide ? marker.attributes('aria-describedby') : marker.attributes('aria-controls'),
            )
            // 連結最後一個字不能被拆去跟編號（編號不在連結裡了）
            expect(a.textContent).toBe(text)
            expect(w.find('p').text()).toContain('吧。')
            w.unmount()
          },
        )

        it('它應該讓標題裡不含註釋元素，編號留在標題裡、註釋接在標題後面，標題 id 不變', async () => {
          const w = await mountIt('## 標題[^1]\n\n內文')
          const h3 = w.find('h3')
          expect(h3.attributes('id')).toBe('標題')
          expect(h3.findAll('[id*="fnnote"]')).toHaveLength(0)
          expect(h3.findAll('button[data-fn-number]')).toHaveLength(1)
          const marker = markers(w)[0]!
          expect(h3.element.nextElementSibling!.id).toBe(
            wide ? marker.attributes('aria-describedby') : marker.attributes('aria-controls'),
          )
          if (!wide) {
            await marker.trigger('click')
            expect(marker.attributes('aria-expanded')).toBe('true')
            expect(h3.findAll('[id*="fnnote"]')).toHaveLength(0)
          }
          w.unmount()
        })

        it('它應該在標題裡有連結時兩邊都守住：連結裡沒有東西，標題裡只有編號，註釋都在標題後面', async () => {
          const w = await mountIt(
            '## [連結[^1]](https://example.com) 與文字[^2]\n\n內文\n\n[^2]: 第二則',
          )
          const h3 = w.find('h3')
          expect(inside(w, 'a')).toHaveLength(0)
          expect(h3.findAll('[id*="fnnote"]')).toHaveLength(0)
          expect(h3.findAll('button[data-fn-number]').map((b) => b.text())).toEqual(['1', '2'])
          const afterHeading = Array.from(h3.element.parentElement!.children).slice(
            Array.from(h3.element.parentElement!.children).indexOf(h3.element) + 1,
          )
          expect(afterHeading.slice(0, 2).map((el) => el.id)).toEqual([
            expect.stringMatching(/fnnote-1-1$/),
            expect.stringMatching(/fnnote-2-1$/),
          ])
          w.unmount()
        })
      })

      it('它應該讓同一個連結裡的多個引用各自的註釋緊跟在自己的編號後面', async () => {
        stubWide(true)
        const w = await mountMd(
          '看[連結[^1][^2]](https://example.com)吧。\n\n[^1]: 一\n\n[^2]: 二',
          {
            sidenotes: true,
            attach: true,
          },
        )
        const a = w.find('a').element
        const seq = Array.from(a.parentElement!.children)
        // 後面還有「吧。」的文字 span，只看緊接在連結後面的四個
        const after = seq.slice(seq.indexOf(a) + 1, seq.indexOf(a) + 5)
        // a, m1, n1, m2, n2
        expect(after.map((el) => (el.id ? 'note' : 'marker'))).toEqual([
          'marker',
          'note',
          'marker',
          'note',
        ])
        expect(after.filter((el) => el.id).map((el) => el.id)).toEqual([
          expect.stringMatching(/fnnote-1-1$/),
          expect.stringMatching(/fnnote-2-1$/),
        ])
        // 每則註釋緊鄰在自己的編號後面（編號與註釋的對應順序）
        expect(after[0]!.querySelector('button')!.getAttribute('data-fn-number')).toBe('1')
        expect(after[2]!.querySelector('button')!.getAttribute('data-fn-number')).toBe('2')
        w.unmount()
      })

      it('它應該讓文件裡任何 <a> 都不含 button 或註釋元素（連結、標題、一般文字混用）', async () => {
        stubWide(true)
        const w = await mountMd(
          '前文[^1]，[連結[^2]](https://example.com)，[站內[^1]](/projects/7)。\n\n## 標題[^2]\n\n[^1]: 一\n\n[^2]: 二',
          { sidenotes: true, attach: true },
        )
        expect(inside(w, 'a')).toHaveLength(0)
        // 回連結（<a href="#…">）本身也不含 button
        expect(w.findAll('section a button')).toHaveLength(0)
        w.unmount()
      })
    })

    describe('邊注標亮：hover／聚焦（內文、標題、連結裡的引用一致）', () => {
      // jsdom 沒有 :hover，用狀態（mouseenter／focus）驅動標亮；標亮的樣子是邊注多了 text-(--text-ink-main)
      const LIT = 'text-(--text-ink-main)'
      const noteOf = (w: Wrapper, i: number) =>
        w.find(`[id="${markers(w)[i]!.attributes('aria-describedby')}"]`)
      const lit = (w: Wrapper, i: number) => noteOf(w, i).classes().includes(LIT)
      const DEFS = '\n\n[^1]: 一\n\n[^2]: 二'
      // jsdom 對 :focus-visible 的判斷不穩定（同一支測試檔裡，前面的測試留下的狀態會讓它回 false），
      // 所以測試自己指定：focusEl 當作鍵盤聚焦（:focus-visible 成立），滑鼠點下去的聚焦另外測
      const focusEl = async (w: Wrapper, el: Element) => {
        vi.spyOn(el, 'matches').mockImplementation((q) => q === ':focus-visible')
        ;(el as HTMLElement).focus()
        await w.vm.$nextTick()
      }
      const blurEl = async (w: Wrapper, el: Element) => {
        ;(el as HTMLElement).blur()
        await w.vm.$nextTick()
      }
      const mountWide = async (source: string) => {
        stubWide(true)
        return mountMd(source + DEFS, { sidenotes: true, attach: true })
      }

      it.each([
        { kind: '內文', source: '句子[^1]，再一句[^2]。' },
        { kind: '標題', source: '## 標題[^1]與[^2]\n\n內文' },
        { kind: '連結', source: '[連結[^1]](https://example.com)與[^2]。' },
        { kind: '標題裡的連結', source: '## [連結[^1]](https://example.com)與[^2]\n\n內文' },
      ])(
        '它應該在 hover 第一次引用（$kind）時標亮對應的邊注，移開就取消，只動自己那一則',
        async ({ source }) => {
          const w = await mountWide(source)
          expect(markers(w)).toHaveLength(2)
          expect([lit(w, 0), lit(w, 1)]).toEqual([false, false])
          await markers(w)[1]!.trigger('mouseenter')
          expect([lit(w, 0), lit(w, 1)]).toEqual([false, true])
          await markers(w)[1]!.trigger('mouseleave')
          await markers(w)[0]!.trigger('mouseenter')
          expect([lit(w, 0), lit(w, 1)]).toEqual([true, false])
          await markers(w)[0]!.trigger('mouseleave')
          expect([lit(w, 0), lit(w, 1)]).toEqual([false, false])
          w.unmount()
        },
      )

      it.each([
        { kind: '內文', source: '句子[^1]。' },
        { kind: '標題', source: '## 標題[^1]\n\n內文' },
      ])(
        '它應該在鍵盤聚焦編號（$kind）時標亮邊注，失焦取消；滑鼠移開不蓋掉還在的焦點',
        async ({ source }) => {
          const w = await mountWide(source)
          const marker = markers(w)[0]!
          await focusEl(w, marker.element)
          expect(lit(w, 0)).toBe(true)
          // 同時 hover 又移開：焦點還在，邊注要繼續亮
          await marker.trigger('mouseenter')
          await marker.trigger('mouseleave')
          expect(lit(w, 0)).toBe(true)
          await blurEl(w, marker.element)
          expect(lit(w, 0)).toBe(false)
          w.unmount()
        },
      )

      it('它應該讓後續引用的 hover／鍵盤聚焦也標亮同一則註釋的邊注（邊注只貼在第一次引用）', async () => {
        const w = await mountWide('甲[^1]，乙[^1]，丙[^2]。')
        expect(markers(w)).toHaveLength(3)
        // 第二個編號是 [^1] 的第二次引用，沒有自己的邊注，標亮的是第一次引用旁邊那一則
        await markers(w)[1]!.trigger('mouseenter')
        expect([lit(w, 0), lit(w, 2)]).toEqual([true, false])
        await markers(w)[1]!.trigger('mouseleave')
        expect(lit(w, 0)).toBe(false)
        await focusEl(w, markers(w)[1]!.element)
        expect([lit(w, 0), lit(w, 2)]).toEqual([true, false])
        await blurEl(w, markers(w)[1]!.element)
        expect(lit(w, 0)).toBe(false)
        w.unmount()
      })

      it('它應該在同一則註釋的兩處引用之間移動時，邊注一直亮到移出最後一處', async () => {
        const w = await mountWide('甲[^1]，乙[^1]。')
        await markers(w)[0]!.trigger('mouseenter')
        await markers(w)[0]!.trigger('mouseleave')
        await markers(w)[1]!.trigger('mouseenter')
        expect(lit(w, 0)).toBe(true)
        await markers(w)[1]!.trigger('mouseleave')
        expect(lit(w, 0)).toBe(false)
        w.unmount()
      })

      it('它應該讓滑鼠點下去取得的焦點（非 :focus-visible）不標亮邊注，也不在移開後留著', async () => {
        const w = await mountWide('句子[^1]。')
        const marker = markers(w)[0]!
        // 讓 :focus-visible 回報不成立，等於滑鼠點下去讓按鈕取得焦點的樣子
        const matches = vi.spyOn(marker.element, 'matches').mockReturnValue(false)
        await marker.trigger('mouseenter')
        ;(marker.element as HTMLElement).focus()
        await w.vm.$nextTick()
        expect(matches).toHaveBeenCalledWith(':focus-visible')
        await marker.trigger('mouseleave')
        expect(lit(w, 0)).toBe(false)
        w.unmount()
      })

      it('它應該在環境不認得 :focus-visible（matches 拋錯）時，視為鍵盤聚焦照常標亮', async () => {
        const w = await mountWide('句子[^1]。')
        const marker = markers(w)[0]!
        vi.spyOn(marker.element, 'matches').mockImplementation(() => {
          throw new DOMException('not a valid selector', 'SyntaxError')
        })
        await focusEl(w, marker.element)
        expect(lit(w, 0)).toBe(true)
        w.unmount()
      })

      it('它應該讓編號本身只在固定標亮時變粗，hover 只標亮邊注', async () => {
        const w = await mountWide('句子[^1]。')
        const marker = markers(w)[0]!
        await marker.trigger('mouseenter')
        expect(marker.classes()).not.toContain('font-bold')
        await marker.trigger('click')
        expect(marker.classes()).toContain('font-bold')
        // 固定標亮後滑鼠移開仍亮，再點才取消
        await marker.trigger('mouseleave')
        expect(lit(w, 0)).toBe(true)
        await marker.trigger('click')
        expect(lit(w, 0)).toBe(false)
        w.unmount()
      })

      it('它應該在窄螢幕不產生邊注，hover 沒有作用', async () => {
        stubWide(false)
        const w = await mountMd('## 標題[^1]\n\n[^1]: 一', { sidenotes: true, attach: true })
        await markers(w)[0]!.trigger('mouseenter')
        expect(w.find('[data-fn-side]').exists()).toBe(false)
        expect(markers(w)[0]!.attributes('aria-expanded')).toBe('false')
        w.unmount()
      })

      it('它應該在換文章內容後清掉卡住的 hover 標亮', async () => {
        const w = await mountWide('句子[^1]。')
        await markers(w)[0]!.trigger('mouseenter')
        expect(lit(w, 0)).toBe(true)
        await w.setProps({ source: '另一句[^1]。\n\n[^1]: 新的' })
        expect(lit(w, 0)).toBe(false)
        w.unmount()
      })
    })

    describe('註釋內容裡的區塊節點', () => {
      // 註釋元素是 <span>，長在內文的 <p> 裡面；<p> 裡面不能有 <p>、<ul>、<h*>，所以註釋裡的區塊也要用 <span>
      const BLOCKS = 'ul, ol, li, p, h1, h2, h3, h4, h5, h6'
      const SOURCE = [
        '句子[^1]。',
        '',
        '[^1]: 第一段',
        '',
        '    - 清單甲',
        '    - 清單乙',
        '',
        '    1. 有序一',
        '    2. 有序二',
        '',
        '    ## 註內標題',
        '',
        '    第二段',
      ].join('\n')

      it('它應該不在註釋元素與文末清單項目裡產生 <p>、<ul>、<ol>、<li>、<h*>', async () => {
        const w = await mountMd(SOURCE)
        const notes = w.findAll('[id*="fnnote"]')
        expect(notes).toHaveLength(1)
        expect(notes[0]!.findAll(BLOCKS)).toHaveLength(0)
        // 文末清單項目本身就是 <li>，裡面不該再有別的清單或段落
        expect(w.findAll('section ol > li')[0]!.findAll(BLOCKS)).toHaveLength(0)
      })

      it('它應該讓內文的每個 <p> 裡都沒有區塊元素', async () => {
        const w = await mountMd(SOURCE)
        const paragraphs = w.findAll('p')
        expect(paragraphs.length).toBeGreaterThan(0)
        paragraphs.forEach((p) =>
          expect(p.findAll(`${BLOCKS}, pre, blockquote, div`)).toHaveLength(0),
        )
      })

      it('它應該保留註釋內容與語意：清單用 role、標題粗體另起一行，第二段另起一行', async () => {
        const w = await mountMd(SOURCE)
        const note = w.find('[id*="fnnote"]')
        const lists = note.findAll('[role="list"]')
        expect(lists).toHaveLength(2)
        // 標記是 aria-hidden 的獨立 <span>，項目文字不含它
        expect(
          lists.map((l) =>
            l.findAll('[role="listitem"]').map((li) => li.find('span:not([aria-hidden])').text()),
          ),
        ).toEqual([
          ['清單甲', '清單乙'],
          ['有序一', '有序二'],
        ])
        const title = note.findAll('span').find((s) => s.text() === '註內標題')!
        expect(title.classes()).toEqual(expect.arrayContaining(['block', 'font-bold']))
        expect(note.text()).toContain('第二段')
      })

      describe('程式碼區塊、引用區塊、表格、分隔線（不產生區塊元素）', () => {
        // <p> 的內容模型只允許行內內容：這些區塊元素長在 <p> 裡面就是無效巢狀
        const NO_BLOCK =
          'pre, blockquote, table, thead, tbody, tfoot, tr, th, td, div, hr, section, ul, ol, li, p, h1, h2, h3, h4, h5, h6'
        const RICH = [
          '句子[^1]。',
          '',
          '[^1]: 說明如下：',
          '',
          '    ```js',
          '    const a = 1',
          '    if (a) {',
          '      go()',
          '    }',
          '    ```',
          '',
          '    > 引用第一段',
          '    >',
          '    > 引用第二段',
          '',
          '    | 欄 | 值 | 說明 |',
          '    |:---|---:|:---:|',
          '    | 甲 | 1 | 一 |',
          '    | 乙 | 22 | 二 |',
          '',
          '    ---',
          '',
          '    結尾一句',
        ].join('\n')
        const note = (w: Wrapper) => w.find('[id*="fnnote"]')
        const noBlockInParagraphs = (w: Wrapper) => {
          const paragraphs = w.findAll('p')
          expect(paragraphs.length).toBeGreaterThan(0)
          paragraphs.forEach((p) => expect(p.findAll(NO_BLOCK)).toHaveLength(0))
        }

        it('它應該讓每個 <p> 裡都沒有區塊元素，註釋元素裡也沒有', async () => {
          const w = await mountMd(RICH)
          noBlockInParagraphs(w)
          expect(note(w).findAll(NO_BLOCK)).toHaveLength(0)
        })

        it.each([
          { name: '窄螢幕（展開後）', wide: false },
          { name: '寬螢幕（邊注）', wide: true },
        ])(
          '它應該在$name也沒有區塊元素，標題裡的引用（註釋接在標題後面）同樣',
          async ({ wide }) => {
            stubWide(wide)
            const w = await mountMd(RICH.replace('句子[^1]。', '## 標題[^1]\n\n句子[^1]。'), {
              sidenotes: true,
              attach: true,
            })
            if (!wide) await markers(w)[0]!.trigger('click')
            noBlockInParagraphs(w)
            const first = w.find('[id*="fnnote-1-1"]')
            expect(first.attributes('hidden')).toBeUndefined()
            expect(first.findAll(NO_BLOCK)).toHaveLength(0)
            // 內容都還在
            expect(first.text()).toContain('const a = 1')
            expect(first.text()).toContain('引用第二段')
            expect(first.text()).toContain('乙')
            w.unmount()
          },
        )

        it('它應該在文末清單項目（<li>）裡也不用區塊元素，內容與註釋元素一致', async () => {
          const w = await mountMd(RICH)
          const li = w.findAll('section ol > li')[0]!
          expect(li.findAll(NO_BLOCK)).toHaveLength(0)
          expect(li.text()).toContain('const a = 1')
          expect(li.findAll('[role="table"]')).toHaveLength(1)
          expect(li.findAll('[role="blockquote"]')).toHaveLength(1)
        })

        it('它應該把程式碼區塊畫成 display:block 的 <code>，保留換行與縮排、可橫向捲動、帶語言', async () => {
          const w = await mountMd(RICH)
          const code = note(w).find('code')
          expect(code.classes()).toEqual(
            expect.arrayContaining(['block', 'whitespace-pre', 'overflow-x-auto', 'font-mono']),
          )
          expect(code.element.textContent).toBe('const a = 1\nif (a) {\n  go()\n}')
          expect(code.attributes('data-lang')).toBe('js')
          // 沒有 pre，也沒有外層再包一個 code
          expect(note(w).findAll('pre')).toHaveLength(0)
          expect(code.findAll('code')).toHaveLength(0)
        })

        it('它應該把引用區塊畫成 role=blockquote，多個段落各自一塊並有間距', async () => {
          const w = await mountMd(RICH)
          const quotes = note(w).findAll('[role="blockquote"]')
          expect(quotes).toHaveLength(1)
          const quote = quotes[0]!
          expect(quote.element.tagName).toBe('SPAN')
          expect(quote.classes()).toEqual(expect.arrayContaining(['block', 'border-l-[3px]']))
          const paras = Array.from(quote.element.children)
          expect(paras.map((p) => p.textContent)).toEqual(['引用第一段', '引用第二段'])
          expect(paras.every((p) => p.classList.contains('block'))).toBe(true)
          expect(quote.classes()).toContain('[&>*+*]:mt-1.5')
        })

        it('它應該把表格畫成 role=table／rowgroup／row／columnheader／cell，欄位對齊照 GFM', async () => {
          const w = await mountMd(RICH)
          const table = note(w).find('[role="table"]')
          expect(table.element.tagName).toBe('SPAN')
          expect(table.classes()).toEqual(expect.arrayContaining(['table', 'border-collapse']))
          // 外層是可橫向捲動的區塊
          expect(table.element.parentElement!.classList.contains('overflow-x-auto')).toBe(true)
          const groups = table.findAll('[role="rowgroup"]')
          expect(groups.map((g) => g.classes().find((c) => c.startsWith('table-')))).toEqual([
            'table-header-group',
            'table-row-group',
          ])
          const rows = table.findAll('[role="row"]')
          expect(rows).toHaveLength(3)
          expect(rows.every((r) => r.classes().includes('table-row'))).toBe(true)
          const header = table.findAll('[role="columnheader"]')
          expect(header.map((c) => c.text())).toEqual(['欄', '值', '說明'])
          expect(header.every((c) => c.element.parentElement === rows[0]!.element)).toBe(true)
          const cells = table.findAll('[role="cell"]')
          expect(cells.map((c) => c.text())).toEqual(['甲', '1', '一', '乙', '22', '二'])
          expect(cells.every((c) => c.classes().includes('table-cell'))).toBe(true)
          // 對齊：左、右、置中
          const align = (c: (typeof cells)[number]) =>
            c.classes().find((k) => ['text-left', 'text-right', 'text-center'].includes(k))
          expect(cells.slice(0, 3).map(align)).toEqual(['text-left', 'text-right', 'text-center'])
        })

        it('它應該把只有表頭、沒有資料列的表格也畫好，不炸掉', async () => {
          const w = await mountMd('句子[^1]。\n\n[^1]: 表：\n\n    | 欄 | 值 |\n    |---|---|')
          const table = note(w).find('[role="table"]')
          expect(table.findAll('[role="row"]')).toHaveLength(1)
          expect(table.findAll('[role="columnheader"]')).toHaveLength(2)
          expect(table.findAll('[role="cell"]')).toHaveLength(0)
          noBlockInParagraphs(w)
        })

        it('它應該把分隔線畫成 role=separator 的 <span>', async () => {
          const w = await mountMd(RICH)
          const sep = note(w).findAll('[role="separator"]')
          expect(sep).toHaveLength(1)
          expect(sep[0]!.element.tagName).toBe('SPAN')
          expect(note(w).findAll('hr')).toHaveLength(0)
        })

        it('它應該讓清單項目與引用裡的程式碼、巢狀引用也不產生區塊元素', async () => {
          const w = await mountMd(
            [
              '句子[^1]。',
              '',
              '[^1]: 註',
              '',
              '    - 項目',
              '',
              '      ```',
              '      code in item',
              '      ```',
              '',
              '    > 外層',
              '    >',
              '    > > 內層引用',
              '    >',
              '    > ```',
              '    > code in quote',
              '    > ```',
            ].join('\n'),
          )
          expect(note(w).findAll(NO_BLOCK)).toHaveLength(0)
          expect(note(w).text()).toContain('code in item')
          expect(note(w).text()).toContain('code in quote')
          expect(note(w).findAll('[role="blockquote"]')).toHaveLength(2)
          noBlockInParagraphs(w)
        })

        it('它應該讓註釋外的程式碼區塊、引用、表格、分隔線仍是真的區塊元素', async () => {
          const w = await mountMd(
            ['```', 'x', '```', '', '> 引', '', '| a |', '|---|', '| b |', '', '---'].join('\n'),
          )
          expect(w.findAll('pre')).toHaveLength(1)
          expect(w.findAll('blockquote')).toHaveLength(1)
          expect(w.findAll('table')).toHaveLength(1)
          expect(w.findAll('hr')).toHaveLength(1)
          expect(w.findAll('th')).toHaveLength(1)
          expect(w.findAll('td')).toHaveLength(1)
          expect(w.findAll('[role="table"], [role="blockquote"], [role="separator"]')).toHaveLength(
            0,
          )
        })
      })

      describe('清單標記（不用 display:list-item，不動外層 <ol> 的計數器）', () => {
        type Dom = ReturnType<Wrapper['find']>
        const noteOf = (w: Wrapper): Dom => w.find('[id*="fnnote"]')
        const markerTexts = (list: Dom) =>
          list.findAll(':scope > [role="listitem"] > [aria-hidden="true"]').map((m) => m.text())

        it('它應該為有序清單畫 N. 標記，start 不為 1 時從 start 起算', async () => {
          const w = await mountMd('句子[^1]。\n\n[^1]: 註\n\n    1. 甲\n    2. 乙\n    3. 丙')
          expect(markerTexts(noteOf(w).find('[role="list"]'))).toEqual(['1.', '2.', '3.'])
          const w4 = await mountMd('句子[^1]。\n\n[^1]: 註\n\n    4. 甲\n    5. 乙')
          expect(markerTexts(noteOf(w4).find('[role="list"]'))).toEqual(['4.', '5.'])
        })

        it('它應該為無序清單畫圓點標記', async () => {
          const w = await mountMd('句子[^1]。\n\n[^1]: 註\n\n    - 甲\n    - 乙')
          expect(markerTexts(noteOf(w).find('[role="list"]'))).toEqual(['•', '•'])
        })

        it('它應該讓巢狀清單縮進在項目內容裡，各自編號', async () => {
          const w = await mountMd(
            '句子[^1]。\n\n[^1]: 註\n\n    1. 甲\n       - 子一\n       - 子二\n    2. 乙',
          )
          const lists = noteOf(w).findAll('[role="list"]')
          expect(lists).toHaveLength(2)
          const outer = lists[0]!
          expect(markerTexts(outer)).toEqual(['1.', '2.'])
          // 巢狀清單在外層項目的內容欄（第二欄）裡，才會縮進
          const nested = outer.find('[role="listitem"] > span:not([aria-hidden]) [role="list"]')
          expect(nested.exists()).toBe(true)
          expect(markerTexts(nested)).toEqual(['•', '•'])
        })

        it('它應該讓標記不被讀出，項目仍是 role=listitem', async () => {
          const w = await mountMd('句子[^1]。\n\n[^1]: 註\n\n    1. 甲')
          const item = noteOf(w).find('[role="listitem"]')
          expect(item.find('[aria-hidden="true"]').text()).toBe('1.')
          expect(item.attributes('role')).toBe('listitem')
        })

        it('它應該讓註釋裡的任務項目不畫圓點，核取方塊在標記欄、第一段文字在內容欄的行內容器裡', async () => {
          const w = await mountMd(
            '句子[^1]。\n\n[^1]: 註\n\n    - [x] 做完了\n\n      補充\n    - [ ] 還沒\n    - 一般',
          )
          const list = noteOf(w).find('[role="list"]')
          const items = list.findAll(':scope > [role="listitem"]')
          // 只有一般項目有圓點；任務項目沒有任何 aria-hidden 標記（核取方塊要讓螢幕閱讀器讀到）
          expect(markerTexts(list)).toEqual(['•'])
          expect(items[0]!.find('[aria-hidden="true"]').exists()).toBe(false)
          // 任務項目跟一般項目同一個兩欄結構：標記欄放核取方塊，內容欄放文字
          const [markerCol, contentCol] = Array.from(items[0]!.element.children)
          expect(items[0]!.classes()).toContain('grid')
          expect(markerCol!.querySelector('input[type="checkbox"]')).not.toBeNull()
          expect(contentCol!.querySelector('input')).toBeNull()
          const firstLine = contentCol!.firstElementChild!
          expect(firstLine.tagName).toBe('SPAN')
          expect(firstLine.textContent).toBe('做完了')
          expect(firstLine.classList.contains('block')).toBe(false)
          // 後面的段落仍是區塊，在內容欄裡
          expect(contentCol!.textContent).toContain('補充')
          expect(items[2]!.find('input').exists()).toBe(false)
        })

        it('它應該讓任務項目底下的巢狀清單跟一般項目一樣，在內容欄裡縮進', async () => {
          const w = await mountMd(
            '句子[^1]。\n\n[^1]: 註\n\n    - [ ] 任務\n      - 子一\n    - 一般\n      - 子二',
          )
          const items = noteOf(w).find('[role="list"]').findAll(':scope > [role="listitem"]')
          const nestedOf = (item: (typeof items)[number]) => {
            const nested = item.element.querySelector('[role="list"]')!
            // 巢狀清單的祖先鏈：直接在第二欄（內容欄）底下，而不是跟標記欄並排或掛在項目底下
            const col = nested.closest('[role="listitem"] > *')!
            return {
              colIndex: Array.from(item.element.children).indexOf(col),
              colClass: col.className,
              firstChildText: col.firstElementChild!.textContent,
            }
          }
          const task = nestedOf(items[0]!)
          const bullet = nestedOf(items[1]!)
          expect(task.colIndex).toBe(1)
          expect(task.colIndex).toBe(bullet.colIndex)
          expect(task.colClass).toBe(bullet.colClass)
          // 內容欄先是自己的文字，才是巢狀清單
          expect(task.firstChildText).toBe('任務')
          expect(bullet.firstChildText).toBe('一般')
          expect(items[0]!.classes()).toEqual(items[1]!.classes())
        })

        it('它應該讓有序清單的標記欄寬依最大編號的位數統一，所有列對齊', async () => {
          const rows = (n: number, start: number) =>
            [...Array(n).keys()].map((i) => `    ${start + i}. 項${i}`).join('\n')
          const widthsOf = async (md: string) => {
            const w = await mountMd(md)
            return noteOf(w)
              .find('[role="list"]')
              .findAll(':scope > [role="listitem"] > [aria-hidden="true"]')
              .map((m) => (m.element as HTMLElement).style.minWidth)
          }
          // 98、99、100：最大編號 3 位，三列都用 4ch（3 位數 + 句點），不是各列依自己的位數
          expect(await widthsOf(`句子[^1]。\n\n[^1]: 註\n\n${rows(3, 98)}`)).toEqual([
            '4ch',
            '4ch',
            '4ch',
          ])
          // 8、9、10：最大編號 2 位
          expect(await widthsOf(`句子[^1]。\n\n[^1]: 註\n\n${rows(3, 8)}`)).toEqual([
            '3ch',
            '3ch',
            '3ch',
          ])
          // 1、2：1 位
          expect(await widthsOf(`句子[^1]。\n\n[^1]: 註\n\n${rows(2, 1)}`)).toEqual(['2ch', '2ch'])
        })

        it('它應該不在註釋裡產生任何 list-item 元素（會讓外層 <ol> 的計數器跳號）', async () => {
          const w = await mountMd(
            '句子[^1]。\n\n[^1]: 註\n\n    1. 甲\n       - 子\n    2. 乙\n\n    - 丙',
          )
          for (const scope of [noteOf(w), w.find('section ol > li')]) {
            expect(scope.findAll('.list-item, .list-decimal, .list-disc')).toHaveLength(0)
            const display = scope
              .findAll('*')
              .map((el) => (el.element as HTMLElement).style.display)
              .filter(Boolean)
            expect(display).not.toContain('list-item')
          }
          // 真正的清單只有文末那一個 <ol>
          expect(w.findAll('ol')).toHaveLength(1)
        })
      })

      it('它應該讓註釋裡的標題不編入目錄、不影響後面標題的 id', async () => {
        const w = await mountMd(`${SOURCE}\n\n## 後面的標題`)
        expect(w.findAll('h3[id]').map((h) => h.attributes('id'))).toContain('後面的標題')
        expect(w.findAll('h3').some((h) => h.text() === '註內標題')).toBe(false)
      })
    })

    describe('邊注排版的監聽與重排', () => {
      afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
      })
      const MD = '甲[^1]。\n\n[^1]: 一'
      const rafWait = () => new Promise((resolve) => setTimeout(resolve, 50))
      const observerSpy = () => {
        const instances: {
          observe: ReturnType<typeof vi.fn>
          disconnect: ReturnType<typeof vi.fn>
        }[] = []
        vi.stubGlobal(
          'ResizeObserver',
          class {
            observe = vi.fn()
            disconnect = vi.fn()
            constructor() {
              instances.push(this)
            }
          },
        )
        return instances
      }
      const windowListeners = (spy: { mock: { calls: unknown[][] } }) =>
        spy.mock.calls.map((call) => call[0]).filter((type) => type === 'resize' || type === 'load')

      it('它應該在沒開 sidenotes 時不掛 resize、load、ResizeObserver 監聽', async () => {
        const add = vi.spyOn(window, 'addEventListener')
        const observers = observerSpy()
        stubWide(true)
        const w = await mountMd(MD, { attach: true })
        expect(windowListeners(add)).toEqual([])
        expect(observers).toHaveLength(0)
        w.unmount()
      })

      it('它應該在開了 sidenotes 時掛上監聽，卸載時全部拆掉', async () => {
        const add = vi.spyOn(window, 'addEventListener')
        const remove = vi.spyOn(window, 'removeEventListener')
        const observers = observerSpy()
        stubWide(true)
        const w = await mountMd(MD, { sidenotes: true, attach: true })
        expect(windowListeners(add).sort()).toEqual(['load', 'resize'])
        expect(observers).toHaveLength(1)
        expect(observers[0]!.observe).toHaveBeenCalledTimes(1)
        w.unmount()
        expect(windowListeners(remove).sort()).toEqual(['load', 'resize'])
        expect(observers[0]!.disconnect).toHaveBeenCalledTimes(1)
      })

      it('它應該在點編號固定標亮後重新排版（元件自己的狀態改變，不靠容器尺寸變動）', async () => {
        stubWide(true)
        const w = await mountMd(MD, { sidenotes: true, attach: true })
        await rafWait()
        const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        await markers(w)[0]!.trigger('click')
        await rafWait()
        expect(rect).toHaveBeenCalled()
        w.unmount()
      })

      it('它應該在寬窄模式切換後重新排版：變寬時邊注有 top', async () => {
        let onChange: (() => void) | undefined
        const media = {
          matches: false,
          addEventListener: (...args: [string, () => void]) => (onChange = args[1]),
          removeEventListener: () => {},
        }
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          writable: true,
          value: () => media,
        })
        const w = await mountMd(MD, { sidenotes: true, attach: true })
        await rafWait()
        expect(w.find('[data-fn-side]').exists()).toBe(false)
        media.matches = true
        onChange!()
        await rafWait()
        expect(
          parseFloat((w.find('[data-fn-side]').element as HTMLElement).style.top),
        ).not.toBeNaN()
        w.unmount()
      })
    })

    describe('內容改變後重排', () => {
      afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
      })
      it('它應該在內容改變但容器尺寸沒變時重新排版', async () => {
        stubWide(true)
        const w = await mountMd('甲[^1]。\n\n[^1]: 一', { sidenotes: true, attach: true })
        await new Promise((resolve) => setTimeout(resolve, 50))
        const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        await w.setProps({ source: '甲[^1]乙。\n\n[^1]: 新的一' })
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(rect).toHaveBeenCalled()
        w.unmount()
      })
    })

    describe('註釋內容的消毒', () => {
      it('它應該讓註釋裡的 javascript: 與 data: 連結只留文字，不產生 href', async () => {
        const w = await mountMd(
          '句子[^1]\n\n[^1]: [點我](javascript:alert(1)) 與 [也點我](data:text/html,x)',
        )
        expect(w.html()).not.toMatch(/href="(javascript|data):/i)
        expect(
          w.findAll('a').filter((a) => /javascript|data:/i.test(a.attributes('href') ?? '')),
        ).toHaveLength(0)
        expect(w.text()).toContain('點我')
      })

      it('它應該不執行註釋裡的原始 HTML', async () => {
        const w = await mountMd(
          '句子[^1]\n\n[^1]: 內容 <img src=x onerror="alert(1)"> <script>alert(1)</script>',
        )
        expect(w.find('img').exists()).toBe(false)
        expect(w.find('script').exists()).toBe(false)
        expect(w.html()).not.toContain('onerror')
      })

      it('它應該讓註釋裡的 https 連結是站外連結、站內連結是 RouterLink，行內程式碼照常', async () => {
        const w = await mountMd(
          '句子[^1]\n\n[^1]: 見 [外部](https://example.com) 與 [專案](/projects/7)，`fetchArticle(id)`',
        )
        const note = w.find('section ol li')
        const [ext, int] = note.findAll('a').filter((a) => !a.attributes('href')!.startsWith('#'))
        expect(ext!.attributes('href')).toBe('https://example.com/')
        expect(ext!.attributes('target')).toBe('_blank')
        expect(ext!.attributes('rel')).toBe('noopener noreferrer')
        expect(int!.attributes('href')).toBe('/projects/7')
        expect(int!.attributes('target')).toBeUndefined()
        expect(note.find('code').text()).toBe('fetchArticle(id)')
      })

      it('它應該把註釋裡的巢狀引用留成文字，不產生第二層編號', async () => {
        const w = await mountMd('句子[^1]\n\n[^1]: 內容又引用[^2]\n\n[^2]: 第二則')
        expect(markers(w)).toHaveLength(1)
        expect(w.find('section ol li').text()).toContain('[^2]')
      })
    })
  })
})
