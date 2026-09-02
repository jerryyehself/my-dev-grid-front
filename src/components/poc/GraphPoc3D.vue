<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph'
import { fetchGraphPocData } from '@/data/graphPocData'

// 800×520 只是行動裝置量不到容器寬度前的保底值，見 GraphPoc2D.vue 同樣的說明。
const FALLBACK_WIDTH = 800
const FALLBACK_HEIGHT = 520

const container = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref<string | null>(null)
let graph: ForceGraph3DInstance | undefined
let resizeObserver: ResizeObserver | undefined

onMounted(async () => {
  let graphPocNodes: Awaited<ReturnType<typeof fetchGraphPocData>>['nodes']
  let graphPocLinks: Awaited<ReturnType<typeof fetchGraphPocData>>['links']
  try {
    ;({ nodes: graphPocNodes, links: graphPocLinks } = await fetchGraphPocData())
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入知識圖譜資料失敗'
    loading.value = false
    return
  }
  loading.value = false
  // v-show 從 display:none 切回可見要等 nextTick 才會真的 flush 到 DOM，見 GraphPoc2D.vue
  // 同樣的說明——不等就量 clientWidth 會量到 0。
  await nextTick()

  if (!container.value) return

  // 量測容器實際寬度（高度維持固定，見 GraphPoc2D.vue 同樣的說明）
  const width = container.value.clientWidth || FALLBACK_WIDTH

  // Z 軸縱深分層：fz 直接固定 z 座標,越久沒讀的筆記退到後面(數值越負離鏡頭越遠)
  const nodes = graphPocNodes.map((n) => ({ ...n, fz: -n.daysSinceAccessed * 1.5 }))
  const links = graphPocLinks.map((l) => ({ ...l }))

  graph = new ForceGraph3D(container.value)
    .width(width)
    .height(FALLBACK_HEIGHT)
    .backgroundColor('#ffffff')
    .graphData({ nodes, links })
    .nodeId('id')
    .nodeLabel('label')
    .nodeVal((n) => 2 + (n as { weight: number }).weight * 22)
    .nodeColor((n) => ((n as { weight: number }).weight > 0.6 ? '#b45309' : '#94a3b8'))
    .linkColor((l) => ((l as { kind: string }).kind === 'inspiration' ? '#b45309' : '#cbd5e1'))
    .linkWidth((l) => ((l as { kind: string }).kind === 'inspiration' ? 1.5 : 0.6))
    // 3d-force-graph 沒有原生「虛線」材質,用沿線飄動的粒子近似「靈感對撞機」的動態感
    .linkDirectionalParticles((l) => ((l as { kind: string }).kind === 'inspiration' ? 3 : 0))
    .linkDirectionalParticleSpeed(0.004)

  // 容器寬度改變時同步更新畫布寬度，見 GraphPoc2D.vue 同樣的說明。
  resizeObserver = new ResizeObserver((entries) => {
    const newWidth = entries[0]?.contentRect.width
    if (newWidth && graph) graph.width(newWidth)
  })
  resizeObserver.observe(container.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  graph?._destructor?.()
})
</script>

<template>
  <div v-if="loading" class="w-full h-[520px] flex items-center justify-center rounded border border-stone-200 bg-white text-xs text-stone-400">
    載入知識圖譜資料中...
  </div>
  <div v-else-if="error" class="w-full h-[520px] flex items-center justify-center rounded border border-stone-200 bg-white text-xs text-red-600">
    {{ error }}
  </div>
  <!-- container 用 v-show 而不是 v-if：ref 要在 onMounted 執行前就綁定好，
       loading/error 之間切換時才不會拿到還沒掛載的 DOM 節點 -->
  <div v-show="!loading && !error" ref="container" class="w-full overflow-hidden rounded border border-stone-200" />
</template>
