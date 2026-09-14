<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import ForceGraph, { type NodeObject, type LinkObject } from 'force-graph'
import { forceCollide } from 'd3-force'
import { fetchGraphPocData, type GraphPocNode, type GraphPocLink, type GraphPocSelection } from '@/data/graphPocData'
import type { GraphPathDto } from '@/api/graph'
import { useTheme } from '@/composables/useTheme'

const props = defineProps<{ highlightPath?: GraphPathDto | null }>()

// force-graph（vasturiano，3d-force-graph 的 2D 姊妹套件，一樣的宣告式鏈式 API）取代原本
// 手刻的 d3-force + SVG 渲染 + tick loop + pointer 拖曳：tick loop、渲染、拖曳互動全部
// 交給套件內建處理，元件只剩下「把資料整理好、宣告怎麼畫」。

// 800×520 只是行動裝置量不到容器寬度前的保底值：實際尺寸在 onMounted 量測
// container.clientWidth 決定（高度維持固定，只有寬度需要跟著容器縮放），
// 避免原本寫死 800×520 在窄螢幕容器裡被 overflow-hidden 裁到整個畫布消失。
const FALLBACK_WIDTH = 800
const FALLBACK_HEIGHT = 520
let width = FALLBACK_WIDTH
let height = FALLBACK_HEIGHT

type SimNode = GraphPocNode & NodeObject
// Omit source/target：GraphPocLink 原本的 source/target 是純字串 id（資料層的形狀），
// 但力模擬跑起來後 force-graph 會把它們原地改寫成解析過的節點物件——用 Omit 讓這兩個
// 欄位改吃 LinkObject<SimNode> 的 string|number|SimNode 型別，不然交集型別會被字串這邊
// 收斂成只剩 string，typeof l.source === 'object' 分支會被 TS 判成 never。
type SimLink = Omit<GraphPocLink, 'source' | 'target'> & LinkObject<SimNode>

const emit = defineEmits<{ select: [selection: GraphPocSelection] }>()

const container = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref<string | null>(null)
// settling 蓋住「畫布已經掛上去、力模擬還在跑、鏡頭還沒對焦」這段過程，跟首頁
// KnowledgeGraphPanel.vue 同樣的理由：直接曝露節點亂飄、鏡頭突然跳到置中位置的
// 過程，會被誤認成排版壞了。
const settling = ref(true)
let graph: ForceGraph<SimNode, SimLink> | undefined
let resizeObserver: ResizeObserver | undefined
let hasZoomedToFit = false

const { theme } = useTheme()

// 顏色改讀 CSS token（跟首頁 KnowledgeGraphPanel.vue 同一套 --text-accent/--overlay-nodata
// 語言）而不是寫死 hex，深色模式切換才會跟著換色，不用另外維護一份深色調色盤。
function css(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}

const radiusFor = (n: GraphPocNode) => 4 + n.weight * 16

// 配色改成依 domainType（跟首頁 KnowledgeGraphPanel.vue 同一套 --node-doc/tech/impl
// token），取代原本只有「核心/非核心」二元色——weight 已經拿去決定節點大小，顏色改
// 負責「這是文件/技術/實作」這個分類軸，兩個視覺維度不重疊，也讓下面的圖例有實際
// 意義（原本二元色沒東西可以列成圖例）。
function nodeColorVar(domainType: GraphPocNode['domainType']): string {
  return domainType === 'documentation' ? '--node-doc' : domainType === 'technique' ? '--node-tech' : '--node-impl'
}
const colorFor = (n: GraphPocNode) => css(nodeColorVar(n.domainType))

// hover 提亮直接鄰居、淡化其餘節點/邊：跟首頁 KnowledgeGraphPanel.vue 同一套手法
// （見該檔 hoveredNodeId/neighborIds 段落），這裡是簡化版——沒有 derived edge，只留
// 「知道這個節點連到哪裡」這個核心功能，雷達回波動畫則跟首頁一樣有（見下面
// hoverPingStartTime 段落）。force-graph 已經 autoPauseRedraw(false) 每幀重繪，hover
// 狀態變動不用額外呼叫任何 redraw，下一幀 nodeCanvasObject/linkColor 自然會讀到新值。
let hoveredNodeId: string | null = null
let neighborIds = new Map<string, Set<string>>()
function endpointId(x: string | number | SimNode | undefined): string {
  if (x == null) return ''
  return typeof x === 'object' ? x.id : String(x)
}
function linkTouchesHovered(l: SimLink): boolean {
  return hoveredNodeId != null && (endpointId(l.source) === hoveredNodeId || endpointId(l.target) === hoveredNodeId)
}

