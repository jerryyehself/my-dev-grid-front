import { apiGet } from './client'

export interface Project {
  id: string
  title: string
  status?: string
  statusType?: 'active' | 'archived'
  desc: string
  tags: string[]
  started: string
  repo: string
  role?: string
}

interface ScopeDto {
  id: number
  name: string
}

interface TechniqueDto {
  title: string
}

interface ImplementationDto {
  id: number
  title: string
  description: string | null
  git_repo_created_at: string | null
  maintain_status: boolean | null
  techniques: TechniqueDto[]
}

// Scope id 不是固定值（依 seed 順序而定），照 backend SaveReposDataService 自己
// 的作法動態查表，不寫死魔數；同一個 session 內查過一次就快取起來。
let projectScopeId: number | null = null

async function getProjectScopeId(): Promise<number> {
  if (projectScopeId !== null) return projectScopeId
  const { data } = await apiGet<{ data: ScopeDto[] }>('/scopes')
  const projectScope = data.find((scope) => scope.name === 'project')
  if (!projectScope) {
    throw new Error("Scope 'project' 不存在，無法過濾 Implementation")
  }
  projectScopeId = projectScope.id
  return projectScopeId
}

const toStartedYm = (dateStr: string | null): string => (dateStr ? dateStr.slice(0, 7).replace('-', '.') : '')

// desc/status 目前有已知的後端資料缺口（description、maintain_status 的 GitHub
// archived 對應都還沒接上同步邏輯，一律是 null）——這裡用「沒有資料就不顯示」優雅
// 降級，而不是「沒有資料就當作預設值」：maintain_status 是「從沒被賦值過」，不是
// 「這筆資料本來就沒有這個概念」，如果 null 也顯示 Active，等於在後端補欄位之前
// 對已經封存的專案主動顯示錯誤資訊。等後端補齊欄位後這裡不用再改。
const toStatusType = (maintainStatus: boolean | null): 'active' | 'archived' | undefined => {
  if (maintainStatus === null) return undefined
  return maintainStatus ? 'active' : 'archived'
}

const toProject = (raw: ImplementationDto, id: string): Project => {
  const statusType = toStatusType(raw.maintain_status)
  return {
    id,
    title: raw.title,
    status: statusType === 'archived' ? 'Archived' : statusType === 'active' ? 'Active' : undefined,
    statusType,
    desc: raw.description ?? '',
    tags: raw.techniques.map((t) => t.title),
    started: toStartedYm(raw.git_repo_created_at),
    repo: raw.title,
  }
}

// 顯示用的 id（PROJ-YYYY-NN）不是後端欄位，是純前端計算——沿用原本
// scripts/sync-projects.mjs 的規則：依建立時間由新到舊排序，同一年內從 01 起算。
export async function fetchProjects(): Promise<Project[]> {
  const scopeId = await getProjectScopeId()
  const { data } = await apiGet<{ data: ImplementationDto[] }>(`/implementations?type=${scopeId}`)

  const sorted = [...data].sort((a, b) => {
    const aDate = a.git_repo_created_at ?? ''
    const bDate = b.git_repo_created_at ?? ''
    return aDate < bDate ? 1 : aDate > bDate ? -1 : 0
  })

  const yearCounters: Record<string, number> = {}
  return sorted.map((raw) => {
    const year = (raw.git_repo_created_at ?? '').slice(0, 4) || 'UNKNOWN'
    yearCounters[year] = (yearCounters[year] ?? 0) + 1
    const id = `PROJ-${year}-${String(yearCounters[year]).padStart(2, '0')}`
    return toProject(raw, id)
  })
}

// 2026-09-04 從真實資料庫的 fetchProjects() 存下來的快照（2 個真實專案，透過本檔案同一套
// 轉換邏輯手動跑出來的結果，不是編的），只給 StatusBoardPanel 在「單機展示、後端沒起來」
// 時當保底填充用——跟 graph.ts 的 graphDemoFixture.json 同一套作法，不是常態資料來源。
import projectsDemoFixture from '@/data/projectsDemoFixture.json'

export async function fetchProjectsOrDemo(): Promise<{ projects: Project[]; isDemo: boolean }> {
  try {
    return { projects: await fetchProjects(), isDemo: false }
  } catch (e) {
    console.warn('[projects] 連不上後端，改用示範資料快照（僅供單機展示）', e)
    return { projects: projectsDemoFixture as Project[], isDemo: true }
  }
}
