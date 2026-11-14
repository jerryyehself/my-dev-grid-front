<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import BaseTag from '@/components/BaseTag.vue'
import type { Project } from '@/api/projects'
import { techniqueLabel } from '@/api/techniqueLabel'
import { orderedTechniques, type ProjectsFilterGroupData } from './useProjectsFilter'
import { PROJECTS_EMPTY_TEXT, PROJECTS_NO_MATCH_TEXT } from '@/copy/common'

// 手機版版面：2026-11 桌機版重做之後，手機版維持原本的樣子（篩選面板收合、清單與詳情上下堆疊），
// 之後會另外檢視重做，到時整個檔案換掉。跟舊版的差別只有一個：PROJ-YYYY-NN 顯示編號沒有了
// （專案 id 現在是後端 id），所以清單列與詳情都不再顯示編號，詳情上那顆「最新的專案」標示也跟著拿掉。
const props = defineProps<{
  projects: Project[]
  /** 篩選前的專案總數 */
  totalCount: number
  selected: Project | undefined
  filterGroups: ProjectsFilterGroupData[]
  selectedTags: ReadonlySet<string>
}>()
const emit = defineEmits<{ select: [id: string]; toggleTag: [label: string]; clearFilter: [] }>()

// 手機版篩選面板預設收合：16 個專案的技術標籤展開後將近 700px，會把清單擠出第一屏
// （模擬讀者審查）
const filterOpen = ref(false)
const selectedTagList = computed(() => [...props.selectedTags])

