import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useProjectsFilter } from './useProjectsFilter'
import type { Project } from '@/api/projects'

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
    const { filteredProjects } = useProjectsFilter(ref(projects))

    expect(filteredProjects.value).toEqual(projects)
  })

  it('選了 tag 之後，filteredProjects 只留下命中的專案（OR 邏輯）', () => {
    const projects = [
      fakeProject({ id: 'a', tags: ['Vue'] }),
      fakeProject({ id: 'b', tags: ['python'] }),
      fakeProject({ id: 'c', tags: ['Vue', 'python'] }),
    ]
    const { toggleTag, filteredProjects } = useProjectsFilter(ref(projects))

    toggleTag('Vue')

    expect(filteredProjects.value.map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('同時選兩個 tag 時，命中任一個就算，不要求同時符合', () => {
    const projects = [
      fakeProject({ id: 'a', tags: ['Vue'] }),
      fakeProject({ id: 'b', tags: ['python'] }),
      fakeProject({ id: 'c', tags: ['php'] }),
    ]
    const { toggleTag, filteredProjects } = useProjectsFilter(ref(projects))

    toggleTag('Vue')
    toggleTag('python')

    expect(filteredProjects.value.map((p) => p.id).sort()).toEqual(['a', 'b'])
  })

  it('再次 toggleTag 同一個 tag 會取消選取', () => {
    const projects = [fakeProject({ id: 'a', tags: ['Vue'] }), fakeProject({ id: 'b', tags: [] })]
    const { toggleTag, filteredProjects } = useProjectsFilter(ref(projects))

    toggleTag('Vue')
    toggleTag('Vue')

    expect(filteredProjects.value).toEqual(projects)
  })

  it('clearFilter 清空所有已選取的 tag', () => {
    const projects = [fakeProject({ id: 'a', tags: ['Vue'] }), fakeProject({ id: 'b', tags: [] })]
    const { toggleTag, clearFilter, selectedTags, filteredProjects } = useProjectsFilter(ref(projects))

    toggleTag('Vue')
    clearFilter()

    expect(selectedTags.value.size).toBe(0)
    expect(filteredProjects.value).toEqual(projects)
  })

  it('依後端的技術子類分組（language→語言、framework→框架…），不再用手寫的對照表', () => {
    const projects = [
      fakeProject({
        tags: ['Vue 3', 'laravel', 'appscript', 'PHP'],
        techniques: [
          { name: 'Vue', version: '3', category: 'framework' },
          { name: 'laravel', version: null, category: 'framework' },
          { name: 'appscript', version: null, category: 'packagetool' },
          { name: 'PHP', version: null, category: 'language' },
        ],
      }),
    ]
    const { filterGroups } = useProjectsFilter(ref(projects))

    expect(filterGroups.value.map((g) => [g.label, g.tags.map((t) => t.label)])).toEqual([
      ['語言', ['PHP']],
      ['框架', ['laravel', 'Vue']],
      ['套件工具', ['appscript']],
    ])
  })

  it('同一個技術的不同版本合成一個篩選項，選了會找出用任何一個版本的專案', () => {
    const projects = [
      fakeProject({ id: 'a', tags: ['Vue 2'], techniques: [{ name: 'Vue', version: '2', category: 'framework' }] }),
      fakeProject({ id: 'b', tags: ['Vue 3'], techniques: [{ name: 'Vue', version: '3', category: 'framework' }] }),
      fakeProject({ id: 'c', tags: ['PHP'], techniques: [{ name: 'PHP', version: null, category: 'language' }] }),
    ]
    const { filterGroups, toggleTag, filteredProjects } = useProjectsFilter(ref(projects))

    const vue = filterGroups.value.flatMap((g) => g.tags).filter((t) => t.label.startsWith('Vue'))
    expect(vue).toEqual([{ label: 'Vue', count: 2, selected: false }])

    toggleTag('Vue')
    expect(filteredProjects.value.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('沒有 techniques 的專案（示範資料快照）照 tags 篩選，分類落到「其他」', () => {
    const projects = [fakeProject({ tags: ['some-unmapped-tag'] })]
    const { filterGroups } = useProjectsFilter(ref(projects))

    const other = filterGroups.value.find((g) => g.label === '其他')
    expect(other?.tags.map((t) => t.label)).toEqual(['some-unmapped-tag'])
  })

  it('filterGroups 裡每個 tag 帶正確的出現次數', () => {
    const lang = (name: string) => ({ name, version: null, category: 'language' })
    const projects = [
      fakeProject({ id: 'a', tags: ['Vue'], techniques: [lang('Vue')] }),
      fakeProject({ id: 'b', tags: ['Vue'], techniques: [lang('Vue')] }),
      fakeProject({ id: 'c', tags: ['Python'], techniques: [lang('Python')] }),
    ]
    const { filterGroups } = useProjectsFilter(ref(projects))

    const group = filterGroups.value.find((g) => g.label === '語言')
    expect(group?.tags.find((t) => t.label === 'Vue')?.count).toBe(2)
    expect(group?.tags.find((t) => t.label === 'Python')?.count).toBe(1)
  })

  it('toggleTag 之後，filterGroups 裡對應 tag 的 selected 會變成 true', () => {
    const projects = [fakeProject({ tags: ['Vue'] })]
    const { toggleTag, filterGroups } = useProjectsFilter(ref(projects))

    toggleTag('Vue')

    const vueTag = filterGroups.value.flatMap((g) => g.tags).find((t) => t.label === 'Vue')
    expect(vueTag?.selected).toBe(true)
  })

  it('沒有任何專案掛某個分類的 tag 時，filterGroups 不會出現空分類', () => {
    const projects = [fakeProject({ tags: ['Vue'] })]
    const { filterGroups } = useProjectsFilter(ref(projects))

    expect(filterGroups.value.map((g) => g.label)).toEqual(['其他'])
  })
})
