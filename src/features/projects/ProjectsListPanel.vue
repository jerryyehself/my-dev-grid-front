<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import type { Project } from '@/api/projects'
import ProjectsFilterPanel from './ProjectsFilterPanel.vue'
import ProjectsYearList from './ProjectsYearList.vue'
import { STICKY_TOP_PX } from '@/layouts/stickyOffset'
import { groupProjectsByYear } from './groupProjectsByYear'
import type { ProjectsFilterGroupData } from './useProjectsFilter'

// 桌機版左欄：一個有框、不透明表面的面板，裡面由上到下是「筆數｜篩選鈕」、
// 展開的篩選、依年份分組的列表。
//
// 面板 sticky 在導覽列下方，高度上限讓整個面板在第一屏放得下，列表在面板內部捲，
// 詳情跟著頁面捲。sticky 的 top 用 STICKY_TOP_PX（算法見 layouts/stickyOffset.ts）。
// 高度上限的 228px＝面板在頁面頂端時上緣的位置（約 204px）
// 加下緣留白 24px，量過 1440×900；頁首（MainLayout 的通用表頭）高度改了要一起調。
const props = defineProps<{
  projects: Project[]
  /** 篩選前的專案總數，沒有專案時的空狀態要分得出「沒有專案」跟「篩選後沒有」 */
  totalCount: number
  selectedId: string
  filterGroups: ProjectsFilterGroupData[]
  hasSelection: boolean
}>()
const emit = defineEmits<{ select: [id: string]; toggleTag: [label: string]; clearFilter: [] }>()

const filterOpen = ref(false)
const filterPanelId = useId()
const groups = computed(() => groupProjectsByYear(props.projects))

const list = ref<InstanceType<typeof ProjectsYearList>>()
defineExpose({ revealSelected: () => list.value?.revealSelected() })
</script>

<template>
  <div
    class="sticky flex max-h-[max(360px,calc(100vh-228px))] min-h-0 flex-col overflow-hidden rounded-xl border border-(--border-shelf) bg-(--list-surface)"
    :style="{ top: `${STICKY_TOP_PX}px` }"
  >
    <div class="flex flex-none items-center justify-between px-4 py-3">
      <p class="m-0 text-left text-[13px] leading-5 tracking-[0.06em] text-(--text-ink-muted)" aria-live="polite">
        {{ projects.length }} 筆｜依開始日期
      </p>
      <button
        type="button"
        class="inline-flex h-7 cursor-pointer items-center gap-2 rounded-[14px] border border-[color-mix(in_srgb,var(--text-ink-main)_35%,transparent)] px-3 text-[13px] leading-5 font-semibold tracking-[0.06em] text-(--text-ink-main) transition-colors hover:border-[color-mix(in_srgb,var(--text-ink-main)_65%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
        :class="filterOpen && 'bg-[color-mix(in_srgb,var(--text-ink-main)_8%,transparent)]'"
        :aria-expanded="filterOpen"
        :aria-controls="filterOpen ? filterPanelId : undefined"
        @click="filterOpen = !filterOpen"
      >
        篩選<span aria-hidden="true">{{ filterOpen ? '▴' : '▾' }}</span>
      </button>
    </div>

    <ProjectsFilterPanel
      v-if="filterOpen"
      :id="filterPanelId"
      :groups="filterGroups"
      :has-selection="hasSelection"
      @toggle-tag="emit('toggleTag', $event)"
      @clear="emit('clearFilter')"
    />

    <ProjectsYearList v-if="projects.length" ref="list" :groups="groups" :selected-id="selectedId" @select="emit('select', $event)" />
    <p v-else class="m-0 px-4 py-10 text-center text-sm text-(--text-ink-muted)">
      {{ totalCount === 0 ? '目前沒有可顯示的專案。' : '沒有符合篩選條件的專案。' }}
    </p>
  </div>
</template>
