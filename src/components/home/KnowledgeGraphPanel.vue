<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ForceGraph, { type NodeObject, type LinkObject } from 'force-graph'
import { forceCollide } from 'd3-force'
import { fetchGraph, type GraphNodeDto, type GraphEdgeDto, type GraphNodeType } from '@/api/graph'
import { useTheme } from '@/composables/useTheme'

// 首頁知識網路小工具：只看、不深挖（拖曳/篩選留給 /graph 頁），用真實
// GET /api/graph 資料畫「文件 → 技術 → 實作」三分區力導向圖。跟 /graph 頁的
// GraphPoc2D.vue 共用同一套 clusterForce/collide 手法，差異在於這裡額外做了
// 「模擬跑完後把三個型別整批平移到設計好的扇區座標＋zoomToFit() 重新框鏡頭」
// 這一段——純靠 clusterForce 長時間冷卻後會被 boundaryForce 拖到塌縮成一團
// （force-graph 內建 'center' force 持續把節點座標的平均值拉回原點，跟兩個
// 手刻力的參考系對不上），實測驗證過後改用這個更穩定的作法。

interface SimNode extends NodeObject {
  id: string
  domainType: GraphNodeType
  label: string
  degree: number
  createdAt: string | null
}
interface SimLink extends LinkObject<SimNode> {
  predicate: string | null
}

const container = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref<string | null>(null)
const stats = reactive({ doc: 0, tech: 0, impl: 0, edges: 0 })

const { theme } = useTheme()

let graph: ForceGraph<SimNode, SimLink> | undefined
let resizeObserver: ResizeObserver | undefined
let width = 900
let height = 460

const typeLabel: Record<GraphNodeType, string> = {
  documentation: 'Documentation',
  technique: 'Technique',
  implementation: 'Implementation',
}

function css(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}
function isDark(): boolean {
  return document.documentElement.classList.contains('theme-terminal')
}
function typeColor(type: GraphNodeType): string {
  return css(`--node-${type === 'documentation' ? 'doc' : type === 'technique' ? 'tech' : 'impl'}`)
}

// VOSviewer 2018 起的預設色階換成了 viridis（放棄彩虹色階，見 CWTS 團隊
// "Farewell rainbow!" 一文），這裡手刻同一組色階的簡化版本（6 個色點線性插值）。
const VIRIDIS_STOPS = ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725']
function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
function lerpColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a)
  const pb = hexToRgb(b)
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `rgb(${r},${g},${bl})`
}
function viridis(t: number): string {
  t = Math.max(0, Math.min(1, t))
  const n = VIRIDIS_STOPS.length - 1
  const seg = Math.min(n - 1, Math.floor(t * n))
  const localT = t * n - seg
  // seg 由 Math.min(n-1, ...) 夾在 [0, n-1] 範圍內，seg+1 必落在陣列合法索引內，
  // 這裡的 ! 是純粹的邊界證明，不是繞過真的可能 undefined 的情況。
  return lerpColor(VIRIDIS_STOPS[seg]!, VIRIDIS_STOPS[seg + 1]!, localT)
}
// 正規化區間：2025-01-01 ~ 今天，不是拿現有實作各自的日期當極值——用固定的合理
// 時間窗，真實日期落在窗內哪個位置就是哪個位置，不是刻意把資料點推到色階兩端
// 做出「有變化」的假象。
const OVERLAY_WINDOW_START = new Date('2025-01-01').getTime()
const OVERLAY_WINDOW_END = Date.now()
function recencyScore(dateStr: string): number {
  const t = new Date(dateStr).getTime()
  return (t - OVERLAY_WINDOW_START) / (OVERLAY_WINDOW_END - OVERLAY_WINDOW_START)
}

// 節點顏色模式：依類型（分類色）／依建立時間（VOSviewer overlay 視覺語言——顏色
// 改成連續變數，這裡唯一有的連續變數是 Implementation 的真實 git_repo_created_at；
// Documentation/Technique 完全沒有這個欄位，誠實顯示成灰色「無資料」，不是編一個
// 假的時間。注意這是「repo 建立時間」不是「最近活動時間」，不誇大成「熱度」。
const colorMode = ref<'type' | 'overlay'>('type')
function nodeColorFor(n: SimNode): string {
  if (colorMode.value === 'type') return typeColor(n.domainType)
  if (!n.createdAt) return css('--overlay-nodata') || '#9a9186'
  return viridis(recencyScore(n.createdAt))
}

