import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Project } from '@/api/projects'
import { graphNodeLink } from '@/components/graphNodeLink'
import ProjectsDetail from './ProjectsDetail.vue'
import ProjectsView from './ProjectsView.vue'

const fetchProjects = vi.fn<() => Promise<Project[]>>()
vi.mock('@/api/projects', () => ({ fetchProjects: () => fetchProjects() }))

const project = (id: string, title: string, techniques: Project['techniques'] = [], started = '2025.01'): Project => ({
  id,
  title,
  status: 'Active',
  statusType: 'active',
  desc: `${title} 的描述`,
  tags: techniques?.map((t) => t.name) ?? [],
  techniques,
  started,
  repo: title,
})

const vue = { name: 'Vue', version: '3', category: 'framework' }
const php = { name: 'PHP', version: null, category: 'language' }
// 後端 id 刻意跟列表順序不同，確認選取靠 id、不是靠順序
const projects = [
  project('42', 'alpha', [php], '2026.03'),
  project('7', 'beta', [vue], '2025.06'),
  project('19', 'gamma', [vue, php], '2024.02'),
]

async function mountAt(url: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/projects', component: ProjectsView }] })
  await router.push(url)
  await router.isReady()
  const wrapper = mount(ProjectsView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

const detailTitle = (w: Awaited<ReturnType<typeof mountAt>>) => w.find('h2').text()
const currentRow = (w: Awaited<ReturnType<typeof mountAt>>) => w.find('[aria-current="true"]').text()

function stubMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

// jsdom 沒有實作 window.scrollTo；桌機版點清單會呼叫它
const scrollTo = vi.fn()
beforeEach(() => {
  fetchProjects.mockReset()
  fetchProjects.mockResolvedValue(projects)
  Element.prototype.scrollIntoView = vi.fn()
  scrollTo.mockReset()
  vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  // @ts-expect-error 還原成 jsdom 原本沒有這個方法的狀態
  delete Element.prototype.scrollIntoView
})

describe('ProjectsView 選取與深層連結', () => {
  it('它應該在沒帶網址參數時選清單第一筆', async () => {
    const wrapper = await mountAt('/projects')

    expect(detailTitle(wrapper)).toBe('alpha')
    expect(currentRow(wrapper)).toContain('alpha')
  })

  it.each(['project', 'implementation'])('它應該用 ?%s=<後端 id> 選中對應的專案', async (key) => {
    const wrapper = await mountAt(`/projects?${key}=19`)

    expect(detailTitle(wrapper)).toBe('gamma')
    expect(currentRow(wrapper)).toContain('gamma')
  })

  it('它應該讓圖譜節點產生的連結選中同一個專案', async () => {
    // graphNodeLink 的節點 id 是「<型別>-<後端 id>」，連到 /projects?implementation=<後端 id>
    const link = graphNodeLink({ id: 'implementation-7', domainType: 'implementation' })
    const query = (link as { to: { query: Record<string, string> } }).to.query
    const wrapper = await mountAt(`/projects?implementation=${query.implementation}`)

    expect(detailTitle(wrapper)).toBe('beta')
  })

  it.each(['PROJ-2024-01', '999', ''])('它應該在網址上的 id（%j）找不到專案時退回選第一筆', async (id) => {
    const wrapper = await mountAt(`/projects?project=${id}`)

    expect(detailTitle(wrapper)).toBe('alpha')
  })

  it('它應該在深層連結載入後把選中的那一列捲進清單可見範圍', async () => {
    await mountAt('/projects?project=19')

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('它應該在沒有深層連結時不自動捲動清單', async () => {
    await mountAt('/projects')

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
  })

  it('它應該在點清單的另一列時切換詳情', async () => {
    const wrapper = await mountAt('/projects')

    await wrapper.findAll('button').find((b) => b.text().includes('beta'))!.trigger('click')

    expect(detailTitle(wrapper)).toBe('beta')
    expect(currentRow(wrapper)).toContain('beta')
  })

  it('它應該在篩選把選中的專案擠出清單時，改選篩選後的第一筆', async () => {
    const wrapper = await mountAt('/projects')
    expect(detailTitle(wrapper)).toBe('alpha')

    await wrapper.findAll('button').find((b) => b.text().startsWith('篩選'))!.trigger('click')
    await wrapper.findAll('button').find((b) => b.attributes('aria-label')?.startsWith('Vue，'))!.trigger('click')

    expect(wrapper.text()).toContain('2 筆｜依開始日期')
    expect(detailTitle(wrapper)).toBe('beta')
  })

  it('它應該在載入失敗時顯示錯誤與重試鈕，重試成功後顯示專案', async () => {
    fetchProjects.mockRejectedValueOnce(new Error('連不上'))
    const wrapper = await mountAt('/projects')
    expect(wrapper.text()).toContain('連不上')

    await wrapper.findAll('button').find((b) => b.text() === '重試')!.trigger('click')
    await flushPromises()

    expect(detailTitle(wrapper)).toBe('alpha')
  })
})

describe('ProjectsView 桌機版', () => {
  it('它應該不顯示 PROJ- 編號，列表依年份分組', async () => {
    stubMedia(true)
    const wrapper = await mountAt('/projects')

    expect(wrapper.text()).not.toContain('PROJ-')
    expect(wrapper.findAll('h3').map((h) => h.text())).toEqual(['2026', '2025', '2024'])
    expect(wrapper.text()).toContain('3 筆｜依開始日期')
  })

  it('它應該在後端沒有任何專案時顯示「目前沒有可顯示的專案」', async () => {
    stubMedia(true)
    fetchProjects.mockResolvedValue([])
    const wrapper = await mountAt('/projects')

    expect(wrapper.text()).toContain('目前沒有可顯示的專案。')
    expect(wrapper.text()).not.toContain('沒有符合篩選條件')
  })

  it('它應該不顯示手機版的篩選鈕', async () => {
    stubMedia(true)

    expect((await mountAt('/projects')).find('#project-filter-panel').exists()).toBe(false)
  })
})

describe('ProjectsView 桌機版選取後捲動', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollY', 500)
    stubMedia(true)
  })

  // jsdom 沒有版面，詳情頂端到視窗上緣的距離要自己指定
  function setDetailTop(wrapper: Awaited<ReturnType<typeof mountAt>>, top: number) {
    wrapper.findComponent(ProjectsDetail).element.getBoundingClientRect = () => ({ top }) as DOMRect
  }
  const clickRow = (wrapper: Awaited<ReturnType<typeof mountAt>>, title: string) =>
    wrapper.findAll('button').find((b) => b.text().includes(title))!.trigger('click')

  it('它應該在頁面捲下去、詳情頂端被導覽列蓋住時，點清單後立刻捲到詳情頂端', async () => {
    const wrapper = await mountAt('/projects')
    setDetailTop(wrapper, -300)

    await clickRow(wrapper, 'beta')
    await flushPromises()

    // 目前捲動位置 500 ＋ 詳情頂端 -300 ＝ 詳情在頁面上的位置 200，再減掉停靠的 125
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith({ top: 75, behavior: 'instant' })
  })

  it('它應該在詳情頂端本來就看得到時不捲動', async () => {
    const wrapper = await mountAt('/projects')
    setDetailTop(wrapper, 204)

    await clickRow(wrapper, 'beta')
    await flushPromises()

    expect(detailTitle(wrapper)).toBe('beta')
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('它應該在深層連結載入時不捲動整個頁面', async () => {
    await mountAt('/projects?project=19')

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('它應該在手機版不用 window.scrollTo（手機版自己捲到詳情）', async () => {
    stubMedia(false)
    const wrapper = await mountAt('/projects')

    await clickRow(wrapper, 'gamma')
    await flushPromises()

    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('ProjectsView 手機版', () => {
  it('它應該畫手機版版面：有篩選收合鈕、沒有年份標頭，也沒有 PROJ- 編號', async () => {
    stubMedia(false)
    const wrapper = await mountAt('/projects')

    expect(wrapper.find('#project-filter-panel').exists()).toBe(true)
    expect(wrapper.findAll('h3')).toHaveLength(0)
    expect(wrapper.text()).toContain('3 個專案，由新到舊排列')
    expect(wrapper.text()).not.toContain('PROJ-')
  })

  it('它應該用 ?implementation=<後端 id> 選中對應的專案', async () => {
    stubMedia(false)

    expect(detailTitle(await mountAt('/projects?implementation=7'))).toBe('beta')
  })

  it('它應該在點清單後捲到詳情', async () => {
    stubMedia(false)
    const wrapper = await mountAt('/projects')

    await wrapper.findAll('button').find((b) => b.text().includes('gamma'))!.trigger('click')
    await flushPromises()

    expect(detailTitle(wrapper)).toBe('gamma')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })
})
