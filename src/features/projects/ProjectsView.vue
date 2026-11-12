<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import { STICKY_TOP_PX } from '@/layouts/stickyOffset'
import { fetchProjects, type Project } from '@/api/projects'
import ProjectsDetail from './ProjectsDetail.vue'
import ProjectsListPanel from './ProjectsListPanel.vue'
import ProjectsMobileLayout from './ProjectsMobileLayout.vue'
import { useIsDesktop } from './useIsDesktop'
import { useProjectsFilter } from './useProjectsFilter'

const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const load = async () => {
  loading.value = true
  error.value = null
  try {
    projects.value = await fetchProjects()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入專案清單失敗'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const { selectedTags, filterGroups, toggleTag, clearFilter, filteredProjects } =
  useProjectsFilter(projects)

// 兩種方式連到這裡都是帶後端的專案 id：首頁近況板點某個專案帶 ?project=<id>，圖譜節點的
// 「看這個專案」帶 ?implementation=<id>（見 graphNodeLink.ts）。一進來就選那一筆；
// 以前一律連到 /projects，點 isbn-scanner 卻看到清單第一筆的 idea-trigger。
// 以前網址上是 PROJ-YYYY-NN 顯示編號，編號拿掉後那種舊連結對不到專案，退回選第一筆。
const route = useRoute()
const queryId = (key: string) => (typeof route.query[key] === 'string' ? (route.query[key] as string) : '')
const linkedId = queryId('project') || queryId('implementation')
const selectedId = ref(linkedId)
// 選中的專案一定在目前（篩選後）的清單裡，不留一個清單裡找不到的詳情
const selected = computed(() => filteredProjects.value.find((p) => p.id === selectedId.value))

const isDesktop = useIsDesktop()
// 桌機版詳情頂端要停的位置：跟左欄面板 sticky 的 top 一樣（見 ProjectsListPanel）
const DETAIL_SCROLL_TOP = STICKY_TOP_PX
const detail = ref<InstanceType<typeof ProjectsDetail>>()
const pick = async (id: string) => {
  selectedId.value = id
  // 頁面捲下去之後，詳情的頂端可能在導覽列後面，點了清單卻看不到換了什麼。
  // 只有使用者在清單裡選的時候才捲（深層連結載入不走這裡）；原本就看得到頂端就不動。
  // 瞬間捲過去，不做捲動動畫（任務型頁面不加動態）。手機版沒有這個 ref（詳情在 ProjectsMobileLayout
  // 裡，自己捲），所以只有桌機版會往下走
  await nextTick()
  const el = detail.value?.$el as HTMLElement | undefined
  if (!el) return
  const top = el.getBoundingClientRect().top
  if (top < DETAIL_SCROLL_TOP) window.scrollTo({ top: window.scrollY + top - DETAIL_SCROLL_TOP, behavior: 'instant' })
}

// 篩選把目前選中的專案擠出清單時，自動切到篩選後清單的第一筆，不留一個選不到的空白詳情面板；
// 資料還沒載入完成（filteredProjects 是空陣列）時先不設定，等 API 回來再選
watch(
  filteredProjects,
  (list) => {
    if (list.some((p) => p.id === selectedId.value)) return
    const fallback = list[0]
    if (fallback) selectedId.value = fallback.id
  },
  { immediate: true },
)

// 從首頁近況板或圖譜連過來時，選中的那筆可能在清單盒子的捲動範圍外，讀者看不出哪一筆被選了
// （2026-09-30 模擬讀者審查）。資料載入、選定之後捲一次就好，之後使用者自己在清單裡點的不動
let pendingReveal = Boolean(linkedId)
const layout = ref<{ revealSelected: () => void }>()
watch([selectedId, filteredProjects], async () => {
  if (!pendingReveal || !selectedId.value || !filteredProjects.value.length) return
  pendingReveal = false
  await nextTick()
  layout.value?.revealSelected()
})
</script>

<template>
  <div class="w-full">
    <div v-if="loading" class="py-16 text-center text-[11px] font-mono text-(--text-ink-body)/40 tracking-widest">
      專案載入中…
    </div>

    <div v-else-if="error" class="py-16 flex flex-col items-center gap-4 text-center">
      <p class="text-[11px] font-mono text-(--text-accent) tracking-widest">載入失敗</p>
      <p class="text-sm text-(--text-ink-body)">{{ error }}</p>
      <BaseButton variant="primary" @click="load">重試</BaseButton>
    </div>

    <!-- 桌機：左欄 320（有框的列表面板）＋間距 64＋右欄詳情（寬度吃剩下的，內容欄 1072 時是 688）。
         頁面標題（kicker＋英文 H1）是全站共用的，不在這裡。mt-2：通用表頭下方原本只留 32px，
         設計稿是 40px -->
    <div
      v-else-if="isDesktop"
      class="mt-2 grid grid-cols-[320px_minmax(0,1fr)] items-start gap-x-16"
    >
      <!-- 外層撐滿整列高度，裡面的面板才有地方 sticky -->
      <div class="self-stretch">
        <ProjectsListPanel
          ref="layout"
          :projects="filteredProjects"
          :total-count="projects.length"
          :selected-id="selectedId"
          :filter-groups="filterGroups"
          :has-selection="selectedTags.size > 0"
          @select="pick"
          @toggle-tag="toggleTag"
          @clear-filter="clearFilter"
        />
      </div>
      <ProjectsDetail v-if="selected" ref="detail" :project="selected" />
    </div>

    <!-- 手機：維持原本的版面，之後另外重做 -->
    <ProjectsMobileLayout
      v-else
      ref="layout"
      :projects="filteredProjects"
      :total-count="projects.length"
      :selected="selected"
      :filter-groups="filterGroups"
      :selected-tags="selectedTags"
      @select="pick"
      @toggle-tag="toggleTag"
      @clear-filter="clearFilter"
    />
  </div>
</template>
