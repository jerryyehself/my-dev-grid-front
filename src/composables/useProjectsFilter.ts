import { ref, computed, type Ref } from 'vue'
import type { Project, ProjectTechnique } from '@/api/projects'

// 分組照後端的技術子類（scope），不再手動維護 tag → 分類對照表。舊的對照表會漏（新 tag 一律
// 掉進「其他」），也分錯過（Vue 被放在「語言」、laravel 放在「套件」）。2026-09-30 後端改成
// 權威控制之後，類別以後端為準（使用者同意）。標籤最多四個字：左欄寬 64px，五個字會折行
const CATEGORY_LABEL: Record<string, string> = {
  language: '語言',
  framework: '框架',
  packagetool: '套件工具',
  environment: '執行環境',
  assistant: 'AI 工具',
}
const CATEGORY_ORDER = ['語言', '框架', '套件工具', '執行環境', 'AI 工具', '其他']

// 示範資料快照只有 tags、沒有 techniques，這時每個 tag 當成一個分類不明的技術
const techniquesOf = (p: Project): ProjectTechnique[] =>
  p.techniques ?? p.tags.map((tag) => ({ name: tag, version: null, category: '' }))

// projects 收 Ref 而不是純陣列：專案清單現在是非同步從 API 載入，
// 用 Ref 才能在資料到達後讓底下這些 computed 自動重新計算。
export function useProjectsFilter(projects: Ref<Project[]>) {
  // 篩選項以技術名稱為單位，不分版本：選「Vue」會找出用 Vue 2、Vue 3 或沒標版本的專案。
  // 標籤本身（專案詳情裡那排）才顯示版本
  const techniqueStats = computed(() => {
    const stats = new Map<string, { count: number; category: string }>()
    for (const p of projects.value) {
      for (const name of new Set(techniquesOf(p).map((t) => t.name))) {
        const category = techniquesOf(p).find((t) => t.name === name)?.category ?? ''
        const entry = stats.get(name) ?? { count: 0, category }
        entry.count += 1
        entry.category ||= category
        stats.set(name, entry)
      }
    }
    return stats
  })

  const selectedTags = ref<Set<string>>(new Set())

  const filterGroups = computed(() => {
    const byCategory: Record<string, string[]> = {}
    for (const [name, { category }] of techniqueStats.value) {
      const label = CATEGORY_LABEL[category] ?? '其他'
      ;(byCategory[label] ??= []).push(name)
    }
    return CATEGORY_ORDER.filter((label) => byCategory[label]?.length).map((label) => ({
      label,
      tags: byCategory[label]!.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).map((name) => ({
        label: name,
        count: techniqueStats.value.get(name)!.count,
        selected: selectedTags.value.has(name),
      })),
    }))
  })

  const toggleTag = (tag: string) => {
    const next = new Set(selectedTags.value)
    if (next.has(tag)) next.delete(tag)
    else next.add(tag)
    selectedTags.value = next
  }
  const clearFilter = () => {
    selectedTags.value = new Set()
  }

  // 篩選是 OR 邏輯：命中任一個選取的標籤就算，不要求同時符合所有分類
  const filteredProjects = computed(() => {
    if (selectedTags.value.size === 0) return projects.value
    return projects.value.filter((p) => techniquesOf(p).some((t) => selectedTags.value.has(t.name)))
  })

  return { selectedTags, filterGroups, toggleTag, clearFilter, filteredProjects }
}
