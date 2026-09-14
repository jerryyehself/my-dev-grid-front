<script setup lang="ts">
import { computed } from 'vue'
import type { GraphNodeType, GraphPathDto } from '@/api/graph'

const props = defineProps<{ path: GraphPathDto | null }>()

function nodeColorVar(type: GraphNodeType): string {
  return type === 'documentation' ? '--node-doc' : type === 'technique' ? '--node-tech' : '--node-impl'
}

// 捷運路線圖式佈局：站點等距排在一條橫線上，站名依索引奇偶交錯畫在線的上/下方避免
// 疊字（跟首頁/這頁其餘地方常見的「密集標籤交錯避讓」手法一致）。寬度依站點數量算，
// 站點少的路徑也維持看得順眼的最小寬度，不會擠成一團。
const SEGMENT_WIDTH = 220
const SIDE_PADDING = 60
const layout = computed(() => {
  const nodes = props.path?.nodes ?? []
  const n = nodes.length
  const width = Math.max(700, SIDE_PADDING * 2 + (n - 1) * SEGMENT_WIDTH)
  const stations = nodes.map((node, i) => ({
    node,
    x: n > 1 ? SIDE_PADDING + (i * (width - SIDE_PADDING * 2)) / (n - 1) : width / 2,
    labelBelow: i % 2 === 0,
  }))
  return { width, height: 90, stations }
})
</script>

<template>
  <div v-if="path && !path.found" class="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-(--border-shelf) px-6 py-9 text-center">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" stroke-width="1.6" stroke-linecap="round" class="opacity-70">
      <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M8.5 8.5 L11 11 M13 13 L15.5 15.5" stroke-dasharray="2 3" />
    </svg>
    <p class="text-[13px] font-semibold text-(--text-ink-main)">這兩個節點之間沒有路徑</p>
    <p class="font-mono text-[11px] text-(--text-ink-body) opacity-75">圖上目前沒有任何一條邊能把它們連起來</p>
  </div>

  <div v-else-if="path && path.found" class="overflow-x-auto rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) px-6 py-5">
    <svg :width="layout.width" :height="layout.height" :viewBox="`0 0 ${layout.width} ${layout.height}`">
      <line
        v-if="layout.stations.length > 1"
        :x1="layout.stations[0]!.x"
        y1="45"
        :x2="layout.stations[layout.stations.length - 1]!.x"
        y2="45"
        stroke="var(--text-accent)"
        stroke-width="3"
      />

      <template v-for="(station, i) in layout.stations" :key="station.node.id">
        <circle :cx="station.x" cy="45" r="9" :fill="`var(${nodeColorVar(station.node.type)})`" stroke="var(--bg-paper-light)" stroke-width="3" />
        <text
          :x="station.x"
          :y="station.labelBelow ? 70 : 26"
          text-anchor="middle"
          font-size="12"
          font-weight="600"
          fill="var(--text-ink-main)"
          font-family="ui-sans-serif, system-ui, sans-serif"
        >
          {{ station.node.label }}
        </text>

        <!-- 段落標籤：畫在這一站到下一站的中點，關係名稱+方向箭頭；沒有定義反向關係的
             逆向 hop（防呆分支，目前種子資料不會真的觸發）額外標一個小圖示，不用虛線
             （虛線在這頁已經代表「同型別關聯」，同一頁兩套虛線語意會衝突，見設計稿
             review 時的結論）。 -->
        <template v-if="path.edges[i]">
          <text
            :x="(station.x + layout.stations[i + 1]!.x) / 2"
            y="34"
            text-anchor="middle"
            font-size="10"
            letter-spacing="0.05em"
            fill="var(--text-ink-body)"
            font-family="ui-monospace, monospace"
          >
            {{ (path.edges[i]!.predicate ?? '(未命名關聯)').toUpperCase() }} ▸
          </text>
          <text
            v-if="!path.edges[i]!.hasDefinedReverse"
            :x="(station.x + layout.stations[i + 1]!.x) / 2"
            y="60"
            text-anchor="middle"
            font-size="9"
            fill="var(--text-accent)"
            font-family="ui-monospace, monospace"
          >
            ⟲ 逆向借用
          </text>
        </template>
      </template>
    </svg>
  </div>
</template>
