import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import AdminView from './AdminView.vue'
import { ApiHttpError, ApiRequestError, ApiValidationError } from '@/api/client'
import { fetchArticles } from '@/api/articles'
import { fetchRelations, fetchScopeList, fetchTechniqueOptions } from '@/api/ontology'
import { fetchProjects, setProjectVisibility, type Project } from '@/api/projects'

vi.mock('@/api/articles', () => ({ fetchArticles: vi.fn() }))
vi.mock('@/api/ontology', () => ({
  fetchRelations: vi.fn(),
  fetchScopeList: vi.fn(),
  fetchTechniqueOptions: vi.fn(),
}))
vi.mock('@/api/projects', () => ({ fetchProjects: vi.fn(), setProjectVisibility: vi.fn() }))

function project(id: string, title: string, isVisible?: boolean): Project {
  return { id, title, desc: '', tags: [], started: '', repo: title, isVisible }
}

// 登入時後端連不公開的專案也回，每筆帶 isVisible
const PROJECTS = [project('1', 'alpha-app', true), project('2', 'beta-lab', false), project('3', 'gamma-kit', true)]

async function mountView(projects: Project[] | Error = PROJECTS) {
  vi.mocked(fetchArticles).mockResolvedValue([])
  vi.mocked(fetchScopeList).mockResolvedValue([])
  vi.mocked(fetchRelations).mockResolvedValue([])
  vi.mocked(fetchTechniqueOptions).mockResolvedValue([])
  if (projects instanceof Error) vi.mocked(fetchProjects).mockRejectedValue(projects)
  else vi.mocked(fetchProjects).mockResolvedValue(projects)
  const wrapper = mount(AdminView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
  await flushPromises()
  return wrapper
}

const switchOf = (w: VueWrapper, title: string) => w.get(`button[role="switch"][aria-label="${title} 公開"]`)
const checked = (w: VueWrapper, title: string) => switchOf(w, title).attributes('aria-checked')
const projectSection = (w: VueWrapper) => w.get('section[aria-labelledby="admin-projects"]')

beforeEach(() => {
  vi.mocked(setProjectVisibility).mockReset()
  vi.mocked(setProjectVisibility).mockResolvedValue(undefined)
})

describe('AdminView 專案一區', () => {
  it('它應該列出所有專案，不公開的那筆開關是關的', async () => {
    const w = await mountView()

    expect(w.findAll('button[role="switch"]')).toHaveLength(3)
    expect(projectSection(w).text()).toContain('alpha-app')
    expect(projectSection(w).text()).toContain('beta-lab')
    expect(checked(w, 'alpha-app')).toBe('true')
    expect(checked(w, 'beta-lab')).toBe('false')
    expect(checked(w, 'gamma-kit')).toBe('true')
  })

  it('它應該顯示專案總數與不公開的數量', async () => {
    const w = await mountView()

    const text = projectSection(w).get('div').text().replace(/\s+/g, ' ')
    expect(text).toContain('全部 3')
    expect(text).toContain('不公開 1')
  })

  it('它應該把沒有 is_visible 的專案（後端只在登入時才回）當成公開', async () => {
    const w = await mountView([project('1', 'no-flag')])

    expect(checked(w, 'no-flag')).toBe('true')
    expect(projectSection(w).get('div').text().replace(/\s+/g, ' ')).toContain('不公開 0')
  })

  it('它應該在切成不公開時只送出該專案與 false', async () => {
    const w = await mountView()

    await switchOf(w, 'alpha-app').trigger('click')

    expect(setProjectVisibility).toHaveBeenCalledTimes(1)
    expect(setProjectVisibility).toHaveBeenCalledWith(expect.objectContaining({ id: '1', title: 'alpha-app' }), false)
    expect(checked(w, 'alpha-app')).toBe('false')
    expect(projectSection(w).get('div').text().replace(/\s+/g, ' ')).toContain('不公開 2')
  })

  it('它應該在切回公開時送出 true', async () => {
    const w = await mountView()

    await switchOf(w, 'beta-lab').trigger('click')

    expect(setProjectVisibility).toHaveBeenCalledWith(expect.objectContaining({ id: '2', title: 'beta-lab' }), true)
    expect(checked(w, 'beta-lab')).toBe('true')
  })

  it('它應該在送出失敗時把開關還原，並在該列顯示請求與狀態碼', async () => {
    vi.mocked(setProjectVisibility).mockRejectedValue(new ApiRequestError(500, '/implementations/1', 'PUT'))
    const w = await mountView()

    await switchOf(w, 'alpha-app').trigger('click')
    await flushPromises()

    expect(checked(w, 'alpha-app')).toBe('true')
    const alert = w.get('[role="alert"]')
    expect(alert.text()).toBe('切換失敗：PUT /implementations/1 回傳 HTTP 500')
    // 錯誤掛在失敗的那一列，不是別列
    expect(alert.element.closest('li')?.textContent).toContain('alpha-app')
    expect(projectSection(w).get('div').text().replace(/\s+/g, ' ')).toContain('不公開 1')
  })

  it('它應該在關閉失敗與開啟失敗時都還原到原本的值', async () => {
    vi.mocked(setProjectVisibility).mockRejectedValue(new ApiRequestError(403, '/implementations/2', 'PUT'))
    const w = await mountView()

    await switchOf(w, 'beta-lab').trigger('click')
    await flushPromises()

    expect(checked(w, 'beta-lab')).toBe('false')
  })

  it.each([
    { name: '驗證沒過（422）', error: new ApiValidationError({ title: 'The title field is required.' }), message: '切換失敗：後端驗證沒過（The title field is required.）' },
    { name: '驗證沒過但沒有欄位訊息', error: new ApiValidationError({}), message: '切換失敗：後端驗證沒過' },
    { name: '連不上後端', error: new TypeError('Failed to fetch'), message: '切換失敗：連不上後端 API（Failed to fetch）' },
    { name: '登入狀態改變', error: new Error('送出之後登入狀態已經改變'), message: '切換失敗：送出之後登入狀態已經改變' },
  ])('它應該在$name時還原並顯示對應的錯誤', async ({ error, message }) => {
    vi.mocked(setProjectVisibility).mockRejectedValue(error)
    const w = await mountView()

    await switchOf(w, 'alpha-app').trigger('click')
    await flushPromises()

    expect(checked(w, 'alpha-app')).toBe('true')
    expect(w.get('[role="alert"]').text()).toBe(message)
  })

  it('它應該在下一次切換開始時清掉上一次的錯誤', async () => {
    vi.mocked(setProjectVisibility).mockRejectedValueOnce(new ApiRequestError(500, '/implementations/1', 'PUT'))
    const w = await mountView()
    await switchOf(w, 'alpha-app').trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(true)

    await switchOf(w, 'alpha-app').trigger('click')
    await flushPromises()

    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(checked(w, 'alpha-app')).toBe('false')
  })

  it('它應該在同一列送出中時不收第二次切換', async () => {
    let finish!: () => void
    vi.mocked(setProjectVisibility).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)))
    const w = await mountView()

    await switchOf(w, 'alpha-app').trigger('click')
    await switchOf(w, 'alpha-app').trigger('click')

    expect(setProjectVisibility).toHaveBeenCalledTimes(1)
    expect(checked(w, 'alpha-app')).toBe('false')

    finish()
    await flushPromises()
    await switchOf(w, 'alpha-app').trigger('click')
    expect(setProjectVisibility).toHaveBeenCalledTimes(2)
  })

  it('它應該讓一列送出中時不擋住別列的切換', async () => {
    vi.mocked(setProjectVisibility).mockReturnValue(new Promise<void>(() => {}))
    const w = await mountView()

    await switchOf(w, 'alpha-app').trigger('click')
    await switchOf(w, 'gamma-kit').trigger('click')

    expect(setProjectVisibility).toHaveBeenCalledTimes(2)
  })

  it('它應該在專案清單載入失敗時不畫開關，並在上方列出失敗的請求', async () => {
    const w = await mountView(new ApiHttpError(500, '/implementations?type=12', 'GET'))

    expect(w.findAll('button[role="switch"]')).toHaveLength(0)
    expect(w.get('[role="alert"]').text()).toContain('專案：GET /implementations?type=12 回傳 HTTP 500')
    expect(projectSection(w).text()).toContain('專案清單沒載入')
  })

  it('它應該在沒有任何專案時顯示空狀態', async () => {
    const w = await mountView([])

    expect(w.findAll('button[role="switch"]')).toHaveLength(0)
    expect(projectSection(w).text()).toContain('目前沒有專案')
  })
})
