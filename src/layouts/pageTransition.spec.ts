import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import appRouter from '@/router'
import { initInputModality } from '@/composables/useInputModality'
import {
  PAGE_POSITIONS,
  decidePageTransition,
  installPageTransition,
  pagePosition,
  pageSwap,
  type PageTransitionInput,
} from './pageTransition'

// 換頁轉場的方向與「何時不播」。動畫本身見 pageTransitionMotion.spec.ts

const base: Omit<PageTransitionInput, 'from' | 'to'> = {
  trigger: 'link',
  modality: 'pointer',
  reducedMotion: false,
}

describe('pageTransition：每個路由都有決定（新增路由時一定要選要不要播）', () => {
  // 不播的頁面：登入相關、後台與編輯頁（requiresAuth）、404
  const NOT_ANIMATED = new Set([
    'login',
    'auth-callback',
    'admin',
    'article-manage',
    'article-import',
    'article-new',
    'article-editor',
    'ontology-scopes',
    'ontology-scope-new',
    'ontology-scope',
    'ontology-scope-edit',
    'ontology-relations',
    'ontology-relation-new',
    'ontology-relation',
    'ontology-relation-edit',
    'not-found',
  ])

  it.each(appRouter.getRoutes().map((r) => [String(r.name), r.meta.requiresAuth === true] as const))(
    '它應該把 %s 歸到「播」或「不播」其中一邊，要登入的頁面一定不播',
    (name, requiresAuth) => {
      const animated = pagePosition(name) !== null
      expect(animated !== NOT_ANIMATED.has(name)).toBe(true)
      if (requiresAuth) expect(animated).toBe(false)
    },
  )

  it('它應該只給存在的路由排位置（名稱打錯會在這裡被抓到）', () => {
    const names = new Set(appRouter.getRoutes().map((r) => r.name))
    for (const name of Object.keys(PAGE_POSITIONS)) expect(names.has(name)).toBe(true)
  })

  it('它應該照導覽列由左到右排：HOME、ARTICLES、文章內頁、PROJECTS、GRAPH、ABOUT', () => {
    const order = ['home', 'articles', 'article-detail', 'projects', 'graph', 'about']
    const positions = order.map((name) => pagePosition(name)!)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(new Set(positions).size).toBe(order.length)
  })

  it('它應該對 undefined（第一次載入）、不是字串、原型上的鍵回傳 null', () => {
    expect(pagePosition(undefined)).toBeNull()
    expect(pagePosition(Symbol('home'))).toBeNull()
    expect(pagePosition('constructor')).toBeNull()
    expect(pagePosition('toString')).toBeNull()
  })
})

describe('pageTransition：方向', () => {
  it.each([
    ['home', 'articles', 1],
    ['articles', 'home', -1],
    ['articles', 'article-detail', 1],
    ['article-detail', 'articles', -1],
    ['article-detail', 'projects', 1],
    ['projects', 'article-detail', -1],
    ['home', 'projects', 1],
    ['projects', 'home', -1],
    ['projects', 'graph', 1],
    ['about', 'graph', -1],
    ['about', 'home', -1],
  ] as const)('它應該在 %s → %s 時往 %i 的方向', (from, to, dir) => {
    expect(decidePageTransition({ ...base, from, to })).toEqual({ play: true, dir })
  })
})

describe('pageTransition：何時不播', () => {
  it.each([
    ['瀏覽器上一頁／下一頁', { trigger: 'pop' }, 'not-link'],
    ['程式自己導頁', { trigger: 'other' }, 'not-link'],
    ['鍵盤觸發', { modality: 'keyboard' }, 'keyboard'],
    ['減少動態', { reducedMotion: true }, 'reduced-motion'],
  ] as const)('它應該在%s時不播', (label, override, reason) => {
    expect(decidePageTransition({ ...base, from: 'home', to: 'articles', ...override }), label).toEqual({ play: false, reason })
  })

  it.each([
    ['home', 'home'],
    ['articles', 'articles'],
    ['article-detail', 'article-detail'],
  ])('它應該在同一頁（%s → %s）時不播', (from, to) => {
    expect(decidePageTransition({ ...base, from, to })).toEqual({ play: false, reason: 'same-position' })
  })

  it.each([
    ['admin', 'article-manage'],
    ['article-manage', 'article-editor'],
    ['ontology-scopes', 'ontology-scope'],
    ['admin', 'home'],
    ['home', 'admin'],
    ['articles', 'login'],
    ['not-found', 'home'],
    [undefined, 'home'],
  ])('它應該在後台、編輯頁或第一次載入（%s → %s）時不播', (from, to) => {
    expect(decidePageTransition({ ...base, from, to })).toEqual({ play: false, reason: 'not-public' })
  })
})

