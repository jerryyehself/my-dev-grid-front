<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from 'd3-force'
import { graphPocNodes, graphPocLinks, type GraphPocNode } from '@/data/graphPocData'

// 2D 版本刻意不加 d3-selection / d3-drag，用最原生的方式拖曳，
// 這樣才看得出「不靠額外套件，純用已經裝好的 d3-force 能做到什麼程度」。

const width = 800
const height = 520

type SimNode = GraphPocNode & { x: number; y: number; fx?: number | null; fy?: number | null }
type SimLink = { source: SimNode; target: SimNode; kind: 'related' | 'inspiration' }

const nodes = ref<SimNode[]>(graphPocNodes.map((n) => ({ ...n, x: width / 2, y: height / 2 })))
const links = ref<SimLink[]>([])

let simulation: ReturnType<typeof forceSimulation<SimNode>>
let draggingNode: SimNode | null = null

const radiusFor = (n: GraphPocNode) => 4 + n.weight * 16
const colorFor = (n: GraphPocNode) => (n.weight > 0.6 ? '#b45309' : '#94a3b8')

function onPointerDown(n: SimNode) {
  draggingNode = n
  n.fx = n.x
  n.fy = n.y
}
function onPointerMove(e: MouseEvent, svg: SVGSVGElement) {
  if (!draggingNode) return
  const rect = svg.getBoundingClientRect()
  draggingNode.fx = e.clientX - rect.left
  draggingNode.fy = e.clientY - rect.top
  simulation.alpha(0.3).restart()
}
function onPointerUp() {
  if (draggingNode) {
    draggingNode.fx = null
    draggingNode.fy = null
  }
  draggingNode = null
}

onMounted(() => {
  simulation = forceSimulation(nodes.value)
    .force(
      'link',
      forceLink<SimNode, SimLink>(
        graphPocLinks.map((l) => ({ ...l }) as unknown as SimLink),
      )
        .id((d) => (d as unknown as SimNode).id)
        .distance(70),
    )
    .force('charge', forceManyBody().strength(-90))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide<SimNode>((d) => radiusFor(d) + 4))
    .on('tick', () => {
      links.value = (simulation.force('link') as ReturnType<typeof forceLink<SimNode, SimLink>>).links()
      nodes.value = [...nodes.value]
    })
})

onUnmounted(() => simulation?.stop())
</script>

<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    class="w-full h-auto touch-none select-none rounded border border-stone-200 bg-white"
    @pointermove="(e) => onPointerMove(e, $event.currentTarget as SVGSVGElement)"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <line
      v-for="(l, i) in links"
      :key="i"
      :x1="l.source.x"
      :y1="l.source.y"
      :x2="l.target.x"
      :y2="l.target.y"
      :stroke="l.kind === 'inspiration' ? '#b45309' : '#cbd5e1'"
      :stroke-dasharray="l.kind === 'inspiration' ? '4 3' : undefined"
      stroke-width="1.2"
    />
    <g v-for="n in nodes" :key="n.id" @pointerdown="onPointerDown(n)" class="cursor-grab">
      <circle
        :cx="n.x"
        :cy="n.y"
        :r="radiusFor(n)"
        :fill="colorFor(n)"
        :class="n.weight > 0.6 ? 'poc-breathe' : ''"
      />
      <text
        v-if="n.weight > 0.6"
        :x="n.x"
        :y="n.y - radiusFor(n) - 6"
        text-anchor="middle"
        font-size="11"
        fill="#57534e"
      >
        {{ n.label }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.poc-breathe {
  animation: breathe 2.4s ease-in-out infinite;
}
@keyframes breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
</style>
