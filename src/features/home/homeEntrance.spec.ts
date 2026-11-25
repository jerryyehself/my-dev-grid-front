import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Project } from '@/api/projects'
import HomeNewEntries, { resetHomeEntrance } from './HomeNewEntries.vue'

// 最新收錄卡片的進場：只在整個頁面載入後第一次有卡片時套 home-entrance，卡片本身的內容與位置不受影響。

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
  resetHomeEntrance()
  mockProjects.list = []
})

describe('HomeNewEntries 的進場', () => {
  it('它應該在第一次有卡片時套上進場、之後再掛載（站內換頁回首頁）不套', async () => {
    mockProjects.list = [project('1', '2026-10-03'), project('2', '2026-10-02')]

    const first = await mountEntries()
    expect(first.get('ul').classes()).toContain('home-entrance')

    const second = await mountEntries()
    expect(second.findAll('li')).toHaveLength(2)
    expect(second.get('ul').classes()).not.toContain('home-entrance')
  })

  it('它應該在第一次沒有卡片時不算播過，等真的有卡片的那次才播', async () => {
    const empty = await mountEntries()
    expect(empty.find('ul').exists()).toBe(false)

    mockProjects.list = [project('1', '2026-10-03')]
    const later = await mountEntries()
    expect(later.get('ul').classes()).toContain('home-entrance')
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
