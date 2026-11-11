<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { YearGroup } from './groupProjectsByYear'
import { stuckYearHeaders } from './stuckYearHeaders'
import { useScrollFade } from './useScrollFade'

// 桌機版左欄的專案列表：依開始年份分組，每組一個年份標頭（捲動時卡在上緣），一列一個專案。
// 設計稿：列高 48（上下 12＋行高 24）、沒有列分隔線；選中列是平面底色＋標題加粗。
// 狀態圓點：進行中＝實心強調色，封存＝空心灰圈（active／archived 只是「現在 vs 過去」，
// 不另開狀態色，見 visual-design-language 的 BaseTag 範例）。
const props = defineProps<{
  groups: YearGroup[]
  selectedId: string
}>()
const emit = defineEmits<{ select: [id: string] }>()

// 沒有開始日期的專案歸在最後一組，標頭要有字可顯示
const UNKNOWN_YEAR_LABEL = '日期不詳'

const scroller = ref<HTMLElement>()
const stuck = ref<Set<string>>(new Set())

// 只淡出底部：頂端有年份標頭在提示「上面還有」，頂端再淡出會把標頭一起淡掉
const { atBottom, update: updateFade } = useScrollFade(scroller, [() => props.groups])

function updateStuck() {
  const root = scroller.value
  if (!root) return
  const sections = [...root.querySelectorAll<HTMLElement>('[data-year-group]')]
  const header = root.querySelector<HTMLElement>('[data-year-header]')
  if (!sections.length || !header) {
    stuck.value = new Set()
    return
  }
  stuck.value = stuckYearHeaders(
    root.getBoundingClientRect().top,
    header.offsetHeight,
    sections.map((section) => ({
      year: section.dataset.year ?? '',
      sentinelTop: section.querySelector('[data-sentinel]')!.getBoundingClientRect().top,
      bottom: section.getBoundingClientRect().bottom,
    })),
  )
}

function onScroll() {
  updateStuck()
}
onMounted(updateStuck)
watch(
  () => props.groups,
  () => nextTick(updateStuck),
)

const statusDot = (statusType: 'active' | 'archived' | undefined) =>
  statusType === 'active'
    ? 'bg-(--text-accent)'
    : statusType === 'archived'
      ? 'border-[1.5px] border-(--text-ink-muted)'
      : 'invisible'

/** 把選中的那一列捲進列表可見範圍（從首頁或圖譜連過來時，選中的可能在捲動範圍外） */
function revealSelected() {
  scroller.value?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
  updateFade()
  updateStuck()
}
defineExpose({ revealSelected })
</script>

<template>
  <div
    ref="scroller"
    class="projects-year-list min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
    :class="{ 'is-fade-bottom': !atBottom }"
    @scroll.passive="onScroll"
  >
    <section v-for="group in groups" :key="group.year" data-year-group :data-year="group.year">
      <!-- 0 高哨兵：捲出列表上緣就代表這組的標頭卡住了，見 stuckYearHeaders -->
      <i class="block h-0" data-sentinel aria-hidden="true"></i>
      <!-- h3：頁面標題是 h1、右邊詳情的專案名是 h2，年份標頭是列表這個區塊裡的小標 -->
      <h3
        data-year-header
        class="sticky top-0 z-[1] m-0 border-b bg-(--list-surface) px-4 pt-3 pb-[3px] text-[13px] leading-5 font-normal tracking-[0.06em] text-(--text-ink-muted)"
        :class="stuck.has(group.year) ? 'border-(--border-shelf)' : 'border-transparent'"
      >
        {{ group.year || UNKNOWN_YEAR_LABEL }}
      </h3>
      <ul class="m-0 list-none p-0">
        <li v-for="project in group.projects" :key="project.id">
          <button
            type="button"
            :aria-current="selectedId === project.id ? 'true' : undefined"
            class="flex w-full scroll-mt-9 cursor-pointer items-start px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--text-accent)"
            :class="
              selectedId === project.id
                ? 'bg-(--bg-list-selected)'
                : 'hover:bg-[color-mix(in_srgb,var(--text-ink-main)_5%,transparent)]'
            "
            @click="emit('select', project.id)"
          >
            <span
              aria-hidden="true"
              class="mt-2 mr-2 size-2 shrink-0 rounded-full"
              :class="statusDot(project.statusType)"
            ></span>
            <span
              class="min-w-0 text-base leading-6 [overflow-wrap:anywhere]"
              :class="selectedId === project.id ? 'font-semibold text-(--text-ink-main)' : 'text-(--text-ink-body)'"
            >
              {{ project.title }}
            </span>
            <!-- 圓點只靠形狀區分，螢幕報讀器唸不到，補一段看不見的文字 -->
            <span v-if="project.status" class="sr-only">，{{ project.status }}</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.projects-year-list {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--text-ink-muted) 45%, transparent) transparent;
}
/* 底部淡出：下面還有內容的提示。用 mask 不用疊一層漸層，淡出跟面板底色無關，兩個主題都不用調 */
.projects-year-list.is-fade-bottom {
  -webkit-mask-image: linear-gradient(#000 calc(100% - 32px), transparent);
  mask-image: linear-gradient(#000 calc(100% - 32px), transparent);
}
</style>
