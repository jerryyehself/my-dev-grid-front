<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import ForceGraph, { type NodeObject, type LinkObject } from 'force-graph'
import { forceCollide } from 'd3-force'
import { fetchGraphPocData, type GraphPocNode, type GraphPocLink } from '@/data/graphPocData'

// force-graph（vasturiano，3d-force-graph 的 2D 姊妹套件，一樣的宣告式鏈式 API）取代原本
// 手刻的 d3-force + SVG 渲染 + tick loop + pointer 拖曳：tick loop、渲染、拖曳互動全部
// 交給套件內建處理，元件只剩下「把資料整理好、宣告怎麼畫」。

const width = 800
const height = 520

type SimNode = GraphPocNode & NodeObject
type SimLink = GraphPocLink & LinkObject<SimNode>

const container = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref<string | null>(null)
let graph: ForceGraph<SimNode, SimLink> | undefined

const radiusFor = (n: GraphPocNode) => 4 + n.weight * 16
const colorFor = (n: GraphPocNode) => (n.weight > 0.6 ? '#b45309' : '#94a3b8')

// 2.4 秒一個週期的 ease-in-out 呼吸動畫，opacity 在 1 ↔ 0.55 之間——對應原本 SVG 版本
// 的 `@keyframes breathe`。force-graph 的 canvas 渲染沒有 CSS 動畫可用，改成在
// nodeCanvasObject 裡用時間算出目前的 opacity，靠 autoPauseRedraw(false) 讓畫面
// 持續重繪（不然力模擬穩定、engine 停止 tick 之後 canvas 預設就不會再重畫，動畫會卡住）。
const BREATHE_PERIOD_MS = 2400
function breatheOpacity(): number {
  const t = (Date.now() % BREATHE_PERIOD_MS) / BREATHE_PERIOD_MS
  return 0.55 + 0.45 * ((Math.cos(2 * Math.PI * t) + 1) / 2)
}

// 依 clusterId 把節點初始位置錨定在圓周上分散開的各個分群中心，讓「這個節點屬於哪個
// Scope 分類」用空間分群表達，而不是像 dagMode 那樣需要真的階層邊才畫得出分層——這份
// 資料裡階層是節點的分類中繼資料，不是節點間的邊，見 graphPocData.ts 檔頭說明。
function computeClusterCenters(nodes: GraphPocNode[]): Map<string, { x: number; y: number }> {
  const clusterIds = [...new Set(nodes.map((n) => n.clusterId))]
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * 0.32
  const centers = new Map<string, { x: number; y: number }>()
  clusterIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / clusterIds.length - Math.PI / 2
    centers.set(id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) })
  })
  return centers
}

// 自訂的 d3-force：每一 tick 把節點輕輕拉向自己 cluster 的中心，讓分群在整個模擬過程中
// 持續保持視覺上的分離，而不是只靠一次性的初始座標（那樣會被 charge/link 力慢慢拉散）。
// strength 刻意調得溫和——這只是「輕輕引導」，節點彼此之間實際的力學（誰跟誰靠近、
// 擠不擠）仍然完全交給 force-graph 內建的 link/charge/collide，來自 /api/graph 的邊
// 全部原封不動當網路關聯餵給它們，沒有邊被挪去做階層佈局用。
function clusterForce(centers: Map<string, { x: number; y: number }>, strength: number) {
  let nodes: SimNode[] = []
  const force = (alpha: number) => {
    for (const n of nodes) {
      const center = centers.get(n.clusterId)
      if (!center || n.x == null || n.y == null) continue
      n.vx = (n.vx ?? 0) + (center.x - n.x) * strength * alpha
      n.vy = (n.vy ?? 0) + (center.y - n.y) * strength * alpha
    }
  }
  force.initialize = (ns: SimNode[]) => {
    nodes = ns
  }
  return force
}

onMounted(async () => {
  let graphPocNodes: GraphPocNode[]
  let graphPocLinks: GraphPocLink[]
  try {
    ;({ nodes: graphPocNodes, links: graphPocLinks } = await fetchGraphPocData())
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入知識圖譜資料失敗'
    loading.value = false
    return
  }
  loading.value = false

  if (!container.value) return

  const clusterCenters = computeClusterCenters(graphPocNodes)
  const nodes: SimNode[] = graphPocNodes.map((n) => {
    const center = clusterCenters.get(n.clusterId) ?? { x: width / 2, y: height / 2 }
    // 初始座標直接放在分群中心附近（帶一點小範圍抖動避免完全重疊），力模擬一開始
    // 就已經是分好群的狀態，不用等 clusterForce 慢慢把散開的節點拉回來。
    return { ...n, x: center.x + (Math.random() - 0.5) * 20, y: center.y + (Math.random() - 0.5) * 20 }
  })
  const links: SimLink[] = graphPocLinks.map((l) => ({ ...l }))

  graph = new ForceGraph<SimNode, SimLink>(container.value)
    .width(width)
    .height(height)
    .backgroundColor('#ffffff')
    .graphData({ nodes, links })
    .nodeId('id')
    .nodeLabel('label')
    .nodeRelSize(1)
    .nodeVal((n) => radiusFor(n) ** 2) // r = sqrt(val) * nodeRelSize，撐開拖曳/hover 判定半徑跟畫出來的圓一致
    .nodeCanvasObject((n, ctx) => {
      const r = radiusFor(n)
      const x = n.x ?? 0
      const y = n.y ?? 0
      const isCore = n.weight > 0.6
      ctx.save()
      if (isCore) ctx.globalAlpha = breatheOpacity()
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI, false)
      ctx.fillStyle = colorFor(n)
      ctx.fill()
      if (isCore) {
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#57534e'
        ctx.fillText(n.label, x, y - r - 6)
      }
      ctx.restore()
    })
    .linkColor((l) => (l.kind === 'inspiration' ? '#b45309' : '#cbd5e1'))
    .linkLineDash((l) => (l.kind === 'inspiration' ? [4, 3] : null))
    .linkWidth(1.2)
    .enableNodeDrag(true)
    .onNodeDragEnd((n) => {
      // 放開拖曳後讓節點回到力模擬裡自由移動，跟原本 SVG 版本 pointerup 時清掉
      // fx/fy 的行為一致，而不是 force-graph 預設「拖完就固定住」的行為。
      n.fx = undefined
      n.fy = undefined
    })
    .autoPauseRedraw(false) // 呼吸動畫要每一幀重繪，關掉「模擬穩定就停止重繪」的省電機制
    .d3Force('cluster', clusterForce(clusterCenters, 0.15))
    .d3Force(
      'collide',
      forceCollide<SimNode>((n) => radiusFor(n) + 4),
    )

  // force-graph 內建就有一個 'center' force，但預設目標是座標原點 (0,0)，跟畫布中心
  // (width/2, height/2) 對不起來——會跟 clusterForce（目標在畫布中心附近）互相拉扯，
  // 讓整體佈局歪掉甚至被拉出畫布，所以要改成畫布中心，而不是額外疊加一個新的 center force。
  graph.d3Force('center')?.x(width / 2).y(height / 2)
  graph.d3Force('charge')?.strength(-90)
  graph.d3Force('link')?.distance(70)
})

onUnmounted(() => graph?._destructor?.())
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
