<script setup lang="ts">
import GraphLegendDots from './GraphLegendDots.vue'
import { VIRIDIS_STOPS } from './colorScale'

// 圖譜畫布上方的一列圖例（D-87）：顏色對類別（或時間色階）、實線對直接關係，間接關聯打開時
// 多一段虛線。原本首頁在這一列之外還有三列控制項，收進「顯示設定」之後只剩這一列。
defineProps<{
  colorMode: 'type' | 'overlay'
  showIndirect: boolean
  /** 首頁：各類數量與直接關係條數；沒給（/graph）就不印數字 */
  counts?: { documentation: number; technique: number; implementation: number; edges: number } | null
  /** 首頁：有路線亮起時多一項「目前路線」 */
  routeLit?: boolean
  /** 圖上有「關於」連線才列「關於」這一項 */
  hasAbout?: boolean
}>()
const gradient = `linear-gradient(to right, ${VIRIDIS_STOPS.join(', ')})`
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-(length:--type-label-size) text-(--text-ink-muted)">
    <template v-if="colorMode === 'type'">
      <GraphLegendDots :counts="counts" />
    </template>
    <template v-else>
      <span class="flex items-center gap-2">
        較舊
        <span class="w-[96px] h-2 rounded" :style="{ background: gradient }"></span>
        較新
      </span>
      <span class="flex items-center gap-1.5"
        ><span class="w-2 h-2 rounded-full bg-(--overlay-nodata)"></span
        >尚無建立時間資料（技術／文件）</span
      >
    </template>
    <span class="flex items-center gap-1.5"
      ><span class="w-4 h-0 border-t border-(--edge-real)"></span>直接關係<b v-if="counts" class="font-semibold text-(--text-ink-main) tabular-nums">{{
        counts.edges
      }}</b></span
    >
    <span v-if="hasAbout" class="flex items-center gap-1.5"
      ><span class="relative w-4 h-0 border-t border-(--edge-real)"
        ><span
          class="absolute left-1/2 top-0 w-[7px] h-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-(--edge-real) bg-(--canvas-bg)"
        ></span></span
      >關於</span
    >
    <span v-if="routeLit" class="flex items-center gap-1.5"
      ><span class="w-4 h-0 border-t-[3px] border-(--text-accent)"></span>目前路線</span
    >
    <span v-if="showIndirect" class="flex items-center gap-1.5"
      ><span class="w-5 h-0 border-t-2 border-dashed border-(--accent-secondary)"></span
      >間接關聯</span
    >
  </div>
</template>
