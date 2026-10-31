import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import TheNavbar from './TheNavbar.vue'

// AuthStatus（登入狀態顯示，D-56）是 TheNavbar 的子元件，會呼叫
// useAuthStore()，掛載時一定要有 active Pinia，不然直接丟例外——
// 跟這份檔案原本測的 active 色條／漢堡選單邏輯無關，純粹是掛載前提。

const Stub = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Stub },
      { path: '/about', name: 'about', component: Stub },
      { path: '/articles', name: 'articles', component: Stub },
      { path: '/projects', name: 'projects', component: Stub },
      { path: '/graph', name: 'graph', component: Stub },
    ],
  })
}

async function mountNavbar(initialPath = '/') {
  const router = makeRouter()
  router.push(initialPath)
  await router.isReady()
  return mount(TheNavbar, { global: { plugins: [router, createPinia()] } })
}

describe('TheNavbar', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('theme-terminal')
    localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.classList.remove('theme-terminal')
    localStorage.clear()
  })

  it('它應該讓目前路由對應連結的 active 色條亮起來（scale-x-100）', async () => {
    const wrapper = await mountNavbar('/about')

    const aboutLink = wrapper.findAll('a').find((a) => a.text() === 'ABOUT')
    const indicator = aboutLink!.find('span.w-\\[18px\\]')
    expect(indicator.classes()).toContain('scale-x-100')
  })

  it('它應該讓沒有對應到目前路由的連結不亮 active 色條', async () => {
    const wrapper = await mountNavbar('/about')

    const articlesLink = wrapper.findAll('a').find((a) => a.text() === 'ARTICLES')
    const indicator = articlesLink!.find('span.w-\\[18px\\]')
    expect(indicator.classes()).not.toContain('scale-x-100')
  })

  it('它應該在切換路由後把 active 色條換到新的連結上', async () => {
    const router = makeRouter()
    router.push('/about')
    await router.isReady()
    const wrapper = mount(TheNavbar, { global: { plugins: [router, createPinia()] } })

    await router.push('/projects')
    await wrapper.vm.$nextTick()

    const projectsLink = wrapper.findAll('a').find((a) => a.text() === 'PROJECTS')
    const indicator = projectsLink!.find('span.w-\\[18px\\]')
    expect(indicator.classes()).toContain('scale-x-100')
  })

  it('它應該預設不顯示手機版選單，點漢堡按鈕後才展開', async () => {
    const wrapper = await mountNavbar('/')

    expect(wrapper.find('[aria-expanded="true"]').exists()).toBe(false)

    const menuButton = wrapper.find('button[aria-label="開啟導覽選單"]')
    await menuButton.trigger('click')

    expect(menuButton.attributes('aria-expanded')).toBe('true')
  })

  it('它應該在切換路由時自動收合展開中的手機版選單', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()
    const wrapper = mount(TheNavbar, { global: { plugins: [router, createPinia()] } })

    const menuButton = wrapper.find('button[aria-label="開啟導覽選單"]')
    await menuButton.trigger('click')
    expect(menuButton.attributes('aria-expanded')).toBe('true')

    await router.push('/projects')
    await wrapper.vm.$nextTick()

    expect(menuButton.attributes('aria-expanded')).toBe('false')
  })
})
