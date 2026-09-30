import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchProjects, toProjectTechniques } from './projects'

const mockFetch = vi.fn()

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function mockScopesAndImplementations(implementations: unknown[]) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/scopes')) {
      return jsonResponse({
        data: [
          { id: 5, name: 'language' },
          { id: 12, name: 'project' },
        ],
      })
    }
    if (url.includes('/implementations')) {
      return jsonResponse({ data: implementations })
    }
    throw new Error(`unexpected url: ${url}`)
  })
}

describe('fetchProjects', () => {
  it('依 name 動態查出 project scope id，帶進 implementations 的 ?type= 查詢', async () => {
    mockScopesAndImplementations([])
    await fetchProjects()

    const implCall = mockFetch.mock.calls.find(([url]) => url.includes('/implementations'))
    expect(implCall?.[0]).toContain('type=12')
  })

  it('把 ImplementationResource 形狀轉成既有的 Project 型別', async () => {
    mockScopesAndImplementations([
      {
        id: 1,
        title: 'my-dev-grid-front',
        description: '學習檔案前端',
        git_repo_created_at: '2026-06-15 10:00:00',
        maintain_status: true,
        techniques: [{ title: 'Vue3' }, { title: 'TypeScript' }],
      },
    ])

    const projects = await fetchProjects()

    expect(projects).toEqual([
      {
        id: 'PROJ-2026-01',
        title: 'my-dev-grid-front',
        status: 'Active',
        statusType: 'active',
        desc: '學習檔案前端',
        tags: ['Vue3', 'TypeScript'],
        techniques: [
          { name: 'Vue3', version: null, category: '' },
          { name: 'TypeScript', version: null, category: '' },
        ],
        started: '2026.06',
        repo: 'my-dev-grid-front',
        implementationId: 1,
      },
    ])
  })

  it('maintain_status 為 false 對應 Archived、true 對應 Active，null 則隱藏徽章（不是預設 Active）', async () => {
    // null 代表「這欄位從沒被賦值過」，不是「已知未封存」——如果 null 也顯示 Active，
    // 等於在 backend 補齊 GitHub archived 同步之前，把真的已封存的專案顯示成還在維護。
    mockScopesAndImplementations([
      { id: 1, title: 'a', description: null, git_repo_created_at: '2025-01-01 00:00:00', maintain_status: false, techniques: [] },
      { id: 2, title: 'b', description: null, git_repo_created_at: '2024-01-01 00:00:00', maintain_status: null, techniques: [] },
      { id: 3, title: 'c', description: null, git_repo_created_at: '2023-01-01 00:00:00', maintain_status: true, techniques: [] },
    ])

    const projects = await fetchProjects()

    expect(projects.map((p) => [p.status, p.statusType])).toEqual([
      ['Archived', 'archived'],
      [undefined, undefined],
      ['Active', 'active'],
    ])
  })

  it('description 為 null 時 desc 是空字串，不是 null', async () => {
    mockScopesAndImplementations([
      { id: 1, title: 'a', description: null, git_repo_created_at: '2026-01-01 00:00:00', maintain_status: null, techniques: [] },
    ])

    const projects = await fetchProjects()

    expect(projects[0]!.desc).toBe('')
  })

  it('同一年內依建立時間新到舊，從 01 開始編號；跨年各自重新起算', async () => {
    mockScopesAndImplementations([
      { id: 1, title: 'older-2025', description: null, git_repo_created_at: '2025-02-01 00:00:00', maintain_status: null, techniques: [] },
      { id: 2, title: 'newer-2025', description: null, git_repo_created_at: '2025-11-01 00:00:00', maintain_status: null, techniques: [] },
      { id: 3, title: 'only-2024', description: null, git_repo_created_at: '2024-05-01 00:00:00', maintain_status: null, techniques: [] },
    ])

    const projects = await fetchProjects()

    expect(projects.map((p) => [p.id, p.title])).toEqual([
      ['PROJ-2025-01', 'newer-2025'],
      ['PROJ-2025-02', 'older-2025'],
      ['PROJ-2024-01', 'only-2024'],
    ])
  })
})

describe('toProjectTechniques', () => {
  const scopes = new Map([
    [5, 'language'],
    [9, 'framework'],
  ])

  it('標籤帶版本、分類換成後端的 scope 名稱', () => {
    expect(
      toProjectTechniques(
        [
          { title: 'Vue', version: '3', type: 9 },
          { title: 'PHP', version: null, type: 5 },
        ],
        scopes,
      ),
    ).toEqual([
      { name: 'Vue', version: '3', category: 'framework' },
      { name: 'PHP', version: null, category: 'language' },
    ])
  })

  it('同時有「Vue」和「Vue 3」時只留 Vue 3（升級前的邊還留著，但版本已經知道了）', () => {
    const out = toProjectTechniques(
      [
        { title: 'Vue', version: null, type: 9 },
        { title: 'Vue', version: '3', type: 9 },
        { title: 'Vue', version: '2', type: 9 },
      ],
      scopes,
    )
    expect(out.map((t) => `${t.name} ${t.version}`)).toEqual(['Vue 3', 'Vue 2'])
  })

  it('查不到分類時留空字串，不猜', () => {
    expect(toProjectTechniques([{ title: 'x', type: 999 }], scopes)).toEqual([{ name: 'x', version: null, category: '' }])
  })
})
