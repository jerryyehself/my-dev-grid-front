<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import BaseSegmented from '@/components/BaseSegmented.vue'
import LoadFailedNotice from '@/components/LoadFailedNotice.vue'
import GraphLegendDots from '@/components/GraphLegendDots.vue'
import { useRoute, RouterLink } from 'vue-router'
import KnowledgeGraphCanvas from '@/components/graph/KnowledgeGraphCanvas.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import GraphPoc3D from '@/components/poc/GraphPoc3D.vue'
import GraphPathSearch from '@/components/poc/GraphPathSearch.vue'
import GraphPathDiagram from '@/components/poc/GraphPathDiagram.vue'
import type { GraphPocSelection } from '@/data/graphPocData'
import { fetchGraphOrDemo, type GraphDto, type GraphNodeType, type GraphPathDto } from '@/api/graph'
import { graphNodeLink } from '@/components/graphNodeLink'

const route = useRoute()
const mode = ref<'2d' | '3d'>(route.query.mode === '3d' ? '3d' : '2d')
const MODES = [
  { value: '2d', label: '2D' },
  { value: '3d', label: '3D' },
] as const

// 2026-09-24：跟 Home 頁「知識網路」小工具（KnowledgeGraphPanel.vue）用同一套
// 「載入失敗」訊息慣例——這頁原本連不上後端就直接顯示錯誤，沒有跟著補上 demo
// fallback，見 graphPocData.ts 的說明。2D/3D 只會掛一個（依 mode），各自回報
// 自己那次 fetch 的結果即可，不用互相同步。
const loadError = ref<string | null>(null)

// 2D 是跟首頁共用的 KnowledgeGraphCanvas（D-87），資料由頁面取（跟首頁一樣走
// fetchGraphOrDemo，失敗時退回示範資料並顯示 loadError）。3D 照舊自己取。
// /graph 2D 用自由排版（D-87 比較過）：拿真實 60 節點資料比，三層疊圖把文件框在左上的圓裡，
// 「PHP 官方文件」「TypeScript 官方文件」離它們說明的技術隔了大半張圖、拉出橫跨整張圖的長線；
// 自由排版裡每份官方文件就貼在它的技術旁邊，thesis 這類自成一群的專案也看得出來。這頁是拿來
// 追關係、查路徑的，排版要先讓「誰連到誰」好讀。首頁維持三層疊圖。
const GRAPH_LAYOUT = 'free' as const
const graphData = shallowRef<GraphDto | null>(null)
const graphDataError = ref<string | null>(null)
onMounted(async () => {
  const { dto, loadError: error } = await fetchGraphOrDemo()
  graphDataError.value = error
  graphData.value = dto
})
watch([mode, graphDataError], () => {
  if (mode.value === '2d') loadError.value = graphDataError.value
})

// 點節點/點連線的詳情——2D/3D 各自把力模擬內部物件解析成同一種形狀再往上 emit
// （見 graphPocData.ts 的 GraphPocSelection 說明），這裡只管顯示，不用管是哪個
// 元件、哪個渲染引擎點出來的。
const selected = ref<GraphPocSelection | null>(null)
// 點到的節點連去哪（文章頁、外部網址、專案頁；技術沒有頁面）。規則跟首頁知識網路的彈窗共用
const selectedLink = computed(() =>
  selected.value?.kind === 'node' ? graphNodeLink(selected.value) : null,
)

// 詳情卡在圖譜跟圖例下面，畫布一個螢幕高，點下去之後卡片常常在畫面外，讀者以為點了沒反應
// （2026-09-30 模擬讀者審查實測）。選中就把卡片捲進畫面；已經看得到就不動（block: 'nearest'），
// 使用者設了減少動態效果就直接跳過去，不做平滑捲動。
const detailCard = ref<HTMLElement>()
watch(selected, async (sel) => {
  if (!sel) return
  await nextTick()
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  detailCard.value?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
})
const domainLabel: Record<GraphNodeType, string> = {
  documentation: '文件',
  technique: '技術',
  implementation: '實作',
}

// 路徑查詢結果：null 代表「還沒查/起訖點沒選好」，畫面上不顯示任何路徑相關的東西
// （既不高亮、也不顯示路徑清單或找不到路徑的訊息）。found=false 才是「查過了，
// 但真的沒有路徑」，兩者要分清楚，不能都用 null 表示。
const pathResult = ref<GraphPathDto | null>(null)
</script>

