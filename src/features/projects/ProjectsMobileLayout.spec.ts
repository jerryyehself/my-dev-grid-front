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

  it('它應該在篩選面板只保留技術版本包含規則的說明', () => {
    const text = render().text()

    expect(text).toContain('選一個技術會包含它的所有版本')
    expect(text).not.toContain('小圓框')
  })
})
