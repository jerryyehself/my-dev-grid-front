import { apiGet, describeLoadError } from './client'
import { techniqueLabel } from './techniqueLabel'

/** 專案用到的一個技術。版本是後端獨立的一筆技術（title 相同、version 填主版號，2026-09-30） */
export interface ProjectTechnique {
  name: string
  version: string | null
  /** 後端的技術子類 scope 名稱（language、framework、packagetool…），查不到時是空字串 */
  category: string
}

export interface Project {
  id: string
  title: string
  status?: string
  statusType?: 'active' | 'archived'
  desc: string
  /** 顯示用的標籤，帶版本（例如「Vue 3」） */
  tags: string[]
  /** 篩選用。示範資料快照沒有這個欄位，篩選時退回用 tags */
  techniques?: ProjectTechnique[]
  started: string
  repo: string
  role?: string
  /** 後端 Implementation 的 id。圖譜節點連到專案頁時用它選中那一筆（?implementation=<id>）；
   *  示範資料快照沒有這個欄位 */
  implementationId?: number
}

interface ScopeDto {
  id: number
  name: string
}

interface TechniqueDto {
  title: string
  version?: string | null
  /** scope id */
  type?: number
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
// 的作法動態查表，不寫死魔數；同一個 session 內查過一次就快取起來。技術的分類（語言、框架…）
// 也是 scope，同一張表一起留著
let scopeNameById: Map<number, string> | null = null

async function getScopeNames(): Promise<Map<number, string>> {
  if (scopeNameById) return scopeNameById
  const { data } = await apiGet<{ data: ScopeDto[] }>('/scopes')
  scopeNameById = new Map(data.map((scope) => [scope.id, scope.name]))
  return scopeNameById
}

async function getProjectScopeId(): Promise<number> {
  const names = await getScopeNames()
  for (const [id, name] of names) if (name === 'project') return id
  throw new Error("Scope 'project' 不存在，無法過濾 Implementation")
}

/**
 * 同一個專案可能同時連到「Vue」和「Vue 3」（升級前就有的邊會留著，見後端 last_seen_at）。
 * 知道版本的時候只顯示有版本的那個，版本留空的那筆是多餘的；同名同版本的也只留一個。
 */
export function toProjectTechniques(raw: TechniqueDto[], scopeNames: Map<number, string>): ProjectTechnique[] {
  const versioned = new Set(raw.filter((t) => t.version).map((t) => t.title.toLowerCase()))
  const seen = new Set<string>()
  const out: ProjectTechnique[] = []
  for (const t of raw) {
    if (!t.version && versioned.has(t.title.toLowerCase())) continue
    const key = `${t.title.toLowerCase()}|${t.version ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      name: t.title,
      version: t.version ?? null,
      category: (t.type != null && scopeNames.get(t.type)) || '',
    })
  }
  return out
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

const toProject = (raw: ImplementationDto, id: string, scopeNames: Map<number, string>): Project => {
  const statusType = toStatusType(raw.maintain_status)
  const techniques = toProjectTechniques(raw.techniques, scopeNames)
  return {
    id,
    title: raw.title,
    status: statusType === 'archived' ? 'Archived' : statusType === 'active' ? 'Active' : undefined,
    statusType,
    desc: raw.description ?? '',
    tags: techniques.map((t) => techniqueLabel(t.name, t.version)),
    techniques,
    started: toStartedYm(raw.git_repo_created_at),
    repo: raw.title,
    implementationId: raw.id,
  }
}

// 顯示用的 id（PROJ-YYYY-NN）不是後端欄位，是純前端計算——沿用原本
// scripts/sync-projects.mjs 的規則：依建立時間由新到舊排序，同一年內從 01 起算。
export async function fetchProjects(): Promise<Project[]> {
  const scopeId = await getProjectScopeId()
  const scopeNames = await getScopeNames()
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
    return toProject(raw, id, scopeNames)
  })
}

// 2026-09-04 從真實資料庫的 fetchProjects() 存下來的快照（2 個真實專案，透過本檔案同一套
// 轉換邏輯手動跑出來的結果，不是編的），只給 StatusBoardPanel 在「單機展示、後端沒起來」
// 時當保底填充用——跟 graph.ts 的 graphDemoFixture.json 同一套作法，不是常態資料來源。
import projectsDemoFixture from '@/data/projectsDemoFixture.json'

export async function fetchProjectsOrDemo(): Promise<{ projects: Project[]; loadError: string | null }> {
  try {
    return { projects: await fetchProjects(), loadError: null }
  } catch (e) {
    console.warn('[projects] 載入失敗，改用示範資料快照', e)
    return { projects: projectsDemoFixture as Project[], loadError: describeLoadError(e) }
  }
}