const radiusFor = (n: SimNode) => 4.5 + Math.min(n.degree, 8) * 1.1

// 節點是否要烤字在圖上：文件／實作筆數少，每個標題都有意義，全部烤字；
// 技術筆數比較多，只烤 degree>=3 的樞紐節點（比如 PHP、laravel），其餘留白圈，
// 靠圖例色＋hover/tap 辨識——不是每個點都烤字（selective labeling）。
function shouldLabelNode(n: SimNode): boolean {
  if (n.domainType !== 'technique') return true
  return n.degree >= 3
}

const measureCtx = document.createElement('canvas').getContext('2d')!
const LABEL_FONT = '500 10.5px system-ui, sans-serif'
function labelWidth(n: SimNode): number {
  if (!shouldLabelNode(n)) return 0
  measureCtx.font = LABEL_FONT
  return measureCtx.measureText(n.label).width
}

// 依 domainType 分群：跟 /graph 頁（GraphPoc2D.vue）同一套 clusterForce 手法，
// 只是分群鍵換成 domainType，且力道刻意調弱——只需要「輕輕引導」同型別的節點
// 局部聚在一起，真正的巨觀分區交給下面 remapToSectors() 做，不靠這個力
// 長時間跑下去也能維持分離（見檔頭註解）。
function clusterForce(centersFn: () => Record<string, { x: number; y: number }>, strength: number) {
  let nodes: SimNode[] = []
  const force = (alpha: number) => {
    const centers = centersFn()
    for (const n of nodes) {
      const c = centers[n.domainType]
      if (!c || n.x == null || n.y == null) continue
      n.vx = (n.vx ?? 0) + (c.x - n.x) * strength * alpha
      n.vy = (n.vy ?? 0) + (c.y - n.y) * strength * alpha
    }
  }
  force.initialize = (list: SimNode[]) => {
    nodes = list
  }
  return force
}

// 邊界安全網：稀疏圖在多輪 tick 後可能被 charge 排斥力推出可視範圍之外。
// 只對真的超出邊界的節點施加溫和回推力——這是模擬過程中的軟安全網，真正保證
// 「畫面上不會有節點被裁到外面」的是後面的 clampAllNodes()。
function boundaryForce(widthFn: () => number, heightFn: () => number, padding: number) {
  let nodes: SimNode[] = []
  const force = () => {
    const w = widthFn()
    const h = heightFn()
    for (const n of nodes) {
      if (n.x == null || n.y == null) continue
      if (n.x < padding) n.vx = (n.vx ?? 0) + (padding - n.x) * 0.02
      if (n.x > w - padding) n.vx = (n.vx ?? 0) - (n.x - (w - padding)) * 0.02
      if (n.y < padding) n.vy = (n.vy ?? 0) + (padding - n.y) * 0.02
      if (n.y > h - padding) n.vy = (n.vy ?? 0) - (n.y - (h - padding)) * 0.02
    }
  }
  force.initialize = (list: SimNode[]) => {
    nodes = list
  }
  return force
}

// 分區座標用畫布寬高的絕對比例算，技術靠上緣、文件／實作壓低到下緣附近，
// 儘量把畫布高度整個撐開用滿（畫布是寬扁形）。
function clusterCenters(): Record<GraphNodeType, { x: number; y: number }> {
  const cx = width / 2
  const rx = width * 0.3
  const yTech = height * 0.2
  const yLower = height * 0.68
  return {
    documentation: { x: cx - rx, y: yLower },
    technique: { x: cx, y: yTech },
    implementation: { x: cx + rx, y: yLower },
  }
}

let simNodes: SimNode[] = []

