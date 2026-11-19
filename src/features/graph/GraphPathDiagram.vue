<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { nodeColorVar } from '@/api/ontology'
import type { GraphPathDto } from '@/api/graph'
import { routeSegmentVerb } from './graphRelationPhrase'
import { scrollEdges, type ScrollEdges } from './scrollEdges'

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

// 段落標籤：跟詳情卡、首頁彈窗同一套中文動詞，主被動規則見 graphRelationPhrase.ts 的
// routeSegmentVerb。箭頭一律指向路線走的方向（▸），跟畫布上邊的箭頭方向一致。
function segmentLabel(i: number): string {
  const edge = props.path?.edges[i]
  const nodes = props.path?.nodes ?? []
  const from = nodes[i]
  const to = nodes[i + 1]
  if (!edge || !from || !to) return '相關 ▸'
  const verb = routeSegmentVerb(
    { id: from.id, domainType: from.type, label: from.label },
    { id: to.id, domainType: to.type, label: to.label },
    edge,
  )
  return `${verb} ▸`
}

// 捲動提示：手機寬度下路線圖比容器寬，右側的站名與連線動詞落在畫面外，讀者看不出
// 可以往右捲。還有內容的那一側用 mask 把內容淡出，捲到底那側就不淡。用 mask 而不是
// 疊一層底色漸層：mask 只改透明度、不帶顏色，亮暗兩個主題不用各配一組色；不加
// 「往右滑」之類的文字，邊緣被切淡的動詞本身就是提示。漸層出現、消失不做動畫
// （/graph 是任務型頁面，動態越少越好），所以也沒有 prefers-reduced-motion 要另外關的東西。
const scroller = ref<HTMLElement | null>(null)
const edges = ref<ScrollEdges>({ overflowing: false, start: false, end: false })

function updateEdges() {
  const el = scroller.value
  if (!el) return
  edges.value = scrollEdges(el.scrollLeft, el.scrollWidth, el.clientWidth)
}

// 容器寬度會隨視窗、側欄變；路徑換了 SVG 寬度也會變，兩種都要重算。沒有
// ResizeObserver 的環境（舊瀏覽器、測試）退回監聽視窗 resize。
let resizeObserver: ResizeObserver | null = null
function observe(el: HTMLElement | null) {
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', updateEdges)
  if (!el) return
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(updateEdges)
    resizeObserver.observe(el)
  } else {
    window.addEventListener('resize', updateEdges)
  }
  updateEdges()
}
watch(scroller, observe)
watch(
  () => props.path,
  () => nextTick(updateEdges),
)
onBeforeUnmount(() => observe(null))
</script>

<template>
  <div v-if="path && !path.found" class="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-(--border-shelf) px-6 py-9 text-center">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" stroke-width="1.6" stroke-linecap="round" class="opacity-70">
      <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M8.5 8.5 L11 11 M13 13 L15.5 15.5" stroke-dasharray="2 3" />
    </svg>
    <p class="text-(length:--type-label-size) font-semibold text-(--text-ink-main)">這兩個條目之間沒有路徑</p>
  </div>

  <div v-else-if="path && path.found" class="rounded-xl border border-(--border-shelf) bg-(--bg-paper-light)">
    <!-- 會捲動時加 tabindex，鍵盤使用者才能聚焦後用方向鍵捲；不會捲動時不多一個 Tab 停點 -->
    <div
      ref="scroller"
      data-testid="path-scroller"
      class="path-scroller overflow-x-auto rounded-xl px-6 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
      :data-fade-start="edges.start || undefined"
      :data-fade-end="edges.end || undefined"
      :tabindex="edges.overflowing ? 0 : undefined"
      @scroll.passive="updateEdges"
    >
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
  </div>
</template>

<style scoped>
/* 淡出寬度 48px：大約一個連線動詞的一半，看得出字被切到、也還讀得到開頭幾個字。
   mask 的 black／transparent 只代表不透明度，不是畫面上的顏色。 */
.path-scroller {
  --fade-start: 0px;
  --fade-end: 0px;
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black var(--fade-start),
    black calc(100% - var(--fade-end)),
    transparent 100%
  );
}
.path-scroller[data-fade-start] {
  --fade-start: 48px;
}
.path-scroller[data-fade-end] {
  --fade-end: 48px;
}
</style>
