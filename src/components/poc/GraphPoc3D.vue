<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph'
import { graphPocNodes, graphPocLinks } from '@/data/graphPocData'

const container = ref<HTMLDivElement>()
let graph: ForceGraph3DInstance | undefined

onMounted(() => {
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
  <div ref="container" class="w-full overflow-hidden rounded border border-stone-200" />
</template>