// 路徑查詢高亮：跟 hover 提亮鄰居是兩套獨立機制，但視覺上互斥——路徑查詢結果存在時
// 優先權比 hover 高（整張圖只淡化「不在路徑上」的東西，不理會滑鼠現在剛好停在哪個
// 節點）。非 Vue ref，是給 canvas 畫格 callback 讀的一般變數，跟 hoveredNodeId 同樣
// 的理由——canvas 重繪不需要、也不該掛在 Vue 的響應式追蹤上。
let pathNodeIds: Set<string> | null = null
let pathEdgeKeys: Set<string> | null = null
function linkKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}
function isPathEdge(l: SimLink): boolean {
  return pathEdgeKeys != null && pathEdgeKeys.has(linkKey(endpointId(l.source), endpointId(l.target)))
}
function isDimmedNode(id: string): boolean {
  if (pathNodeIds) return !pathNodeIds.has(id)
  if (!hoveredNodeId) return false
  if (id === hoveredNodeId) return false
  return !neighborIds.get(hoveredNodeId)?.has(id)
}
function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// 雷達跳動：跟首頁 KnowledgeGraphPanel.vue 同一套手法（拿掉常駐呼吸發光的教訓也是那邊
// 先踩過的——不管有沒有互動都在閃，意義不大，改成只在滑鼠真的 hover 到節點時，從節點
// 邊緣往外擴散、邊擴邊淡出的圓環，是互動回饋，不是背景裝飾）。兩圈相位錯開半個週期，
// 隨時都有一圈在視野裡，看起來才像連續的雷達回波，不是單一圈跳一下就停格等下一輪。
const RADAR_PING_PERIOD_MS = 1400
const RADAR_PING_MAX_EXPAND = 16
let hoverPingStartTime: number | null = null

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
  // v-show 從 display:none 切回可見是 Vue 的非同步 DOM 更新，這裡的 loading.value = false
  // 只是排入更新，還沒真的 flush 到 DOM——不等 nextTick 就量 clientWidth 會量到還沒
  // flush 前的 0，退回 FALLBACK_WIDTH。
  await nextTick()

  if (!container.value) return

  // 量測容器實際寬度（高度維持固定 520，容器本身沒有明確高度可量）
  width = container.value.clientWidth || FALLBACK_WIDTH
  height = FALLBACK_HEIGHT

  // 初始座標打散在畫布範圍內（不是全部疊在同一點），避免 charge 力在完全重疊的起點上
  // 互相推擠出不自然的爆開效果；不分群，讓 link/charge/collide 力自然決定誰跟誰靠近。
  const nodes: SimNode[] = graphPocNodes.map((n) => ({
    ...n,
    x: width / 2 + (Math.random() - 0.5) * width * 0.6,
    y: height / 2 + (Math.random() - 0.5) * height * 0.6,
  }))
  const links: SimLink[] = graphPocLinks.map((l) => ({ ...l }))

  neighborIds = new Map()
  for (const l of links) {
    const s = endpointId(l.source)
    const t = endpointId(l.target)
    if (!neighborIds.has(s)) neighborIds.set(s, new Set())
    if (!neighborIds.has(t)) neighborIds.set(t, new Set())
    neighborIds.get(s)!.add(t)
    neighborIds.get(t)!.add(s)
  }

  graph = new ForceGraph<SimNode, SimLink>(container.value)
    .width(width)
    .height(height)
    .backgroundColor(css('--canvas-bg'))
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
      const dimmed = isDimmedNode(n.id)
      ctx.save()
      ctx.globalAlpha = dimmed ? 0.25 : 1
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI, false)
      ctx.fillStyle = colorFor(n)
      ctx.fill()
      if (pathNodeIds?.has(n.id)) {
        ctx.lineWidth = 2.5
        ctx.strokeStyle = css('--text-accent')
        ctx.stroke()
      } else if (n.id === hoveredNodeId) {
        ctx.lineWidth = 2
        ctx.strokeStyle = css('--text-ink-body')
        ctx.stroke()
      }
      // 雷達跳動：只有目前真的被 hover 的節點才畫，見上面 hoverPingStartTime 段落說明。
      if (n.id === hoveredNodeId && hoverPingStartTime != null) {
        const elapsed = Date.now() - hoverPingStartTime
        for (const phaseOffset of [0, 0.5]) {
          const t = (((elapsed / RADAR_PING_PERIOD_MS) % 1) + phaseOffset) % 1
          ctx.beginPath()
          ctx.arc(x, y, r + t * RADAR_PING_MAX_EXPAND, 0, 2 * Math.PI)
          ctx.lineWidth = 1.5
          ctx.strokeStyle = withAlpha(css('--text-accent'), (1 - t) * 0.5)
          ctx.stroke()
        }
      }
      if ((isCore || pathNodeIds?.has(n.id)) && !dimmed) {
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = css('--text-ink-body')
        ctx.fillText(n.label, x, y - r - 6)
      }
      ctx.restore()
    })
    .linkColor((l) => {
      if (pathNodeIds) return isPathEdge(l) ? css('--text-accent') : withAlpha(css('--edge-real'), 0.12)
      if (hoveredNodeId) return linkTouchesHovered(l) ? css('--text-accent') : withAlpha(css('--edge-real'), 0.12)
      return l.kind === 'inspiration' ? css('--text-accent') : css('--edge-real')
    })
    .linkLineDash((l) => (l.kind === 'inspiration' ? [4, 3] : null))
    .linkWidth((l) => ((pathNodeIds ? isPathEdge(l) : hoveredNodeId && linkTouchesHovered(l)) ? 2.4 : 1.2))
    .enableNodeDrag(true)
    .onNodeDragEnd((n) => {
      // 放開拖曳後讓節點回到力模擬裡自由移動，跟原本 SVG 版本 pointerup 時清掉
      // fx/fy 的行為一致，而不是 force-graph 預設「拖完就固定住」的行為。
      n.fx = undefined
      n.fy = undefined
    })
    // hover 提亮鄰居／淡化其餘：見上面 hoveredNodeId 段落說明。cursor 改成 pointer
    // 讓使用者知道節點可以點擊看內容，不用先點一次才發現。
    .onNodeHover((n) => {
      const nextId = n?.id ?? null
      if (nextId === hoveredNodeId) return
      hoveredNodeId = nextId
      // 換了 hover 目標（含離開時變成 null）都重新起算，同一個節點持續 hover 時
      // 圈圈從頭開始循環擴散，不會沿用上一個節點停在哪個階段的進度。
      hoverPingStartTime = nextId != null ? Date.now() : null
      if (container.value) container.value.style.cursor = n ? 'pointer' : 'default'
    })
    .onNodeClick((n) =>
      emit('select', {
        kind: 'node',
        id: n.id,
        label: n.label,
        domainType: n.domainType,
        weight: n.weight,
        degree: neighborIds.get(n.id)?.size ?? 0,
      }),
    )
    .onLinkClick((l) =>
      emit('select', {
        kind: 'link',
        sourceLabel: (typeof l.source === 'object' ? l.source.label : nodes.find((n) => n.id === l.source)?.label) ?? String(l.source),
        targetLabel: (typeof l.target === 'object' ? l.target.label : nodes.find((n) => n.id === l.target)?.label) ?? String(l.target),
        linkKind: l.kind,
        predicate: l.predicate,
        label: l.label,
      }),
    )
    // hover 雷達跳動要每一幀重繪：模擬穩定、engine 停止 tick 之後 canvas 預設就不會
    // 再重畫（省效能），關掉這個機制才能讓 hover 中的節點持續播放擴散圈動畫。
    .autoPauseRedraw(false)
    .d3Force(
      'collide',
      forceCollide<SimNode>((n) => radiusFor(n) + 4),
    )
    // 沒設的話套件預設無限跑到真正物理收斂——跟首頁 KnowledgeGraphPanel.vue 同樣的
    // 300 ticks 上限，視覺上已經收斂到穩定狀態，不需要真的等到力學完全歸零，換來
    // 鏡頭幾秒內就能對焦，不是讓使用者對著擠在角落的節點等半分鐘。
    .cooldownTicks(300)
    // 力模擬收斂後鏡頭自動置中/縮放到剛好框住所有節點：沒有這行，節點最終停在
    // 畫布哪裡完全看運氣（charge/link 力學過程中可能整團往任一方向飄），實測
    // 常常整團擠在角落、大片留白。onEngineStop 不只在初始收斂時觸發——拖曳節點
    // 放開後 fx/fy 清空會重新 reheat 模擬，again 觸發 onEngineStop，用
    // hasZoomedToFit 只在第一次收斂時校正鏡頭，拖完節點不會被強制拉回置中，
    // 也不會又蓋一次 settling 遮罩。
    .onEngineStop(() => {
      if (hasZoomedToFit) return
      hasZoomedToFit = true
      graph?.zoomToFit(400, 40)
      settling.value = false
    })

  // force-graph 內建就有一個 'center' force，但預設目標是座標原點 (0,0)，跟畫布中心
  // (width/2, height/2) 對不起來，會讓整體佈局往角落偏，所以要改成畫布中心，而不是
  // 額外疊加一個新的 center force。
  graph.d3Force('center')?.x(width / 2).y(height / 2)
  graph.d3Force('charge')?.strength(-90)
  graph.d3Force('link')?.distance(70)

  // 容器寬度之後改變（例如旋轉螢幕、視窗縮放）時同步更新畫布寬度，避免又回到
  // 寫死尺寸的老問題。高度維持不變，只跟著寬度縮放。
  resizeObserver = new ResizeObserver((entries) => {
    const newWidth = entries[0]?.contentRect.width
    if (newWidth && graph && Math.abs(newWidth - width) > 1) {
      width = newWidth
      graph.width(newWidth)
      if (hasZoomedToFit) graph.zoomToFit(0, 40)
    }
  })
  resizeObserver.observe(container.value)
})

