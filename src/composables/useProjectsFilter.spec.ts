import { describe, it, expect } from 'vitest'
import { useProjectsFilter } from './useProjectsFilter'
import type { Project } from '@/data/projects'

function fakeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'PROJ-2026-01',
    title: 'example',
    status: 'Active',
    statusType: 'active',
    desc: '',
    tags: [],
    started: '2026.01',
    repo: 'example',
    ...overrides,
  }
}

describe('useProjectsFilter', () => {
  it('沒有選任何 tag 時，filteredProjects 回傳全部專案', () => {
    const projects = [fakeProject({ id: 'a' }), fakeProject({ id: 'b' })]
    const { filteredProjects } = useProjectsFilter(projects)

    expect(filteredProjects.value).toEqual(projects)
  })

  it('選了 tag 之後，filteredProjects 只留下命中的專案（OR 邏輯）', () => {
    const projects = [
      fakeProject({ id: 'a', tags: ['Vue'] }),
      fakeProject({ id: 'b', tags: ['python'] }),
      fakeProject({ id: 'c', tags: ['Vue', 'python'] }),
    ]
    const { toggleTag, filteredProjects } = useProjectsFilter(projects)

    toggleTag('Vue')

    expect(filteredProjects.value.map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('同時選兩個 tag 時，命中任一個就算，不要求同時符合', () => {
    const projects = [
      fakeProject({ id: 'a', tags: ['Vue'] }),
      fakeProject({ id: 'b', tags: ['python'] }),
      fakeProject({ id: 'c', tags: ['php'] }),
    ]
    const { toggleTag, filteredProjects } = useProjectsFilter(projects)

    toggleTag('Vue')
    toggleTag('python')

    expect(filteredProjects.value.map((p) => p.id).sort()).toEqual(['a', 'b'])
  })

  it('再次 toggleTag 同一個 tag 會取消選取', () => {
    const projects = [fakeProject({ id: 'a', tags: ['Vue'] }), fakeProject({ id: 'b', tags: [] })]
    const { toggleTag, filteredProjects } = useProjectsFilter(projects)

    toggleTag('Vue')
    toggleTag('Vue')

    expect(filteredProjects.value).toEqual(projects)
  })

  it('clearFilter 清空所有已選取的 tag', () => {
    const projects = [fakeProject({ id: 'a', tags: ['Vue'] }), fakeProject({ id: 'b', tags: [] })]
    const { toggleTag, clearFilter, selectedTags, filteredProjects } = useProjectsFilter(projects)

    toggleTag('Vue')
    clearFilter()

    expect(selectedTags.value.size).toBe(0)
    expect(filteredProjects.value).toEqual(projects)
  })

  it('已知分類的 tag 會被分進對應的 filterGroups', () => {
    const projects = [fakeProject({ tags: ['Vue', 'laravel', 'appscript'] })]
    const { filterGroups } = useProjectsFilter(projects)

    const byLabel = Object.fromEntries(filterGroups.value.map((g) => [g.label, g.tags.map((t) => t.label)]))
    expect(byLabel['語言']).toEqual(['Vue'])
    expect(byLabel['套件']).toEqual(['laravel'])
    expect(byLabel['環境']).toEqual(['appscript'])
  })

  it('沒有出現在對照表裡的 tag 落到「其他」分類', () => {
    const projects = [fakeProject({ tags: ['some-unmapped-tag'] })]
    const { filterGroups } = useProjectsFilter(projects)

    const other = filterGroups.value.find((g) => g.label === '其他')
    expect(other?.tags.map((t) => t.label)).toEqual(['some-unmapped-tag'])
  })

  it('filterGroups 裡每個 tag 帶正確的出現次數', () => {
    const projects = [
      fakeProject({ id: 'a', tags: ['Vue'] }),
      fakeProject({ id: 'b', tags: ['Vue'] }),
      fakeProject({ id: 'c', tags: ['python'] }),
    ]
    const { filterGroups } = useProjectsFilter(projects)

    const lang = filterGroups.value.find((g) => g.label === '語言')
    const vueTag = lang?.tags.find((t) => t.label === 'Vue')
    const pyTag = lang?.tags.find((t) => t.label === 'python')
    expect(vueTag?.count).toBe(2)
    expect(pyTag?.count).toBe(1)
  })

  it('toggleTag 之後，filterGroups 裡對應 tag 的 selected 會變成 true', () => {
    const projects = [fakeProject({ tags: ['Vue'] })]
    const { toggleTag, filterGroups } = useProjectsFilter(projects)

    toggleTag('Vue')

    const lang = filterGroups.value.find((g) => g.label === '語言')
    const vueTag = lang?.tags.find((t) => t.label === 'Vue')
    expect(vueTag?.selected).toBe(true)
  })

  it('沒有任何專案掛某個分類的 tag 時，filterGroups 不會出現空分類', () => {
    const projects = [fakeProject({ tags: ['Vue'] })]
    const { filterGroups } = useProjectsFilter(projects)

    expect(filterGroups.value.map((g) => g.label)).toEqual(['語言'])
  })
})
