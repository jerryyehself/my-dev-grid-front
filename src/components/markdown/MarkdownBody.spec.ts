import { afterEach, describe, it, expect } from 'vitest'
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

  it('標題不加 // 前綴（程式碼註解的造型只留給技術頁）', async () => {
    const w = await mountMd('## 收斂到 View')
    const h = w.find('h3')
    expect(h.text()).toBe('收斂到 View')
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
    ])('危險協定只留文字、不產生任何 <a>：%s', async (source) => {
      const w = await mountMd(source)
      expect(w.find('a').exists()).toBe(false)
      // 文字本身可以出現（`<javascript:…>` 的連結文字就是網址），但不能有任何 href
      expect(w.html()).not.toMatch(/href/i)
      expect(w.text()).toContain(source.startsWith('<') ? 'javascript:alert(1)' : '點我')
    })

    it('https、mailto 照常是站外連結', async () => {
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

    it('內文裡的引用是上標編號按鈕，依第一次引用的順序編號、重複引用沿用同一個編號', async () => {
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

    describe('編號不會單獨落在行首', () => {
      // 中文任兩字之間都能斷行，編號又是不能再拆的行內方塊；所以前一個字要跟編號包進同一個 nowrap 的 span
      // （U+2060 在 Chromium 對行內方塊不生效，實測過，不能拿來代替）。jsdom 沒有排版，這裡驗結構。
      const wrapperOf = (w: Wrapper, i = 0) =>
        markers(w)[i]!.element.closest('sup')!.parentElement as HTMLElement

      it('文字結尾的最後一個字搬進編號的 nowrap span，前面的字留在原來的 span', async () => {
        const w = await mountMd('前面的句子結尾[^1]。後面。\n\n[^1]: 內容')
        const wrap = wrapperOf(w)
        expect(wrap.classList.contains('whitespace-nowrap')).toBe(true)
        expect(wrap.textContent).toBe('尾1')
        expect(wrap.previousElementSibling!.textContent).toBe('前面的句子結')
        // 文字內容沒變（編號後面接的是被收起來的註釋「1 內容」），也沒有多出任何不可見字元
        expect(w.find('p').text()).toBe('前面的句子結尾11內容。後面。')
        expect(w.find('p').text()).not.toMatch(/[\u2060\u200b]/)
      })

      it('以字形為單位拆，不會把 emoji 組合字拆成兩半', async () => {
        const w = await mountMd('家人👨‍👩‍👧[^1]\n\n[^1]: 內容')
        expect(wrapperOf(w).textContent).toBe('👨‍👩‍👧1')
      })

      it('結尾是空白就不拆（空白本來就是斷行點），段落開頭或前面是行內元素時只包編號', async () => {
        const spaced = await mountMd('word [^1]\n\n[^1]: 內容')
        expect(wrapperOf(spaced).textContent).toBe('1')
        expect(wrapperOf(spaced).previousElementSibling!.textContent).toBe('word ')
        const atStart = await mountMd('[^1]開頭\n\n[^1]: 內容')
        expect(wrapperOf(atStart).textContent).toBe('1')
        const afterStrong = await mountMd('**粗**[^1]\n\n[^1]: 內容')
        expect(wrapperOf(afterStrong).textContent).toBe('1')
      })

      it('文字只有一個字時不留空的 span', async () => {
        const w = await mountMd('註[^1]\n\n[^1]: 內容')
        const p = w.find('p').element
        expect(Array.from(p.children).map((el) => el.textContent)).toEqual(['註1', '1內容'])
      })

      it('註釋元素留在 nowrap span 外面（不繼承 nowrap），仍緊接在編號後面', async () => {
        const w = await mountMd('甲乙[^1]\n\n[^1]: 內容')
        const wrap = wrapperOf(w)
        expect(wrap.nextElementSibling!.id).toBe(markers(w)[0]!.attributes('aria-controls'))
        expect(wrap.contains(wrap.nextElementSibling)).toBe(false)
      })

      it('找不到定義的引用、註釋裡的巢狀引用照舊留成文字，前面的文字不拆', async () => {
        const w = await mountMd('句子[^1]\n\n[^1]: 內容又引用[^2]\n\n[^2]: 第二則')
        expect(w.find('section ol li').text()).toContain('內容又引用[^2]')
        expect(w.find('section ol li sup').exists()).toBe(false)
      })

      it('標題裡的編號不影響標題的 id', async () => {
        const w = await mountMd('## 標題[^1]\n\n[^1]: 內容')
        expect(w.find('h3').attributes('id')).toBe('標題')
      })
    })

    it('定義不會在原地當成普通段落印出來，內容只出現在註釋清單與各引用處的註釋元素', async () => {
      const w = await mountMd('段落[^1]\n\n[^1]: 只能在註釋裡看到我')
      // 以前定義會變成緊接在後面的第二個 <p>；現在頂層只剩內文段落與文末的註釋區塊
      expect(Array.from((w.element as HTMLElement).children).map((el) => el.tagName)).toEqual([
        'P',
        'SECTION',
      ])
      expect(w.find('section ol li').text()).toContain('只能在註釋裡看到我')
    })

    it('文末有「註釋」清單：依編號排序、孤兒定義也列出、被引用的每處都有回連結', async () => {
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

    it('沒有註腳的文章不產生「註釋」區塊', async () => {
      const w = await mountMd('一般的段落，[^nope] 沒有定義就只是文字。')
      expect(w.find('section').exists()).toBe(false)
      expect(markers(w)).toHaveLength(0)
      expect(w.text()).toContain('[^nope]')
    })

    it('註腳定義裡的標題不會讓後面標題的 id 錯開', async () => {
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
      it('預設收起；點編號展開並更新 aria-expanded，再點收起', async () => {
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

      it('同一則註釋的每個引用各自展開在自己旁邊', async () => {
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

      it('在編號上按 Esc 收起', async () => {
        const w = await mountMd('句子[^1]。\n\n[^1]: 內容', { attach: true })
        const marker = markers(w)[0]!
        await marker.trigger('click')
        await marker.trigger('keydown', { key: 'Escape' })
        expect(marker.attributes('aria-expanded')).toBe('false')
        w.unmount()
      })

      it('在展開的註釋裡（例如連結上）按 Esc 收起，焦點回到編號', async () => {
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

      it('收起的狀態下按 Esc 不做任何事', async () => {
        const w = await mountMd('句子[^1]。\n\n[^1]: 內容')
        const marker = markers(w)[0]!
        await marker.trigger('keydown', { key: 'Escape' })
        expect(marker.attributes('aria-expanded')).toBe('false')
      })
    })

    describe('寬螢幕：邊注', () => {
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

      it('開了 sidenotes 且夠寬：第一次引用的註釋是邊注，之後的引用不另外顯示', async () => {
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

      it('版面計算跑過後邊注有 top，而且依引用順序遞增（不重疊）', async () => {
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

      it('點編號固定標亮對應的邊注，再點取消（觸控裝置沒有 hover）', async () => {
        stubWide(true)
        const w = await mountMd('甲[^1]。\n\n[^1]: 一', { sidenotes: true })
        const side = () => w.find('[data-fn-side]')
        expect(side().classes()).not.toContain('text-(--text-ink-main)')
        await markers(w)[0]!.trigger('click')
        expect(side().classes()).toContain('text-(--text-ink-main)')
        await markers(w)[0]!.trigger('click')
        expect(side().classes()).not.toContain('text-(--text-ink-main)')
      })

      it('沒開 sidenotes（例如編輯頁預覽）就算螢幕很寬也維持點開展開，不產生邊注', async () => {
        stubWide(true)
        const w = await mountMd('甲[^1]。\n\n[^1]: 一')
        expect(w.find('[data-fn-side]').exists()).toBe(false)
        expect(markers(w)[0]!.attributes('aria-expanded')).toBe('false')
      })

      it('螢幕不夠寬時就算開了 sidenotes 也是點開展開', async () => {
        stubWide(false)
        const w = await mountMd('甲[^1]。\n\n[^1]: 一', { sidenotes: true })
        expect(w.find('[data-fn-side]').exists()).toBe(false)
        expect(markers(w)[0]!.attributes('aria-expanded')).toBe('false')
      })

      it('不管哪種模式，文末清單都在', async () => {
        stubWide(true)
        const w = await mountMd('甲[^1]。\n\n[^1]: 一', { sidenotes: true })
        expect(w.find('section h3').text()).toBe('註釋')
        expect(endItems(w)).toHaveLength(1)
      })
    })

    describe('註釋內容的消毒', () => {
      it('註釋裡的 javascript: 與 data: 連結只留文字，不產生 href', async () => {
        const w = await mountMd(
          '句子[^1]\n\n[^1]: [點我](javascript:alert(1)) 與 [也點我](data:text/html,x)',
        )
        expect(w.html()).not.toMatch(/href="(javascript|data):/i)
        expect(
          w.findAll('a').filter((a) => /javascript|data:/i.test(a.attributes('href') ?? '')),
        ).toHaveLength(0)
        expect(w.text()).toContain('點我')
      })

      it('註釋裡的原始 HTML 不會被執行', async () => {
        const w = await mountMd(
          '句子[^1]\n\n[^1]: 內容 <img src=x onerror="alert(1)"> <script>alert(1)</script>',
        )
        expect(w.find('img').exists()).toBe(false)
        expect(w.find('script').exists()).toBe(false)
        expect(w.html()).not.toContain('onerror')
      })

      it('註釋裡的 https 連結是站外連結、站內連結是 RouterLink，行內程式碼照常', async () => {
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

      it('註釋裡的巢狀引用留成文字，不產生第二層編號', async () => {
        const w = await mountMd('句子[^1]\n\n[^1]: 內容又引用[^2]\n\n[^2]: 第二則')
        expect(markers(w)).toHaveLength(1)
        expect(w.find('section ol li').text()).toContain('[^2]')
      })
    })
  })
})
