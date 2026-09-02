<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph'
import { fetchGraphPocData } from '@/data/graphPocData'

const container = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref<string | null>(null)
let graph: ForceGraph3DInstance | undefined

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

  if (!container.value) return

  // Z 軸縱深分層：fz 直接固定 z 座標,越久沒讀的筆記退到後面(數值越負離鏡頭越遠)
  const nodes = graphPocNodes.map((n) => ({ ...n, fz: -n.daysSinceAccessed * 1.5 }))
  const links = graphPocLinks.map((l) => ({ ...l }))

  graph = new ForceGraph3D(container.value)
    .width(800)
    .height(520)
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
})

onUnmounted(() => {
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