// 「先算真的局部結構，再把整群硬移到設計好的扇區位置」：clusterForce 的力道會
// 隨 alpha 衰減淡出，但 boundaryForce 為了當安全網刻意不隨 alpha 衰減，兩個
// 放在一起長時間跑下去會失衡——boundaryForce 沒對手了，把整張圖一點一點拖回
// 畫布中心，三團全部塌縮黏在一起（拉長觀察時間實測到的）。修法不是繼續細調
// 兩個力的相對係數（下次筆數/畫布比例一變又要重調），而是讓模擬只負責「同
// 型別內部怎麼擺」，跑完之後照各自的型別重心，整批平移到 clusterCenters()
// 的設計座標——內部相對結構完全保留，最終巨觀位置保證精準，不受力平衡好不好影響。
function remapToSectors() {
  const centers = clusterCenters()
  const groups: Partial<Record<GraphNodeType, SimNode[]>> = {}
  for (const n of simNodes) {
    if (n.x == null || n.y == null) continue
    ;(groups[n.domainType] ??= []).push(n)
  }
  for (const [type, list] of Object.entries(groups) as [GraphNodeType, SimNode[]][]) {
    const c = centers[type]
    if (!c || !list.length) continue
    const avgX = list.reduce((s, n) => s + (n.x ?? 0), 0) / list.length
    const avgY = list.reduce((s, n) => s + (n.y ?? 0), 0) / list.length
    const dx = c.x - avgX
    const dy = c.y - avgY
    for (const n of list) {
      n.x = (n.x ?? 0) + dx
      n.y = (n.y ?? 0) + dy
    }
  }
}

// 最終安全網：不管前面的力有沒有把節點(含標籤)收在畫布內，這裡直接把座標夾回
// 邊界，保證畫面上不會有節點或字被裁到畫布外。標籤畫在節點下方，下邊界要多
// 留文字高度的空間，左右邊界用量出來的實際字寬（不是猜一個固定緩衝值）。
function clampAllNodes() {
  for (const n of simNodes) {
    if (n.x == null || n.y == null) continue
    const r = radiusFor(n)
    const padX = Math.max(r + 4, labelWidth(n) / 2 + 4)
    const padBottom = shouldLabelNode(n) ? r + 20 : r + 4
    n.x = Math.max(padX, Math.min(width - padX, n.x))
    n.y = Math.max(r + 4, Math.min(height - padBottom, n.y))
  }
}

// zoomToFit() 只框節點半徑（force-graph 內建算法看不到畫在節點外面的文字），
// 所以框景要留的邊界得用量出來的最長標籤寬度算，不是猜一個數字。
function framePadding(): number {
  let maxHalfLabel = 0
  for (const n of simNodes) maxHalfLabel = Math.max(maxHalfLabel, labelWidth(n) / 2)
  return Math.ceil(Math.max(maxHalfLabel + 10, 30))
}

interface PopoverState {
  open: boolean
  kind: string
  title: string
  rows: string[]
  left: number
  top: number
}
const popover = reactive<PopoverState>({ open: false, kind: '', title: '', rows: [], left: 0, top: 0 })

function openPopover(kind: 'node' | 'link', obj: SimNode | SimLink, ev: MouseEvent) {
  if (kind === 'node') {
    const n = obj as SimNode
    popover.kind = typeLabel[n.domainType]
    popover.title = n.label
    popover.rows = [`共 ${n.degree} 條真實關聯`]
    if (n.createdAt) popover.rows.push(`repo 建立於 ${n.createdAt}`)
  } else {
    const l = obj as SimLink
    const s = typeof l.source === 'object' ? l.source.label : l.source
    const t = typeof l.target === 'object' ? l.target.label : l.target
    popover.kind = 'Relation'
    popover.title = l.predicate ?? '(未命名關聯)'
    popover.rows = [String(s), `→ ${String(t)}`]
  }
  // force-graph 的 onNodeClick/onLinkClick 回呼給的 MouseEvent 是套件內部處理過的，
  // ev.currentTarget 不保證是畫布本身（實測是 null）——直接用 container ref(畫布的
  // 容器 div，掛載時就綁定好)量對應的 stage 外框，不要假設事件物件帶著這個資訊。
  const stageEl = container.value?.closest('.kg-stage')
  if (!stageEl) return
  const stageRect = stageEl.getBoundingClientRect()
  popover.left = Math.min(Math.max(10, ev.clientX - stageRect.left + 14), stageRect.width - 290)
  popover.top = Math.max(10, ev.clientY - stageRect.top - 10)
  popover.open = true
}