<template>
  <div class="space-y-4">
    <!-- 全站統一的「幾選一」切換（D-66）；原本選中是藏青實心，深色主題會融進藏青底 -->
    <BaseSegmented v-model="mode" :options="MODES" label="圖譜檢視方式" />

    <GraphPathSearch @result="pathResult = $event" />

    <!-- 2D：跟首頁同一個畫布元件（D-87），差別只在 props：高度、詳情改用下面的卡片、路徑高亮。
         排版：首頁的三層疊圖或自由排版，見 layout 的說明與 D-87 報告的比較截圖 -->
    <template v-if="mode === '2d'">
      <BaseLoadingBlock v-if="!graphData" height="520px">圖譜載入中…</BaseLoadingBlock>
      <KnowledgeGraphCanvas
        v-else
        :data="graphData"
        :layout="GRAPH_LAYOUT"
        :height="520"
        details="emit"
        label="知識圖譜"
        :highlight-path="pathResult"
        @select="selected = $event"
      />
    </template>
    <GraphPoc3D v-else @select="selected = $event" @load-error="loadError = $event" />

    <LoadFailedNotice v-if="loadError" :message="loadError" />

    <!-- 捷運路線圖式的路徑清單／找不到路徑的誠實空狀態——GraphPathSearch 起訖點都選
         好才會真的查詢，pathResult 是 null 代表還沒查，這裡不用顯示任何東西。 -->
    <GraphPathDiagram v-if="pathResult" :path="pathResult" />

    <!-- 3D 的圖例與操作說明。2D 的圖例、操作說明在共用畫布元件裡（D-87），這裡不重複 -->
    <div
      v-if="mode === '3d'"
      class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-(--text-ink-muted)"
    >
      <GraphLegendDots />
      <span class="flex items-center gap-1.5"
        ><span class="w-4 h-0 border-t border-(--edge-real)"></span>直接關係</span
      >
      <span class="ml-auto"
        >點節點看內容・點連線看是什麼關係・左鍵拖曳旋轉・滾輪縮放・右鍵平移</span
      >
    </div>

    <!-- 點節點/點連線的詳情面板——GraphPocSelection 是共同格式（見 graphPocData.ts），
         2D/3D 兩版共用同一個面板,不用各自另外刻一份。 -->
    <div
      v-if="selected"
      ref="detailCard"
      class="relative scroll-mb-4 text-[14px] leading-relaxed border border-(--border-shelf) rounded-xl px-4 py-3 bg-(--bg-paper-light)"
    >
      <button
        type="button"
        class="absolute top-1 right-1 w-9 h-9 flex items-center justify-center rounded-lg text-(--text-ink-muted) hover:text-(--text-ink-body) cursor-pointer"
        aria-label="關閉"
        @click="selected = null"
      >
        ×
      </button>
      <template v-if="selected.kind === 'node'">
        <p class="text-[13px] tracking-[0.05em] text-(--text-accent)">
          {{ domainLabel[selected.domainType] }}
        </p>
        <p class="text-(--text-ink-body) font-medium">{{ selected.label }}</p>
        <p class="text-(--text-ink-muted)">共 {{ selected.degree }} 條直接關係</p>
        <RouterLink
          v-if="selectedLink?.kind === 'internal'"
          :to="selectedLink.to"
          class="inline-flex items-center min-h-11 -mb-2 pr-3 text-(--text-accent) hover:underline"
          >{{ selectedLink.text }}</RouterLink
        >
        <a
          v-else-if="selectedLink?.kind === 'external'"
          :href="selectedLink.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center min-h-11 -mb-2 pr-3 text-(--text-accent) hover:underline"
          >{{ selectedLink.text }}</a
        >
      </template>
      <template v-else-if="selected.indirectVia">
        <p class="text-[13px] tracking-[0.05em] text-(--text-accent)">間接關聯</p>
        <p class="text-(--text-ink-body) font-medium">
          {{ selected.sourceLabel }} ↔ {{ selected.targetLabel }}
        </p>
        <p class="text-(--text-ink-muted)">
          兩邊都連到「{{ selected.indirectVia.join('、') }}」，這是推算出來的，不是直接關係
        </p>
      </template>
      <template v-else>
        <p class="text-[13px] tracking-[0.05em] text-(--text-accent)">直接關係</p>
        <p class="text-(--text-ink-body) font-medium">
          {{ selected.sourceLabel }} → {{ selected.targetLabel }}
        </p>
        <p class="text-(--text-ink-muted)">
          {{ selected.predicate ?? selected.label ?? '（未命名的關係）' }}
        </p>
      </template>
    </div>

    <!-- 原本這裡有一段給訪客的說明（2026-09-30 起），D-87 第二輪使用者決定拿掉、不放替代文字：
         圖例、操作說明面板、路徑查詢區塊的說明已經講完這頁怎麼用。 -->
  </div>
</template>
