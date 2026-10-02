<script setup lang="ts">
import GraphLegendDots from '@/components/GraphLegendDots.vue'
import { VIRIDIS_STOPS } from './colorScale'

// 圖譜畫布上方的一列圖例（D-87）：顏色對類別（或時間色階）、實線對直接關係，間接關聯打開時
// 多一段虛線。原本首頁在這一列之外還有三列控制項，收進「顯示設定」之後只剩這一列。
defineProps<{ colorMode: 'type' | 'overlay'; showIndirect: boolean }>()
const gradient = `linear-gradient(to right, ${VIRIDIS_STOPS.join(', ')})`
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-(--text-ink-muted)">
    <template v-if="colorMode === 'type'">
      <GraphLegendDots />
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
      ><span class="w-4 h-0 border-t border-(--edge-real)"></span>直接關係</span
    >
    <span v-if="showIndirect" class="flex items-center gap-1.5"
      ><span class="w-5 h-0 border-t-2 border-dashed border-(--accent-secondary)"></span
      >間接關聯</span
    >
  </div>
</template>
