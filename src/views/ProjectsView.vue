<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseTag from '@/components/BaseTag.vue'
import { projects } from '@/data/projects'

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

const selectedId = ref(projects[0]!.id)
const selected = computed(() => projects.find((p) => p.id === selectedId.value) ?? projects[0]!)

// 篩選把目前選中的專案擠出清單時，自動切到篩選後清單的第一筆，不留一個選不到的空白詳情面板
watch(
  filteredProjects,
  (list) => {
    if (!list.some((p) => p.id === selectedId.value)) {
      selectedId.value = (list[0] ?? projects[0]!).id
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="w-full">
    <div v-if="selectedTags.size > 0" class="flex justify-end mb-3">
      <button
        type="button"
        class="font-mono text-[11px] text-(--text-accent) font-bold tracking-[0.05em] border-b border-(--text-accent) pb-0.5 cursor-pointer"
        @click="clearFilter"
      >
        清除篩選 ×
      </button>
    </div>

    <!-- 標籤篩選器：依語言／套件／環境／其他分組，跟下面的主從式列表共用同一份專案資料 -->
    <div class="border border-(--border-shelf) rounded-[10px] bg-(--bg-paper-light) px-[22px] py-[18px] mb-5 flex flex-col gap-3">
      <div v-for="group in filterGroups" :key="group.label" class="flex items-center gap-3.5 flex-wrap">
        <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) w-16 shrink-0">
          {{ group.label }}
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="tag in group.tags"
            :key="tag.label"
            type="button"
            class="px-[11px] py-1 rounded-full font-mono text-[11px] border transition-colors cursor-pointer"
            :class="
              tag.selected
                ? 'border-(--text-accent) text-(--text-accent) bg-(--bg-folder)'
                : 'border-(--border-shelf) text-(--text-ink-body) hover:border-(--text-accent)/40'
            "
            @click="toggleTag(tag.label)"
          >
            {{ tag.label }} <span class="opacity-55">{{ tag.count }}</span>
          </button>
        </div>
      </div>
    </div>

  <div class="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] border border-(--border-shelf) rounded-xl overflow-hidden bg-(--bg-paper-light)">
    <div class="border-b md:border-b-0 md:border-r border-(--border-shelf)">
      <button
        v-for="proj in filteredProjects"
        :key="proj.id"
        type="button"
        class="w-full text-left px-4.5 py-4 border-b border-(--border-shelf) last:border-b-0 transition-colors cursor-pointer"
        :class="
          selectedId === proj.id
            ? 'bg-(--bg-folder) border-l-[3px] border-l-(--text-accent)'
            : 'border-l-[3px] border-l-transparent hover:bg-(--bg-folder)/60'
        "
        @click="selectedId = proj.id"
      >
        <div class="flex items-center justify-between mb-1.5 font-mono text-[10px] text-(--text-ink-muted)">
          <span>{{ proj.id }}</span>
          <BaseTag :tone="proj.statusType === 'active' ? 'accent' : 'muted'">
            {{ proj.status }}
          </BaseTag>
        </div>
        <div class="text-sm font-bold text-(--text-ink-main) leading-snug">
          {{ proj.title }}
        </div>
      </button>
      <div v-if="selectedTags.size > 0" class="px-4.5 py-4 font-mono text-[10px] text-(--text-ink-muted) opacity-60">
        {{ filteredProjects.length }} / {{ projects.length }} 個專案符合篩選
      </div>
    </div>

    <div class="p-6 sm:p-8">
      <div class="flex items-center justify-between mb-5 font-mono text-[10px] tracking-wider text-(--text-ink-muted)">
        <span>{{ selected.id }}</span>
        <BaseTag :tone="selected.statusType === 'active' ? 'accent' : 'muted'">
          {{ selected.status }}
        </BaseTag>
      </div>

      <h2 class="text-xl sm:text-2xl font-extrabold text-(--text-ink-main) mb-3.5">
        {{ selected.title }}
      </h2>

      <p v-if="selected.desc" class="text-sm sm:text-[15px] text-(--text-ink-body) leading-relaxed text-justify max-w-2xl mb-6">
        {{ selected.desc }}
      </p>

      <div class="flex flex-wrap gap-2 font-mono text-[11px] mb-6">
        <BaseTag v-for="tag in selected.tags" :key="tag">{{ tag }}</BaseTag>
      </div>

      <div class="pt-5 border-t border-(--border-shelf) grid grid-cols-3 gap-4">
        <div>
          <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Started</div>
          <div class="text-[13px] text-(--text-ink-main)">{{ selected.started }}</div>
        </div>
        <div>
          <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Role</div>
          <div class="text-[13px] text-(--text-ink-main)">{{ selected.role || '—' }}</div>
        </div>
        <div>
          <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Repo</div>
          <a
            :href="`https://github.com/jerryyehself/${selected.repo}`"
            target="_blank"
            class="text-[13px] text-(--text-ink-main) hover:text-(--text-accent) hover:underline"
          >
            {{ selected.repo }}
          </a>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>