// nodeCanvasObject/linkColor 是每次渲染都重新呼叫的 callback，主題切換後配合
// autoPauseRedraw(false) 自動跟著換色；但 backgroundColor() 是一次性設定值，
// 不會自動重讀，theme 變動時要手動重新指定一次。
watch(theme, () => {
  graph?.backgroundColor(css('--canvas-bg'))
})

// 路徑查詢結果變動時重算 pathNodeIds/pathEdgeKeys——不用手動觸發 redraw，
// autoPauseRedraw(false) 已經讓畫面持續重繪，下一幀 nodeCanvasObject/linkColor
// 自然會讀到新值（跟 hoveredNodeId 是同一套邏輯）。found=false 或還沒查詢時視同
// 沒有高亮路徑，退回 hover 提亮邏輯。
watch(
  () => props.highlightPath,
  (path) => {
    if (!path?.found || path.nodes.length === 0) {
      pathNodeIds = null
      pathEdgeKeys = null
      return
    }
    pathNodeIds = new Set(path.nodes.map((n) => n.id))
    pathEdgeKeys = new Set(path.edges.map((e) => linkKey(e.source, e.target)))
    // 找到路徑就把鏡頭帶過去——只框住路徑上的節點，不用使用者自己在一團裡面找。
    // 初始收斂前 zoomToFit 交給 onEngineStop 處理，這裡只在已經收斂過一次之後才動作。
    if (hasZoomedToFit) graph?.zoomToFit(400, 60, (n) => pathNodeIds?.has(n.id) ?? false)
  },
  { immediate: true },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  graph?._destructor?.()
})
</script>

<template>
  <div v-if="loading" class="w-full h-[520px] flex items-center justify-center rounded border border-(--border-shelf) bg-(--bg-paper-light) text-xs text-(--text-ink-body)/40">
    載入知識圖譜資料中...
  </div>
  <div v-else-if="error" class="w-full h-[520px] flex items-center justify-center rounded border border-(--border-shelf) bg-(--bg-paper-light) text-xs text-(--text-accent)">
    {{ error }}
  </div>
  <!-- container 用 v-show 而不是 v-if：ref 要在 onMounted 執行前就綁定好，
       loading/error 之間切換時才不會拿到還沒掛載的 DOM 節點 -->
  <div v-show="!loading && !error" class="relative">
    <div ref="container" class="w-full overflow-hidden rounded border border-(--border-shelf)" />
    <div
      v-if="!loading && !error"
      class="absolute inset-0 flex items-end justify-center pb-5 backdrop-blur-sm bg-(--bg-paper-light)/50 transition-opacity duration-700"
      :class="settling ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <span class="font-mono text-[11px] tracking-widest text-(--text-ink-body)/70">// 節點排列中...</span>
    </div>
  </div>
</template>
