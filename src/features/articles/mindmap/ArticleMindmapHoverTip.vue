<script setup lang="ts">
// 文章清單的標題懸停心智圖（站主 2026-11-24 定案，2026-11-25 改成兩階）：
// - 只在游標停在標題文字上、或鍵盤 Tab 到標題時出現（由 ArticlesView 控制何時掛上這個元件）。
// - 預設往上展開，這樣看圖的同時下面的摘要還看得到；往上會被視窗頂端（含黏在上面的導覽列）
//   擋住時才改往下。
// - 兩階：中心直接接權重最高的 6–8 個主要概念，不放分枝（怎麼挑見 mindmapTree.ts 的 hoverConceptsOf）。
//   讓讀者點進去之前，搭配摘要先看出這篇談了哪些概念。
// - 640px 寬、中心 15px、概念 14px，沒有橫向線、沒有工具列。一個概念都沒有就不顯示。
// - 指標穿透（pointer-events: none）：圖裡沒有可以點的東西，游標移過去也不會擋到別篇。
// - 手機（窄於 md）不顯示：手機沒有懸停，點標題直接進文章，內頁有完整的圖。
// 外框沿用卡片底 --bg-folder、--edge-real 細框、圓角 6、--node-shadow 陰影（線框值）。
import { computed, onMounted, ref, shallowRef } from 'vue'
import { STICKY_TOP_PX } from '@/layouts/stickyOffset'
import ArticleMindmapDiagram from './ArticleMindmapDiagram.vue'
import { loadArticleMindmap } from './articleMindmapSource'
import type { ArticleMindmap } from './articleMindmapTypes'
import { HOVER_METRICS, layoutMindmap } from './mindmapLayout'
import { buildHoverSpec, centerOf } from './mindmapTree'
import { measureLabelWidth } from './measureLabel'
import { useMindmapFonts } from './useMindmapFonts'

const props = defineProps<{
  articleId: number
  /** 標題元素；提示框貼著它上緣或下緣，跟它同一個定位容器 */
  anchor: HTMLElement
  /** 給標題連結的 aria-describedby 對上 */
  tipId: string
}>()

/** 提示框寬 640，扣掉左右各 1px 框線就是圖的寬 */
const TIP_WIDTH = 640
const SVG_WIDTH = TIP_WIDTH - 2
/** 跟標題之間的距離 */
const GAP = 6

const mindmap = shallowRef<ArticleMindmap | null>(null)
const fontsVersion = useMindmapFonts()

const layout = computed(() => {
  void fontsVersion.value
  if (!mindmap.value) return null
  const spec = buildHoverSpec(mindmap.value)
  // 只剩中心的圖看不出這篇談什麼，不如不顯示
  if (spec.right.length + spec.left.length === 0) return null
  return layoutMindmap(spec, HOVER_METRICS, measureLabelWidth, SVG_WIDTH)
})

const title = computed(() => (mindmap.value ? `文章心智圖：${centerOf(mindmap.value).label}` : ''))

const placeAbove = ref(true)
const top = computed(() => {
  if (!layout.value) return 0
  const height = layout.value.viewBox[3] + 2
  return placeAbove.value
    ? props.anchor.offsetTop - GAP - height
    : props.anchor.offsetTop + props.anchor.offsetHeight + GAP
})

onMounted(async () => {
  const data = await loadArticleMindmap(props.articleId)
  if (!data) return
  mindmap.value = data
  const height = (layout.value?.viewBox[3] ?? 0) + 2
  // 標題上緣到被導覽列蓋住的位置之間，放得下整個框才往上
  placeAbove.value = props.anchor.getBoundingClientRect().top - STICKY_TOP_PX >= height + GAP
})
</script>

<template>
  <div
    v-if="layout"
    :id="tipId"
    role="tooltip"
    class="absolute left-0 z-20 hidden md:block pointer-events-none overflow-hidden rounded-[6px] border border-(--edge-real) bg-(--bg-folder) shadow-[0_8px_24px_var(--node-shadow)]"
    :style="{ top: `${top}px`, width: `${TIP_WIDTH}px` }"
    :data-placement="placeAbove ? 'above' : 'below'"
  >
    <ArticleMindmapDiagram :layout="layout" :title="title" surface="folder" />
  </div>
</template>