describe('installPageTransition：只有站內點連結才播', () => {
  let router: Router
  let stop: () => void
  let stopModality: () => void
  const anchors: HTMLAnchorElement[] = []
  const Blank = { render: () => null }

  /** 模擬 RouterLink：點下去才 router.push，網址照 href */
  function link(href: string, attrs: Record<string, string> = {}, to: string = href) {
    const a = document.createElement('a')
    a.setAttribute('href', href)
    for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v)
    a.addEventListener('click', (event) => {
      if (event.defaultPrevented) return
      event.preventDefault()
      void router.push(to)
    })
    document.body.appendChild(a)
    anchors.push(a)
    return a
  }

  async function click(a: Element, init: MouseEventInit = {}) {
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }))
    await flush()
  }

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: Blank },
        { path: '/articles', name: 'articles', component: Blank },
        { path: '/articles/:id', name: 'article-detail', component: Blank },
        { path: '/projects', name: 'projects', component: Blank },
        { path: '/admin', name: 'admin', component: Blank },
        { path: '/secret', name: 'secret', component: Blank, beforeEnter: () => '/projects' },
      ],
    })
    stopModality = initInputModality()
    stop = installPageTransition(router)
    await router.push('/')
    pageSwap.key = 0
    pageSwap.dir = 1
  })

  afterEach(() => {
    stop()
    stopModality()
    anchors.splice(0).forEach((a) => a.remove())
    vi.unstubAllGlobals()
  })

  it('它應該在點 ARTICLES 時播、往右；點文章再點返回連結時往左', async () => {
    await click(link('/articles'))
    expect(pageSwap).toEqual({ key: 1, dir: 1 })
    await click(link('/articles/7'))
    expect(pageSwap).toEqual({ key: 2, dir: 1 })
    await click(link('/articles'))
    expect(pageSwap).toEqual({ key: 3, dir: -1 })
  })

  it('它應該在瀏覽器上一頁／下一頁時不播', async () => {
    await click(link('/articles'))
    expect(pageSwap.key).toBe(1)
    router.back()
    await flush()
    expect(router.currentRoute.value.name).toBe('home')
    expect(pageSwap.key).toBe(1)
    router.forward()
    await flush()
    expect(router.currentRoute.value.name).toBe('articles')
    expect(pageSwap.key).toBe(1)
  })

  it('它應該在程式自己導頁（沒有點連結）時不播', async () => {
    await router.push('/articles')
    expect(pageSwap.key).toBe(0)
  })

  it('它應該在點的連結跟實際去的頁面對不上時不播（近似網址、被導去別頁）', async () => {
    await click(link('/articles?tag=x', {}, '/articles'))
    expect(router.currentRoute.value.fullPath).toBe('/articles')
    expect(pageSwap.key).toBe(0)
    await click(link('/secret'))
    expect(router.currentRoute.value.name).toBe('projects')
    expect(pageSwap.key).toBe(0)
  })

  it.each([
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['中鍵', { button: 1 }],
  ])('它應該在按著 %s 點時不播', async (label, init) => {
    await click(link('/articles'), init)
    expect(router.currentRoute.value.name).toBe('articles')
    expect(pageSwap.key, label).toBe(0)
  })

  it.each([
    ['開新分頁', { target: '_blank' }],
    ['下載', { download: '' }],
  ])('它應該在%s的連結時不播', async (label, attrs) => {
    await click(link('/articles', attrs))
    expect(pageSwap.key, label).toBe(0)
  })

  it('它應該在外部連結時不播', async () => {
    await click(link('https://example.com/articles', {}, '/articles'))
    expect(pageSwap.key).toBe(0)
  })

  it('它應該在鍵盤（Enter）觸發連結時不播', async () => {
    const a = link('/articles')
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await click(a)
    expect(router.currentRoute.value.name).toBe('articles')
    expect(pageSwap.key).toBe(0)
  })

  it('它應該在減少動態時不播', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }))
    await click(link('/articles'))
    expect(router.currentRoute.value.name).toBe('articles')
    expect(pageSwap.key).toBe(0)
  })

  it('它應該在同一頁再點時不動', async () => {
    await click(link('/articles'))
    await click(link('/articles'))
    expect(pageSwap.key).toBe(1)
  })

  it('它應該在進出後台時不播', async () => {
    await click(link('/admin'))
    expect(router.currentRoute.value.name).toBe('admin')
    await click(link('/'))
    expect(router.currentRoute.value.name).toBe('home')
    expect(pageSwap.key).toBe(0)
  })

  it('它應該在點的不是連結（按鈕）時不播', async () => {
    const button = document.createElement('button')
    button.addEventListener('click', () => void router.push('/articles'))
    document.body.appendChild(button)
    await click(button)
    button.remove()
    expect(router.currentRoute.value.name).toBe('articles')
    expect(pageSwap.key).toBe(0)
  })

  it('它應該在點了連結但換頁被取消、再按上一頁時，不把舊的點擊算到上一頁頭上', async () => {
    await click(link('/articles'))
    await click(link('/projects'))
    // 點了連到 /articles 的連結（記下網址），但 push 前就被打斷：上一頁回到 /articles
    const a = document.createElement('a')
    a.setAttribute('href', '/articles')
    a.addEventListener('click', (e) => {
      e.preventDefault()
      router.back()
    })
    document.body.appendChild(a)
    anchors.push(a)
    await click(a)
    expect(router.currentRoute.value.name).toBe('articles')
    expect(pageSwap.key).toBe(2)
  })

  it('它應該在移除監聽後不再播', async () => {
    stop()
    await click(link('/articles'))
    expect(pageSwap.key).toBe(0)
    stop = () => {}
  })
})
