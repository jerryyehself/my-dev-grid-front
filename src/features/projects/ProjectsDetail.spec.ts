import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Project } from '@/api/projects'
import ProjectsDetail from './ProjectsDetail.vue'

const base: Project = {
  id: '7',
  title: 'my-dev-grid-front',
  status: 'Active',
  statusType: 'active',
  desc: '學習檔案前端',
  tags: [],
  techniques: [],
  started: '2026.06',
  repo: 'my-dev-grid-front',
}

const render = (over: Partial<Project> = {}) => mount(ProjectsDetail, { props: { project: { ...base, ...over } } })

describe('ProjectsDetail', () => {
  it('它應該顯示專案名稱與描述，沒有 PROJ- 編號、沒有 ROLE', () => {
    const wrapper = render()

    expect(wrapper.find('h2').text()).toBe('my-dev-grid-front')
    expect(wrapper.text()).toContain('學習檔案前端')
    expect(wrapper.text()).not.toContain('PROJ-')
    expect(wrapper.text()).not.toMatch(/role/i)
  })

  it('它應該在沒有描述時不畫描述段落', () => {
    expect(render({ desc: '' }).find('p').exists()).toBe(false)
  })

  it('它應該在進行中的專案只顯示 STARTED 與 REPO，不顯示 STATUS', () => {
    const labels = render().findAll('dt').map((d) => d.text())

    expect(labels).toEqual(['STARTED', 'REPO'])
  })

  it('它應該在封存的專案多一欄 STATUS，值是 ARCHIVED', () => {
    const wrapper = render({ status: 'Archived', statusType: 'archived' })

    expect(wrapper.findAll('dt').map((d) => d.text())).toEqual(['STARTED', 'REPO', 'STATUS'])
    expect(wrapper.findAll('dd')[2]!.text().toUpperCase()).toBe('ARCHIVED')
  })

  it('它應該在狀態未知時不顯示 STATUS', () => {
    const wrapper = render({ status: undefined, statusType: undefined })

    expect(wrapper.findAll('dt').map((d) => d.text())).toEqual(['STARTED', 'REPO'])
  })

  it('它應該在沒有開始日期時顯示破折號', () => {
    expect(render({ started: '' }).findAll('dd')[0]!.text()).toBe('—')
  })

  it('它應該把 REPO 連到 GitHub，新分頁開啟並帶 noopener noreferrer', () => {
    const link = render().find('a')

    expect(link.attributes('href')).toBe('https://github.com/jerryyehself/my-dev-grid-front')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  describe('技術標籤', () => {
    const techniques = [
      { name: 'Vue', version: '3', category: 'framework' },
      { name: 'Blade', version: null, category: 'language' },
      { name: 'PHP', version: null, category: 'language' },
      { name: 'pinia', version: null, category: 'packagetool' },
    ]

    it('它應該把有圖示的技術畫成圖示＋名稱（名稱帶版本），沒有圖示的另成一行文字標籤', () => {
      const wrapper = render({ techniques })
      const [logos, texts] = wrapper.findAll('ul')

      expect(logos!.findAll('li').map((l) => l.text())).toEqual(['Vue 3', 'PHP'])
      expect(logos!.findAll('svg')).toHaveLength(2)
      expect(texts!.findAll('li').map((l) => l.text())).toEqual(['Blade', 'pinia'])
      expect(texts!.find('svg').exists()).toBe(false)
    })

    it('它應該讓圖示對螢幕報讀器隱藏，並用 currentColor 單色畫', () => {
      const svg = render({ techniques }).find('svg')

      expect(svg.attributes('aria-hidden')).toBe('true')
      expect(svg.classes()).toContain('fill-current')
      expect(svg.find('path').attributes('d')).toMatch(/^M/)
    })

    it('它應該在全部都有圖示時只畫一行，沒有空的文字標籤列', () => {
      const wrapper = render({ techniques: [techniques[0]!, techniques[2]!] })

      expect(wrapper.findAll('ul')).toHaveLength(1)
    })

    it('它應該在全部都沒有圖示時只畫文字標籤', () => {
      const wrapper = render({ techniques: [techniques[1]!, techniques[3]!] })

      expect(wrapper.findAll('ul')).toHaveLength(1)
      expect(wrapper.find('svg').exists()).toBe(false)
    })

    it('它應該在沒有任何技術時不畫標籤區', () => {
      expect(render({ techniques: [] }).findAll('ul')).toHaveLength(0)
    })

    it('它應該在示範資料快照只有 tags、沒有 techniques 時，退回用 tags 當標籤', () => {
      const wrapper = render({ techniques: undefined, tags: ['Vue', 'database'] })

      expect(wrapper.findAll('li').map((l) => l.text())).toEqual(['Vue', 'database'])
    })
  })
})
