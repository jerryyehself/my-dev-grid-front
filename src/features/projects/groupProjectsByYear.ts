import type { Project } from '@/api/projects'

export interface YearGroup {
  /** 四位數年份；沒有開始日期的專案是空字串 */
  year: string
  projects: Project[]
}

/** 開始日期（「2024.11」）的年份；格式不對或沒有日期回空字串 */
export function yearOf(started: string): string {
  const year = started.slice(0, 4)
  return /^\d{4}$/.test(year) ? year : ''
}

/**
 * 依開始年份分組，組與組、組內的順序都照傳進來的順序（API 已經依開始日期新到舊排好）。
 * 同一年的專案即使不相鄰也會歸在同一組，標頭不會重複出現。
 */
export function groupProjectsByYear(projects: readonly Project[]): YearGroup[] {
  const groups = new Map<string, Project[]>()
  for (const project of projects) {
    const year = yearOf(project.started)
    const list = groups.get(year)
    if (list) list.push(project)
    else groups.set(year, [project])
  }
  return [...groups].map(([year, list]) => ({ year, projects: list }))
}
