<script setup lang="ts">
import { computed } from 'vue'
import { nodeColorVar } from '@/api/ontology'
import type { GraphPathDto } from '@/api/graph'
import { edgeRelation } from './graphRelationPhrase'

const props = defineProps<{ path: GraphPathDto | null }>()

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

// 段落標籤：跟詳情卡、首頁彈窗同一套中文動詞（edgeRelation）。箭頭一律指向路線走的方向（▸），
// 跟畫布上邊的箭頭方向一致。動詞的主詞由兩端類別決定，不一定是這段路線上的前一站：
// 主詞在後一站時改用被動說法，讓「前一站 ＋ 標籤 ＋ 後一站」讀起來仍是對的。
// 相關沒有主被動之分；版本的主詞永遠是版本那一端，從主技術走向版本時說「有版本」。
const PASSIVE_VERB: Record<string, string> = {
  使用: '被使用',
  說明: '被說明',
  記錄: '被記錄',
  討論: '被討論',
  需要: '被需要',
  版本: '有版本',
}
function segmentLabel(i: number): string {
  const edge = props.path?.edges[i]
  const nodes = props.path?.nodes ?? []
  const source = nodes.find((n) => n.id === edge?.source)
  const target = nodes.find((n) => n.id === edge?.target)
  if (!edge || !source || !target) return '相關 ▸'
  const from = { domainType: source.type, label: source.label }
  const to = { domainType: target.type, label: target.label }
  const r = edgeRelation(from, to, edge.predicate)
  const subjectId = r.subject === from ? source.id : target.id
  if (subjectId === nodes[i]?.id) return `${r.verb} ▸`
  return `${PASSIVE_VERB[r.verb] ?? r.verb} ▸`
}
</script>

<template>
  <div v-if="path && !path.found" class="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-(--border-shelf) px-6 py-9 text-center">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" stroke-width="1.6" stroke-linecap="round" class="opacity-70">
      <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M8.5 8.5 L11 11 M13 13 L15.5 15.5" stroke-dasharray="2 3" />
    </svg>
    <p class="text-[13px] font-semibold text-(--text-ink-main)">這兩項之間沒有路徑</p>
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
             （虛線全站只代表首頁的「間接關聯」——推算出來、資料庫裡沒有的關係，這裡的邊都是直接關係，
             不能借用。2026-09-30 之前這頁的虛線代表「同型別關聯」，後來統一成實線）。 -->
        <template v-if="path.edges[i]">
          <text
            :x="(station.x + layout.stations[i + 1]!.x) / 2"
            y="34"
            text-anchor="middle"
            font-size="11"
            letter-spacing="0.05em"
            fill="var(--text-ink-body)"
            font-family="ui-monospace, monospace"
          >
            {{ segmentLabel(i) }}
          </text>
          <text
            v-if="!path.edges[i]!.hasDefinedReverse"
            :x="(station.x + layout.stations[i + 1]!.x) / 2"
            y="60"
            text-anchor="middle"
            font-size="13"
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
