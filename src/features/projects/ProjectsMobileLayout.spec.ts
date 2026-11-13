import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Project } from '@/api/projects'
import ProjectsMobileLayout from './ProjectsMobileLayout.vue'

const project = (id: string, title: string): Project => ({
  id,
  title,
  status: 'Active',
  statusType: 'active',
  desc: `${title} 的描述`,
  tags: [],
  started: '2025.01',
  repo: title,
})

const render = (props: Partial<InstanceType<typeof ProjectsMobileLayout>['$props']> = {}) => {
  const alpha = project('1', 'alpha')
  return mount(ProjectsMobileLayout, {
    props: {
      projects: [alpha],
      totalCount: 1,
      selected: alpha,
      filterGroups: [{ label: '框架', tags: [{ label: 'Vue', count: 1, selected: false }] }],
      selectedTags: new Set<string>(),
      ...props,
    },
  })
}

describe('ProjectsMobileLayout', () => {
  it('它應該在專案卡只列 Started 與 Repo，不顯示沒有資料來源的 Role', () => {
    const text = render().text()

    expect(text).toContain('Started')
    expect(text).toContain('Repo')
    expect(text).not.toContain('Role')
  })

  it('它應該只在已封存的專案標狀態，進行中的專案列表與詳情都不標', () => {
    const active = project('1', 'alpha')
    const archived = { ...project('2', 'bravo'), status: 'Archived', statusType: 'archived' as const }

    const activeText = render({ projects: [active], selected: active }).text()
    expect(activeText).not.toContain('Active')

    const wrapper = render({ projects: [active, archived], totalCount: 2, selected: archived })
    // 列表一筆、詳情一筆，都是 Archived；Active 的那一列沒有狀態文字
    expect(wrapper.text().match(/Archived/g)).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Active')
  })

  it('它應該在篩選面板只保留技術版本包含規則的說明', () => {
    const text = render().text()

    expect(text).toContain('選一個技術會包含它的所有版本')
    expect(text).not.toContain('小圓框')
  })

  describe('空狀態', () => {
    it('它應該在整體沒有專案時說「目前沒有可顯示的專案」', () => {
      const text = render({ projects: [], totalCount: 0, selected: undefined }).text()

      expect(text).toContain('目前沒有可顯示的專案。')
      expect(text).not.toContain('沒有符合篩選條件')
    })

    it('它應該在篩選後沒有專案、但整體有專案時說「沒有符合篩選條件的專案」', () => {
      const text = render({ projects: [], totalCount: 3, selected: undefined }).text()

      expect(text).toContain('沒有符合篩選條件的專案。')
      expect(text).not.toContain('目前沒有可顯示')
    })
  })

  describe('篩選鈕', () => {
    it('它應該在面板收合時，aria-controls 仍指向存在的元素（面板只是被隱藏）', async () => {
      const wrapper = render()
      const button = wrapper.findAll('button').find((b) => b.text().startsWith('依技術篩選'))!
      const panel = wrapper.find(`[id="${button.attributes('aria-controls')}"]`)

      expect(button.attributes('aria-expanded')).toBe('false')
      expect(panel.exists()).toBe(true)
      expect(panel.classes()).toContain('hidden')

      await button.trigger('click')

      expect(button.attributes('aria-expanded')).toBe('true')
      expect(panel.classes()).not.toContain('hidden')
    })
  })
})