// 清單和詳情上下堆疊，點了清單看不到詳情換了；點完捲到詳情
const detailBox = ref<HTMLElement>()
const pick = async (id: string) => {
  emit('select', id)
  await nextTick()
  detailBox.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 詳情裡的技術標籤：照篩選器的分類順序排；目前篩選中的技術加框，選了「Vue」就看得出這個專案用的是 Vue 3
const selectedTechniqueTags = computed(() =>
  props.selected
    ? orderedTechniques(props.selected).map((t) => ({
        label: techniqueLabel(t.name, t.version),
        matched: props.selectedTags.has(t.name),
      }))
    : [],
)

const listBox = ref<HTMLElement>()
defineExpose({
  revealSelected: () => listBox.value?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' }),
})
</script>

<template>
  <div>
    <button
      type="button"
      class="mb-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-(--border-shelf) bg-(--bg-paper-light) px-4 py-3 text-left"
      :aria-expanded="filterOpen"
      aria-controls="project-filter-panel"
      @click="filterOpen = !filterOpen"
    >
      <span class="text-[14px] text-(--text-ink-main)">
        依技術篩選<span v-if="selectedTags.size > 0" class="text-(--text-accent)">：{{ selectedTagList.join('、') }}</span>
      </span>
      <span aria-hidden="true" class="font-mono text-[13px] text-(--text-ink-muted)">{{ filterOpen ? '收合 ▴' : '展開 ▾' }}</span>
    </button>
    <div
      id="project-filter-panel"
      class="mb-5 grid-cols-[64px_1fr] items-baseline gap-x-3.5 gap-y-4 rounded-[10px] border border-(--border-shelf) bg-(--bg-paper-light) px-[22px] py-[18px]"
      :class="filterOpen ? 'grid' : 'hidden'"
    >
      <template v-for="group in filterGroups" :key="group.label">
        <div class="text-[13px] tracking-[0.05em] text-(--text-ink-muted)">
          {{ group.label }}
        </div>
        <div class="flex min-w-0 flex-wrap gap-1.5">
          <button
            v-for="tag in group.tags"
            :key="tag.label"
            type="button"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border py-[3px] pr-1 pl-[11px] font-mono text-[11px] transition-colors"
            :class="
              tag.selected
                ? 'border-(--text-accent) bg-(--bg-folder) text-(--text-accent)'
                : 'border-(--border-shelf) text-(--text-ink-body) hover:border-(--text-accent)/40'
            "
            :aria-pressed="tag.selected"
            :aria-label="`${tag.label}，${tag.count} 個專案`"
            @click="emit('toggleTag', tag.label)"
          >
            {{ tag.label }}
            <span aria-hidden="true" class="rounded-full bg-(--bg-paper-dark) px-1.5 text-(--text-ink-muted) tabular-nums">{{
              tag.count
            }}</span>
          </button>
        </div>
      </template>
      <div class="col-span-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-(--border-shelf) pt-3">
        <p class="m-0 text-left text-[13px] text-(--text-ink-muted)">選一個技術會包含它的所有版本，例如 Vue 也包含 Vue 3。</p>
        <button
          v-if="selectedTags.size > 0"
          type="button"
          class="cursor-pointer border-b border-(--text-accent) pb-0.5 font-mono text-[11px] font-bold tracking-[0.05em] text-(--text-accent)"
          @click="emit('clearFilter')"
        >
          清除篩選 ×
        </button>
      </div>
    </div>

    <p v-if="projects.length > 0" class="m-0 mb-2 text-left text-[13px] text-(--text-ink-muted)" aria-live="polite">
      <template v-if="selectedTags.size > 0">{{ projects.length }} / {{ totalCount }} 個專案符合篩選，</template>
      <template v-else>{{ totalCount }} 個專案，</template>由新到舊排列
    </p>
    <div v-if="projects.length === 0" class="py-16 text-center text-sm text-(--text-ink-muted)">
      {{ totalCount === 0 ? PROJECTS_EMPTY_TEXT : PROJECTS_NO_MATCH_TEXT }}
    </div>

    <div v-else class="grid grid-cols-1 overflow-hidden rounded-xl border border-(--border-shelf) bg-(--bg-paper-light)">
      <!-- 高度刻意切在第四筆的一半（262px，每筆約 75px），露出半筆讓人看得出盒子可以往下捲；
           剛好整數筆時讀者以為清單只有四筆（2026-10-01 模擬讀者審查） -->
      <div ref="listBox" class="max-h-[262px] overflow-y-auto border-b border-(--border-shelf)">
        <button
          v-for="proj in projects"
          :key="proj.id"
          type="button"
          :aria-current="selected?.id === proj.id ? 'true' : undefined"
          class="w-full cursor-pointer border-b border-l-[3px] border-(--border-shelf) px-4.5 py-4 text-left transition-colors last:border-b-0"
          :class="
            selected?.id === proj.id
              ? 'border-l-(--text-accent) bg-(--bg-active-row)'
              : 'border-l-transparent hover:bg-(--bg-folder)/60'
          "
          @click="pick(proj.id)"
        >
          <!-- 只標已封存的；進行中是預設狀態，不標（跟桌機版的 STATUS 欄一致） -->
          <div v-if="proj.statusType === 'archived'" class="mb-1.5 font-mono text-[11px]">
            <span class="font-mono text-[11px] font-bold tracking-[0.05em] uppercase text-(--text-ink-muted)">
              {{ proj.status }}
            </span>
          </div>
          <div class="text-sm leading-snug font-bold text-(--text-ink-main)">
            {{ proj.title }}
          </div>
        </button>
      </div>

      <div v-if="selected" ref="detailBox" class="scroll-mt-20 p-6 sm:p-8">
        <div v-if="selected.statusType === 'archived'" class="mb-5 flex justify-end">
          <BaseTag tone="muted">
            {{ selected.status }}
          </BaseTag>
        </div>

        <h2 class="mb-3.5 text-xl font-extrabold text-(--text-ink-main) sm:text-2xl">
          {{ selected.title }}
        </h2>

        <p v-if="selected.desc" class="mb-6 max-w-2xl text-left text-sm leading-relaxed text-(--text-ink-body) sm:text-justify sm:text-[15px]">
          {{ selected.desc }}
        </p>

        <div class="mb-6 flex flex-wrap gap-2 font-mono text-[11px]">
          <BaseTag
            v-for="tag in selectedTechniqueTags"
            :key="tag.label"
            :class="tag.matched && 'font-semibold outline outline-1 outline-(--text-accent)'"
            >{{ tag.label }}</BaseTag
          >
        </div>

        <div class="grid grid-cols-2 gap-4 border-t border-(--border-shelf) pt-5">
          <div>
            <div class="mb-1 font-mono text-[11px] tracking-[0.15em] text-(--text-ink-muted) uppercase">Started</div>
            <div class="text-[13px] text-(--text-ink-main)">{{ selected.started }}</div>
          </div>
          <div>
            <div class="mb-1 font-mono text-[11px] tracking-[0.15em] text-(--text-ink-muted) uppercase">Repo</div>
            <a
              :href="`https://github.com/jerryyehself/${selected.repo}`"
              target="_blank"
              rel="noopener noreferrer"
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
