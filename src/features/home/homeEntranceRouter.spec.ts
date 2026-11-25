import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@/api/projects'

// 用真的 router（src/router/index.ts，含它掛的 afterEach）驗「首頁是不是整頁載入的第一個頁面」：
// 首頁元件 setup 時，導航次數必須已經記好。homeEntrance.spec.ts 是手動記次數，驗不到這個接法與時序。
// 每個測試都重新載入模組，才是「新的一次整頁載入」（計數歸零、router 回到初始狀態）。

const mockProjects = vi.hoisted(() => ({ list: [] as Project[] }))
vi.mock('@/api/projects', () => ({ fetchProjects: () => Promise.resolve(mockProjects.list) }))
vi.mock('@/api/articles', () => ({ fetchArticles: () => Promise.resolve([]) }))

const project = (id: string): Project => ({
  id,
  title: `repo-${id}`,
  desc: '',
  tags: [],
  started: '2026.10',
  createdDate: '2026-10-03',
  repo: `repo-${id}`,
})

/** 整頁載入：網址設成 startPath，載入真的 router，只把首頁與文章頁的元件換成輕量的（首頁只畫最新收錄） */
async function loadPage(startPath: string) {
  vi.resetModules()
  window.history.replaceState(null, '', startPath)
  const { createApp, defineComponent, h } = await import('vue')
  const { RouterView } = await import('vue-router')
  const { createPinia } = await import('pinia')
  const { default: router } = await import('@/router')
  const { default: HomeNewEntries } = await import('./HomeNewEntries.vue')

  router.addRoute({ path: '/', name: 'home', component: HomeNewEntries })
  router.addRoute({ path: '/articles', name: 'articles', component: { render: () => h('p', '文章頁') } })

  const root = document.createElement('div')
  document.body.appendChild(root)
  const App = defineComponent({ render: () => h(RouterView) })
  const app = createApp(App).use(createPinia()).use(router)
  app.mount(root)
  await router.isReady()
  await settle()

  const entranceClass = () => root.querySelector('section[aria-label="最新收錄"] ul')?.classList.contains('home-entrance')
  return { router, root, entranceClass, unmount: () => app.unmount() }
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  mockProjects.list = [project('1'), project('2')]
  document.body.innerHTML = ''
})

describe('首頁卡片進場與真的 router', () => {
  it('它應該在直接進首頁（整頁載入的第一個頁面）時播', async () => {
    const page = await loadPage('/')

    expect(page.entranceClass()).toBe(true)
    page.unmount()
  })

  it('它應該在先進文章頁、再站內換到首頁時不播，但卡片照常顯示', async () => {
    const page = await loadPage('/articles')
    expect(page.root.textContent).toContain('文章頁')

    await page.router.push('/')
    await settle()

    expect(page.root.querySelectorAll('section[aria-label="最新收錄"] li')).toHaveLength(2)
    expect(page.entranceClass()).toBe(false)
    page.unmount()
  })

  it('它應該在首頁離開後用上一頁回首頁時不播', async () => {
    const page = await loadPage('/')
    expect(page.entranceClass()).toBe(true)

    await page.router.push('/articles')
    await settle()
    page.router.back()
    await settle()

    expect(page.root.querySelectorAll('section[aria-label="最新收錄"] li')).toHaveLength(2)
    expect(page.entranceClass()).toBe(false)
    page.unmount()
  })
})
