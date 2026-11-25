import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Project } from '@/api/projects'
import HomeNewEntries from './HomeNewEntries.vue'
import { recordNavigation, resetNavigationCount } from '@/router/navigationCount'

// 最新收錄卡片的進場：只在首頁是整頁載入的第一個頁面時套 home-entrance，站內換頁過來不套；卡片本身的內容與位置不受影響。

const mockProjects = vi.hoisted(() => ({ list: [] as Project[] }))
vi.mock('@/api/projects', () => ({ fetchProjects: () => Promise.resolve(mockProjects.list) }))
vi.mock('@/api/articles', () => ({ fetchArticles: () => Promise.resolve([]) }))

const project = (id: string, date: string): Project => ({
  id,
  title: `repo-${id}`,
  desc: '',
  tags: [],
  started: '2026.10',
  createdDate: date,
  repo: `repo-${id}`,
})

const mountEntries = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }, { path: '/projects', component: { template: '<div />' } }],
  })
  const wrapper = mount(HomeNewEntries, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  resetNavigationCount()
  mockProjects.list = []
})

describe('HomeNewEntries 的進場', () => {
  it('它應該在首頁是整頁載入的第一個頁面（導航次數 1）時套上進場', async () => {
    mockProjects.list = [project('1', '2026-10-03'), project('2', '2026-10-02')]
    recordNavigation()

    const wrapper = await mountEntries()
    expect(wrapper.get('ul').classes()).toContain('home-entrance')
  })

  it('它應該在先進別頁、再站內換到首頁（導航次數 2 以上）時不套，卡片照常完整顯示', async () => {
    mockProjects.list = [project('1', '2026-10-03'), project('2', '2026-10-02')]
    recordNavigation() // 整頁載入時先到文章頁
    recordNavigation() // 站內換到首頁

    const wrapper = await mountEntries()
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.get('ul').classes()).not.toContain('home-entrance')
  })

  it('它應該在第一個頁面是首頁、之後離開再回來時，回來那次不套', async () => {
    mockProjects.list = [project('1', '2026-10-03')]
    recordNavigation()
    const first = await mountEntries()
    expect(first.get('ul').classes()).toContain('home-entrance')

    recordNavigation() // 去文章頁
    recordNavigation() // 回首頁
    const back = await mountEntries()
    expect(back.get('ul').classes()).not.toContain('home-entrance')
  })

  it('它應該在掛載當下就決定要不要播：第一個頁面是首頁，卡片晚到時（那時已換頁）仍照第一個頁面算', async () => {
    mockProjects.list = [project('1', '2026-10-03')]
    recordNavigation()
    const wrapper = mount(HomeNewEntries, {
      global: {
        plugins: [
          createRouter({
            history: createMemoryHistory(),
            routes: [{ path: '/', component: { template: '<div />' } }, { path: '/projects', component: { template: '<div />' } }],
          }),
        ],
      },
    })
    recordNavigation() // API 回來之前使用者已經換頁
    await flushPromises()

    expect(wrapper.get('ul').classes()).toContain('home-entrance')
  })

  it('它應該讓三張卡依序錯開（0、1、2）', async () => {
    mockProjects.list = [project('1', '2026-10-05'), project('2', '2026-10-04'), project('3', '2026-10-03')]
    const wrapper = await mountEntries()

    const indexes = wrapper.findAll('li').map((li) => li.attributes('style'))
    expect(indexes).toEqual(['--stagger-index: 0;', '--stagger-index: 1;', '--stagger-index: 2;'])
  })

  it('它應該讓卡片在進場動畫之外照常完整渲染（連結、標題、「新」標記都在）', async () => {
    mockProjects.list = [project('9', '2026-10-03')]
    const wrapper = await mountEntries()

    expect(wrapper.get('a').attributes('href')).toBe('/projects?implementation=9')
    expect(wrapper.text()).toContain('repo-9')
    expect(wrapper.text()).toContain('新')
  })
})