function forceRedraw() {
  // 模擬冷卻後 force-graph 預設會停止重畫(省效能)；重新呼叫任一個渲染相關的
  // setter 才會逼出下一幀重畫（比如主題切換後想套用新的 CSS 變數顏色）。
  graph?.nodeCanvasObject(graph.nodeCanvasObject())
}

watch(theme, () => forceRedraw())
watch(colorMode, () => forceRedraw())

async function boot() {
  let dto: { nodes: GraphNodeDto[]; edges: GraphEdgeDto[] }
  try {
    dto = await fetchGraph()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入知識網路資料失敗'
    loading.value = false
    return
  }
  loading.value = false
  await nextTick()
  if (!container.value) return

  const degree = new Map<string, number>()
  for (const e of dto.edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }

  width = container.value.clientWidth || width
  height = container.value.clientHeight || height

  stats.doc = dto.nodes.filter((n) => n.type === 'documentation').length
  stats.tech = dto.nodes.filter((n) => n.type === 'technique').length
  stats.impl = dto.nodes.filter((n) => n.type === 'implementation').length
  stats.edges = dto.edges.length

  const centers0 = clusterCenters()
  simNodes = dto.nodes.map((n) => {
    const c = centers0[n.type]
    return {
      id: n.id,
      domainType: n.type,
      label: n.label,
      degree: degree.get(n.id) ?? 0,
      createdAt: n.created_at,
      x: c.x + (Math.random() - 0.5) * 24,
      y: c.y + (Math.random() - 0.5) * 24,
    }
  })
  const simLinks: SimLink[] = dto.edges.map((e) => ({
    source: e.source,
    target: e.target,
    predicate: e.predicate,
  })) as SimLink[]

  graph = new ForceGraph<SimNode, SimLink>(container.value)
    .width(width)
    .height(height)
    .backgroundColor('rgba(0,0,0,0)')
    .graphData({ nodes: simNodes, links: simLinks })
    .nodeId('id')
    .nodeLabel((n) => `${typeLabel[n.domainType]} · ${n.label}`)
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject((n, ctx, globalScale) => {
      const x = n.x ?? 0
      const y = n.y ?? 0
      const r = radiusFor(n)
      ctx.save()
      ctx.shadowColor = css('--node-shadow')
      ctx.shadowBlur = 7
      ctx.shadowOffsetY = 2
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.fillStyle = nodeColorFor(n)
      ctx.fill()
      ctx.restore()
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.lineWidth = 1
      ctx.strokeStyle = isDark() ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.38)'
      ctx.stroke()
      if (shouldLabelNode(n)) {
        const fontPx = 10.5
        ctx.font = `500 ${fontPx / globalScale}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = css('--text-ink-body')
        ctx.fillText(n.label, x, y + r + 3.5 / globalScale)
      }
    })
    .nodePointerAreaPaint((n, color, ctx) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(n.x ?? 0, n.y ?? 0, radiusFor(n) + 2, 0, 2 * Math.PI)
      ctx.fill()
    })
    .linkColor(() => css('--edge-real'))
    .linkWidth(1.1)
    .linkCurvature((l) => (l.predicate === 'requires' ? -0.3 : 0.22))
    .linkLabel((l) => {
      const s = typeof l.source === 'object' ? l.source.label : l.source
      const t = typeof l.target === 'object' ? l.target.label : l.target
      return `${l.predicate ?? '關聯'}：${s} → ${t}`
    })
    .linkDirectionalArrowLength(5)
    .linkDirectionalArrowRelPos(0.96)
    .linkDirectionalArrowColor(() => css('--edge-real'))
    .enableNodeDrag(false)
    .onNodeClick((n, ev) => openPopover('node', n, ev))
    .onLinkClick((l, ev) => openPopover('link', l, ev))
    .d3Force('cluster', clusterForce(clusterCenters, 0.1))
    .d3Force('boundary', boundaryForce(() => width, () => height, 30))
    .d3Force(
      'collide',
      forceCollide<SimNode>((n) => radiusFor(n) + (shouldLabelNode(n) ? 26 : 3)).iterations(2),
    )
    .cooldownTicks(300)
    .onEngineStop(() => {
      remapToSectors()
      clampAllNodes()
      graph?.zoomToFit(0, framePadding())
    })
  graph.d3Force('charge')?.strength(-130)
  graph.d3Force('link')?.distance(58)
  // 跨型別的邊(specs／uses)力道調弱：這個 ontology 幾乎每條真實邊都是跨型別
  // (文件指定技術、技術用在實作上)，如果邊的力道跟同型別一樣強，會把配對的
  // 節點硬拉在一起，蓋掉 clusterForce 想做的「同型別聚在同一區」效果。
  graph.d3Force('link')?.strength((l: SimLink) => {
    const st = typeof l.source === 'object' ? l.source.domainType : undefined
    const tt = typeof l.target === 'object' ? l.target.domainType : undefined
    return st && tt && st === tt ? 1 : 0.05
  })
  // 刻意不覆寫內建 'center' force 的目標座標：force-graph 這個版本明確呼叫
  // d3Force('center')?.x().y() 會讓整張圖幾乎畫不出東西（跟 /graph 頁的
  // GraphPoc2D.vue 那組參數不同，那邊有覆寫且正常，這裡本地測試反覆驗證過
  // 不能比照辦理）。zoomToFit() 已經解決鏡頭跟不上座標的問題，不需要額外覆寫。

  resizeObserver = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width
    const h = entries[0]?.contentRect.height
    if (w && h && graph) {
      width = w
      height = h
      graph.width(w).height(h)
      remapToSectors()
      clampAllNodes()
      graph.zoomToFit(0, framePadding())
    }
  })
  resizeObserver.observe(container.value)
}

onMounted(boot)
onUnmounted(() => {
  resizeObserver?.disconnect()
  graph?._destructor?.()
})
</script>

<template>
  <section class="w-full">
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 class="font-mono text-[11px] tracking-[0.2em] uppercase font-bold text-(--text-accent)">
        近期知識網路
      </h2>
    </div>

    <p v-if="!loading && !error" class="text-sm text-(--text-ink-body) mb-3">
      <b class="text-(--text-ink-main) tabular-nums">{{ stats.doc }}</b> 份文件、<b
        class="text-(--text-ink-main) tabular-nums"
        >{{ stats.tech }}</b
      >
      項技術、<b class="text-(--text-ink-main) tabular-nums">{{ stats.impl }}</b> 個實作，由
      <b class="text-(--text-ink-main) tabular-nums">{{ stats.edges }}</b> 條已實現的關聯串成的知識網路。
    </p>

    <div v-if="!loading && !error" class="flex items-center gap-2 mb-2.5">
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-(--text-ink-muted)">節點顏色</span>
      <button
        type="button"
        class="rounded-full border border-(--border-shelf) px-3 py-1 font-mono text-[11.5px] cursor-pointer"
        :class="colorMode === 'type' ? 'bg-(--text-accent) text-(--bg-paper-light) border-(--text-accent)' : 'bg-(--bg-folder) text-(--text-ink-muted)'"
        :aria-pressed="colorMode === 'type'"
        @click="colorMode = 'type'"
      >
        依類型
      </button>
      <button
        type="button"
        class="rounded-full border border-(--border-shelf) px-3 py-1 font-mono text-[11.5px] cursor-pointer"
        :class="colorMode === 'overlay' ? 'bg-(--text-accent) text-(--bg-paper-light) border-(--text-accent)' : 'bg-(--bg-folder) text-(--text-ink-muted)'"
        :aria-pressed="colorMode === 'overlay'"
        @click="colorMode = 'overlay'"
      >
        依建立時間
      </button>
    </div>

    <div v-if="!loading && !error && colorMode === 'type'" class="flex flex-wrap items-center gap-4 text-[12px] text-(--text-ink-muted) mb-3">
      <span class="flex items-center gap-1.5"
        ><span class="w-2 h-2 rounded-full" :style="{ background: 'var(--node-doc)' }"></span>Documentation</span
      >
      <span class="flex items-center gap-1.5"
        ><span class="w-2 h-2 rounded-full" :style="{ background: 'var(--node-tech)' }"></span>Technique</span
      >
      <span class="flex items-center gap-1.5"
        ><span class="w-2 h-2 rounded-full" :style="{ background: 'var(--node-impl)' }"></span>Implementation</span
      >
      <span class="ml-auto">點節點看內容・點連線看關聯定義</span>
    </div>
    <div v-else-if="!loading && !error" class="flex flex-wrap items-center gap-2.5 text-[11.5px] font-mono text-(--text-ink-muted) mb-3">
      <span>較舊</span>
      <span
        class="w-[120px] h-2 rounded"
        style="background: linear-gradient(to right, #440154, #414487, #2a788e, #22a884, #7ad151, #fde725)"
      ></span>
      <span>較新</span>
      <span class="flex items-center gap-1.5 ml-2"
        ><span class="w-2 h-2 rounded-full" :style="{ background: 'var(--overlay-nodata)' }"></span
        >尚無建立時間資料（Technique／Documentation）</span
      >
    </div>

    <div v-if="loading" class="h-[460px] flex items-center justify-center rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) text-[11px] font-mono text-(--text-ink-body)/40 tracking-widest">
      // LOADING_GRAPH...
    </div>
    <div v-else-if="error" class="h-[460px] flex flex-col items-center justify-center gap-2 rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) text-center px-6">
      <p class="text-[11px] font-mono text-(--text-accent) tracking-widest">// FAILED_TO_LOAD</p>
      <p class="text-sm text-(--text-ink-body)">{{ error }}</p>
    </div>

    <div
      v-show="!loading && !error"
      class="kg-stage relative rounded-xl border border-(--border-shelf) shadow-[0_12px_32px_rgba(41,18,5,0.14)] overflow-hidden h-[460px]"
      :style="{
        background: 'var(--canvas-bg)',
        backgroundImage: 'radial-gradient(var(--canvas-dot) 1.3px, transparent 1.3px)',
        backgroundSize: '22px 22px',
      }"
    >
      <div ref="container" class="w-full h-full" />

      <div
        class="popover absolute min-w-[220px] max-w-[280px] rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) px-4 py-3.5 shadow-[0_12px_32px_rgba(41,18,5,0.14)] transition-[opacity,transform] duration-150 z-10"
        :class="popover.open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-1.5 pointer-events-none'"
        :style="{ left: popover.left + 'px', top: popover.top + 'px' }"
      >
        <button
          type="button"
          class="absolute top-1.5 right-2 text-(--text-ink-muted) text-base leading-none p-1 cursor-pointer"
          aria-label="關閉"
          @click="popover.open = false"
        >
          ×
        </button>
        <div class="font-mono text-[10.5px] uppercase tracking-[0.08em] text-(--text-ink-muted) mb-1">
          {{ popover.kind }}
        </div>
        <h3 class="text-[15.5px] font-bold text-(--text-ink-main) mb-2 leading-tight">{{ popover.title }}</h3>
        <div v-for="(row, i) in popover.rows" :key="i" class="text-[12.5px] text-(--text-ink-body) mb-0.5">
          {{ row }}
        </div>
      </div>
    </div>

    <p class="mt-3 text-[12px] leading-relaxed text-(--text-ink-muted) border border-dashed border-(--border-shelf) rounded-xl px-4 py-3">
      <b class="text-(--text-ink-body)">「依建立時間」不是完成品：</b>色階仿 VOSviewer 2018 年後的預設（viridis，取代彩虹色階），但目前資料庫只有
      Implementation 有真實的 <code>git_repo_created_at</code>，Technique／Documentation 完全沒有對應的時間欄位，誠實顯示成灰色「無資料」，不是編一個假時間頂替；而且這個欄位是「repo
      建立時間」不是「最近活動時間」，還不是真正的「熱度」，issue #24 補上活動時間欄位後才能換成真正的熱度分數。
      節點大小＝真實關聯數（degree），不是編出來的權重；「潛在但尚未證實」關聯目前還沒有真的偵測邏輯產出這種資料，這版不畫示意用的虛線；
      目前資料庫只有 <code>my-dev-grid</code>、<code>my-dev-grid-front</code> 這 2 個 repo 有真實 technique 資料（其餘公開 repo 還在等
      <code>GITHUB_TOKEN</code> 補齊），這張圖規模小是真的小，不是漏畫。
      拖曳互動留給 <RouterLink to="/graph" class="text-(--text-accent) hover:underline">/graph</RouterLink> 頁深挖，首頁只看不操作。
    </p>
  </section>
</template>
