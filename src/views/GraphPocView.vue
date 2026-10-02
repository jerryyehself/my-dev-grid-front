<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import BaseSegmented from '@/components/BaseSegmented.vue'
import LoadFailedNotice from '@/components/LoadFailedNotice.vue'
import GraphLegendDots from '@/components/GraphLegendDots.vue'
import { useRoute, RouterLink } from 'vue-router'
import GraphPoc2D from '@/components/poc/GraphPoc2D.vue'
import GraphPoc3D from '@/components/poc/GraphPoc3D.vue'
import GraphPathSearch from '@/components/poc/GraphPathSearch.vue'
import GraphPathDiagram from '@/components/poc/GraphPathDiagram.vue'
import type { GraphPocSelection } from '@/data/graphPocData'
import type { GraphNodeType, GraphPathDto } from '@/api/graph'
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

// 點節點/點連線的詳情——2D/3D 各自把力模擬內部物件解析成同一種形狀再往上 emit
// （見 graphPocData.ts 的 GraphPocSelection 說明），這裡只管顯示，不用管是哪個
// 元件、哪個渲染引擎點出來的。
const selected = ref<GraphPocSelection | null>(null)
// 點到的節點連去哪（文章頁、外部網址、專案頁；技術沒有頁面）。規則跟首頁知識網路的彈窗共用
const selectedLink = computed(() => (selected.value?.kind === 'node' ? graphNodeLink(selected.value) : null))

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

    <GraphPoc2D v-if="mode === '2d'" :highlight-path="pathResult" @select="selected = $event" @load-error="loadError = $event" />
    <GraphPoc3D v-else @select="selected = $event" @load-error="loadError = $event" />

    <LoadFailedNotice v-if="loadError" :message="loadError" />

    <!-- 捷運路線圖式的路徑清單／找不到路徑的誠實空狀態——GraphPathSearch 起訖點都選
         好才會真的查詢，pathResult 是 null 代表還沒查，這裡不用顯示任何東西。 -->
    <GraphPathDiagram v-if="pathResult" :path="pathResult" />

    <!-- 圖例：色點對顏色，邊樣式對線條，最後一句是操作說明——取代原本一句純文字
         描述配色的散文，讓「這個顏色/這條線代表什麼」有真的視覺對照可查，不用
         自己記文字說明。3D 版另外在畫布裡疊了三片色板 + 浮動文字標籤標示三層，
         這裡的色點圖例同一套顏色，兩邊對得起來。 -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-(--text-ink-muted)">
      <GraphLegendDots />
      <span class="flex items-center gap-1.5"
        ><span class="w-4 h-0 border-t border-(--edge-real)"></span>直接關係</span
      >
      <!-- 「滑到節點上」在觸控裝置沒有意義，只在能 hover 的裝置顯示 -->
      <span v-if="mode === '2d'" class="ml-auto"
        ><span class="hidden [@media(hover:hover)]:inline">滑到節點上看相連的節點・</span
        >點節點看內容・點連線看是什麼關係・拖曳節點調整位置</span
      >
      <span v-else class="ml-auto">點節點看內容・點連線看是什麼關係・左鍵拖曳旋轉・滾輪縮放・右鍵平移</span>
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
        <p class="text-[13px] tracking-[0.05em] text-(--text-accent)">{{ domainLabel[selected.domainType] }}</p>
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
      <template v-else>
        <p class="text-[13px] tracking-[0.05em] text-(--text-accent)">直接關係</p>
        <p class="text-(--text-ink-body) font-medium">{{ selected.sourceLabel }} → {{ selected.targetLabel }}</p>
        <p class="text-(--text-ink-muted)">{{ selected.predicate ?? selected.label ?? '（未命名的關係）' }}</p>
      </template>
    </div>

    <!-- 給訪客的說明。原本這裡是開發筆記（技術驗證階段的欄位落差、3D 分層怎麼修的），2026-09-30
         使用者決定改成對應的說明 -->
    <p class="text-[14px] leading-relaxed text-(--text-ink-muted)">
      這是完整版的互動圖譜：2D 可以拖曳節點，上方可以查兩個節點之間的路徑；3D 把文件、技術、實作分成上下三層。節點大小代表關係數。首頁的<RouterLink to="/" class="text-(--text-accent) hover:underline">知識網路</RouterLink>是精簡版：可以點節點、切換顏色，但不能拖曳縮放，也沒有路徑查詢；另外只有首頁可以打開「間接關聯」，用虛線標出連到相同節點的同類節點，這裡只畫直接關係。
    </p>
  </div>
</template>
