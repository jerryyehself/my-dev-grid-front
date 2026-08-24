import { ref, computed } from 'vue'
import type { Project } from '@/data/projects'

// tag → 分類對照表：GitHub topics 本身不帶語意，這份分類是手動維護的，
// 不是自動推斷——新增專案帶新 tag 時要記得回來補一筆，不然會落到「其他」。
const TAG_CATEGORY: Record<string, string> = {
  Vue: '語言',
  TypeScript: '語言',
  php: '語言',
  python: '語言',
  laravel: '套件',
  vue3: '套件',
  vue: '套件',
  tailwind: '套件',
  nuxt3: '套件',
  pinia: '套件',
  vuetify: '套件',
  'vueuse-core': '套件',
  bootstrap5: '套件',
  chartjs: '套件',
  exceljs: '套件',
  'html5-qrcode': '套件',
  isbn3: '套件',
  rdflib: '套件',
  graphviz: '套件',
  cheerio: '套件',
  appscript: '環境',
  linebot: '環境',
  leetcode: '環境',
  i18n: '其他',
  json: '其他',
}
const CATEGORY_ORDER = ['語言', '套件', '環境', '其他']

export function useProjectsFilter(projects: Project[]) {
  const tagCounts = computed(() => {
    const counts: Record<string, number> = {}
    for (const p of projects) {
      for (const tag of p.tags) {
        counts[tag] = (counts[tag] ?? 0) + 1
      }
    }
    return counts
  })

  const selectedTags = ref<Set<string>>(new Set())

  const filterGroups = computed(() => {
    const byCategory: Record<string, string[]> = {}
    for (const tag of Object.keys(tagCounts.value)) {
      const category = TAG_CATEGORY[tag] ?? '其他'
      ;(byCategory[category] ??= []).push(tag)
    }
    return CATEGORY_ORDER.filter((category) => byCategory[category]?.length).map((category) => ({
      label: category,
      tags: byCategory[category]!.sort().map((tag) => ({
        label: tag,
        count: tagCounts.value[tag],
        selected: selectedTags.value.has(tag),
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
    if (selectedTags.value.size === 0) return projects
    return projects.filter((p) => p.tags.some((tag) => selectedTags.value.has(tag)))
  })

  return { selectedTags, filterGroups, toggleTag, clearFilter, filteredProjects }
}
