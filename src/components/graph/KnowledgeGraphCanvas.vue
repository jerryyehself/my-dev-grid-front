<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ForceGraph from 'force-graph'
import { forceCollide } from 'd3-force'
import { graphNodeLink, type GraphNodeLink } from '@/components/graphNodeLink'
import { relationPhrase } from '@/components/graphRelationPhrase'
import type { GraphDto, GraphNodeType } from '@/api/graph'
import { useTheme } from '@/composables/useTheme'
import { TYPE_LABEL, endpointId, type SimLink, type SimNode } from './graphTypes'
import { recencyScore, viridis, withAlpha } from './colorScale'
import { computeDerivedEdges, derivedStrength as derivedStrengthOf } from './derivedEdges'
import {
  DEPTH_ORDER,
  boundaryForce,
  clampToLayer,
  countByType,
  layerBoundaryForce,
  layerGravityForce,
  layerTargets,
  type LayerTargets,
} from './layeredLayout'

// 共用的知識圖譜畫布（D-87）：首頁「近期知識網路」與 /graph 頁 2D 圖譜共用同一個元件，
// 兩頁的差異用 props 表達，不複製程式碼。從首頁 KnowledgeGraphPanel.vue 抽出來（第一步：
// 行為完全不變），排版選項、互動控制在後續步驟加上。
// 純邏輯（推導邊、顏色、三層排版的力）放在同目錄的 .ts 模組，附 vitest 單元測試。

const props = defineProps<{
  data: GraphDto
  colorMode: 'type' | 'overlay'
  typeFilter: Record<GraphNodeType, boolean>
  showIndirect: boolean
}>()

const emit = defineEmits<{ indirectCount: [count: number] }>()

const container = ref<HTMLDivElement>()
// settling 蓋「畫布已經掛上去、力導向模擬還在跑」這段——力學收斂到位（onEngineStop 第一次
// 觸發）前，節點會經過一段跟設計排版對不上的中間過程（真實跑起來實測：92 條邊、
// 16+35+5 個節點時要跑約 10 幾秒才收斂），直接曝露會被誤認成排版壞了。用霧面
// 遮罩蓋住這段而不是整個藏起來，讓使用者看得出「畫面正在動、還沒定」而不是空白。
const settling = ref(true)

const { theme } = useTheme()

let graph: ForceGraph<SimNode, SimLink> | undefined
let resizeObserver: ResizeObserver | undefined
let width = 900
let height = 460

function css(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}
function isDark(): boolean {
  return document.documentElement.classList.contains('theme-terminal')
}
function typeColor(type: GraphNodeType): string {
  return css(`--node-${type === 'documentation' ? 'doc' : type === 'technique' ? 'tech' : 'impl'}`)
}

const OVERLAY_WINDOW_END = Date.now()

// 顯示層篩選：點某一層的按鈕讓那層維持正常清晰度，其餘層淡化（不是完全隱藏）
// ——不選任何一層時視為「全部一樣清楚」，是預設狀態。純粹是渲染時的透明度
// 判斷，不重跑力學模擬，跟 hover highlight 共用同一套「dim 到 0.22」的視覺
// 語言，讓使用者不用學兩套淡化邏輯。
function isAnyTypeFilterActive(): boolean {
  return props.typeFilter.documentation || props.typeFilter.technique || props.typeFilter.implementation
}
function isTypeFilterDimmed(type: GraphNodeType): boolean {
  return isAnyTypeFilterActive() && !props.typeFilter[type]
}
// 邊的兩端都要在被選的層裡才不淡化——只要有一端連到沒被選的層，就算另一端
// 是被選的層，這條邊也要跟著淡化（使用者明確要求：選了某層之後，連到其他
// 層的邊也要淡，不是只淡沒被選的節點本身）。
function isLinkFilterDimmed(l: SimLink): boolean {
  if (!isAnyTypeFilterActive()) return false
  const sType = typeof l.source === 'object' ? l.source.domainType : undefined
  const tType = typeof l.target === 'object' ? l.target.domainType : undefined
  const sOk = sType != null && props.typeFilter[sType]
  const tOk = tType != null && props.typeFilter[tType]
  return !(sOk && tOk)
}

// 節點顏色模式：依類型（分類色）／依建立時間（VOSviewer overlay 視覺語言——顏色
// 改成連續變數，這裡唯一有的連續變數是 Implementation 的真實 git_repo_created_at；
// Documentation/Technique 完全沒有這個欄位，誠實顯示成灰色「無資料」，不是編一個
// 假的時間。注意這是「repo 建立時間」不是「最近活動時間」，不誇大成「熱度」。
function nodeColorFor(n: SimNode): string {
  if (props.colorMode === 'type') return typeColor(n.domainType)
  if (!n.createdAt) return css('--overlay-nodata') || '#9a9186'
  return viridis(recencyScore(n.createdAt, OVERLAY_WINDOW_END))
}

const radiusFor = (n: SimNode) => 4.5 + Math.min(n.degree, 8) * 1.1

// hover 高亮鄰居：用 module 層級的一般變數（不是 ref）存目前 hover 的節點 id：這個值只有
// canvas 畫圖迴圈跟滑鼠事件會讀寫，不需要 Vue 響應式，用 forceRedraw() 手動觸發重畫就夠。
let hoveredNodeId: string | null = null
// 固定選取（front#110，2026-10-02 使用者選 A）：hover 一移開就恢復，手機又沒有 hover，
// 所以點一下節點就把高亮固定住，點空白處或再點同一個節點才取消。固定選取時 hover
// 別的節點是暫時預覽，移開回到固定選取的狀態——實際拿來判斷亮誰的是 focusId()。
let pinnedNodeId: string | null = null
function focusId(): string | null {
  return hoveredNodeId ?? pinnedNodeId
}
let neighborIds = new Map<string, Set<string>>()
// 只算直接關係的鄰居。間接關聯的虛線關掉時（預設），hover 只亮直接相連的節點——
// 不然會亮起一堆畫面上看不到連線的節點
let directNeighborIds = new Map<string, Set<string>>()

// 間接關聯（推算出來的虛線）預設不顯示，免得畫面太雜；使用者自己打開才畫
// （2026-09-30 使用者決定）。只影響畫不畫、hover 亮誰，不影響力模擬，所以切換時
// 節點位置不會跳動。autoPauseRedraw(false) 讓畫面每幀重畫，改這個值下一幀就生效
function currentNeighbors(): Map<string, Set<string>> {
  return props.showIndirect ? neighborIds : directNeighborIds
}

// 雷達跳動：只在滑鼠真的 hover 到節點時，從節點邊緣往外擴散一圈淡出的圓環，像雷達／
// 聲納的回波——是互動回饋，不是背景裝飾。hoverPingStartTime 記錄這次 hover 開始的時間；
// onNodeHover 換人時（含離開時設回 null）才重設，同一個節點持續 hover 時圈圈會不斷循環擴散。
const RADAR_PING_PERIOD_MS = 1400
const RADAR_PING_MAX_EXPAND = 16
let hoverPingStartTime: number | null = null

function linkTouchesFocus(l: SimLink): boolean {
  const id = focusId()
  return id != null && (endpointId(l.source) === id || endpointId(l.target) === id)
}
function isDimmedNode(id: string): boolean {
  const focus = focusId()
  if (!focus) return false
  if (id === focus) return false
  return !currentNeighbors().get(focus)?.has(id)
}
function derivedStrength(l: SimLink): number {
  return derivedStrengthOf(l.via?.length, typeof l.source === 'object' ? l.source.domainType : undefined)
}
// hover 或固定選取中：跟該節點有直接關聯的邊提亮成 accent 色，其餘淡化。「顯示層」篩選
// 同時開著時取聯集：連到被篩掉那層的邊，就算碰到選取節點也一樣淡化。
// 沒有 hover／固定選取時：推導邊用 --accent-secondary（淺色黃銅、深色玫瑰）加虛線，跟灰色
// 實線的直接關係分開；透明度再依 derivedStrength() 分級，共用鄰居越多越明顯。
function linkDisplayColor(l: SimLink): string {
  const filterDimmed = isLinkFilterDimmed(l)
  if (focusId()) {
    return linkTouchesFocus(l) && !filterDimmed ? css('--text-accent') : withAlpha(css('--edge-real'), 0.18)
  }
  if (l.derived) {
    const base = 0.6 + 0.4 * derivedStrength(l)
    return withAlpha(css('--accent-secondary'), filterDimmed ? base * 0.3 : base)
  }
  return filterDimmed ? withAlpha(css('--edge-real'), 0.22) : css('--edge-real')
}

// 節點是否要「常駐」烤字在圖上：文件／實作筆數少，每個標題都有意義，全部
// 烤字；技術筆數比較多、又跟其他兩層疊在同一區，全部烤字會擠成一片，改成只烤
// degree>=5 的樞紐節點（比如 PHP、Laravel、Vue），其餘留白圈，靠圖例色＋
// shouldRenderLabel() 的 hover 動態顯示辨識（selective labeling）。
function shouldLabelNode(n: SimNode): boolean {
  if (n.domainType !== 'technique') return true
  return n.degree >= 5
}

// 實際畫字時用的判斷：在 shouldLabelNode() 的常駐清單之外，hover 到的節點
// 本身跟它的直接鄰居也臨時秀出 label。
function shouldRenderLabel(n: SimNode): boolean {
  if (shouldLabelNode(n)) return true
  const focus = focusId()
  if (n.id === focus) return true
  return focus != null && (currentNeighbors().get(focus)?.has(n.id) ?? false)
}

const measureCtx = document.createElement('canvas').getContext('2d')!
const LABEL_FONT = '500 10.5px system-ui, sans-serif'
function labelWidth(n: SimNode): number {
  if (!shouldLabelNode(n)) return 0
  measureCtx.font = LABEL_FONT
  return measureCtx.measureText(n.label).width
}

let layerTargetsCache: LayerTargets | undefined
function recomputeLayerTargets() {
  layerTargetsCache = layerTargets(width, height, countByType(simNodes))
}

let simNodes: SimNode[] = []

// 最終安全網：不管前面的力有沒有把節點(含標籤)收在畫布內，這裡直接把座標夾回
// 邊界，保證畫面上不會有節點或字被裁到畫布外。標籤畫在節點下方，下邊界要多
// 留文字高度的空間，左右邊界用量出來的實際字寬（不是猜一個固定緩衝值）。
function clampAllNodes() {
  for (const n of simNodes) {
    if (n.x == null || n.y == null) continue
    const r = radiusFor(n)
    const target = layerTargetsCache?.[n.domainType]
    if (target) clampToLayer(n, target, r)
    const padX = Math.max(r + 4, labelWidth(n) / 2 + 4)
    const padBottom = shouldLabelNode(n) ? r + 20 : r + 4
    n.x = Math.max(padX, Math.min(width - padX, n.x!))
    n.y = Math.max(r + 4, Math.min(height - padBottom, n.y!))
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
  link: GraphNodeLink | null
  left: number
  top: number
}
const popover = reactive<PopoverState>({ open: false, kind: '', title: '', rows: [], link: null, left: 0, top: 0 })

function openPopover(kind: 'node' | 'link', obj: SimNode | SimLink, ev: MouseEvent) {
  if (kind === 'node') {
    const n = obj as SimNode
    popover.kind = TYPE_LABEL[n.domainType]
    popover.title = n.label
    popover.rows = [`共 ${n.degree} 條直接關係`]
    if (n.createdAt) popover.rows.push(`GitHub 上建立於 ${n.createdAt}`)
    popover.link = graphNodeLink(n)
  } else {
    const l = obj as SimLink
    popover.link = null
    const s = typeof l.source === 'object' ? l.source.label : l.source
    const t = typeof l.target === 'object' ? l.target.label : l.target
    if (l.derived) {
      const viaLabels = (l.via ?? []).map((id) => simNodes.find((n) => n.id === id)?.label ?? id).join('、')
      popover.kind = '間接關聯'
      popover.title = `${String(s)} ↔ ${String(t)}`
      popover.rows = [`兩邊都連到「${viaLabels}」`, '這是推算出來的，不是直接關係']
    } else if (typeof l.source === 'object' && typeof l.target === 'object') {
      // 不顯示英文述詞：用兩端的類別講成一句話（見 graphRelationPhrase.ts）
      const phrase = relationPhrase(l.source, l.target)
      popover.kind = '直接關係'
      popover.title = phrase.sentence
      popover.rows = phrase.note ? [phrase.note] : []
    }
  }
  // force-graph 的 onNodeClick/onLinkClick 回呼給的 MouseEvent 是套件內部處理過的，
  // ev.currentTarget 不保證是畫布本身（實測是 null）——直接用 container ref 量對應的
  // stage 外框，不要假設事件物件帶著這個資訊。
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
watch(() => props.colorMode, () => forceRedraw())
watch(() => ({ ...props.typeFilter }), () => forceRedraw())

async function boot() {
  await nextTick()
  if (!container.value) return
  const dto = props.data

  const degree = new Map<string, number>()
  for (const e of dto.edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }

  width = container.value.clientWidth || width
  height = container.value.clientHeight || height

  const targets0 = layerTargets(width, height, countByType(dto.nodes.map((n) => ({ domainType: n.type }))))
  simNodes = dto.nodes.map((n) => {
    const target = targets0[n.type]
    return {
      id: n.id,
      domainType: n.type,
      label: n.label,
      degree: degree.get(n.id) ?? 0,
      createdAt: n.created_at,
      subtype: n.subtype ?? null,
      url: n.url ?? null,
      x: target.cx + (Math.random() - 0.5) * 24,
      y: target.cy + (Math.random() - 0.5) * 24,
    }
  })
  const simLinks: SimLink[] = dto.edges.map((e) => ({
    source: e.source,
    target: e.target,
    predicate: e.predicate,
  })) as SimLink[]
  // 同類別節點透過共同鄰居推導出來的關聯（見 derivedEdges.ts 檔頭註解）
  const derivedLinks: SimLink[] = computeDerivedEdges(simNodes, simLinks)
  emit('indirectCount', derivedLinks.length)
  const allLinks: SimLink[] = [...simLinks, ...derivedLinks]

  // 三層各自的目標中心點/範圍半徑要先算好，clampAllNodes()／layerBoundaryForce
  // 才有東西可以夾——依賴 simNodes 已經建立（拿得到各類別實際筆數）。
  recomputeLayerTargets()

  // hover highlight 的鄰居關係涵蓋真實邊＋推導邊：推導邊本來就是想讓「同類別
  // 但透過中介間接相關」這件事被看見，hover 時理當也要能問到這層關係。
  neighborIds = new Map()
  for (const l of allLinks) {
    const s = endpointId(l.source)
    const t = endpointId(l.target)
    if (!neighborIds.has(s)) neighborIds.set(s, new Set())
    if (!neighborIds.has(t)) neighborIds.set(t, new Set())
    neighborIds.get(s)!.add(t)
    neighborIds.get(t)!.add(s)
  }
  directNeighborIds = new Map()
  for (const l of simLinks) {
    const s = endpointId(l.source)
    const t = endpointId(l.target)
    if (!directNeighborIds.has(s)) directNeighborIds.set(s, new Set())
    if (!directNeighborIds.has(t)) directNeighborIds.set(t, new Set())
    directNeighborIds.get(s)!.add(t)
    directNeighborIds.get(t)!.add(s)
  }

  graph = new ForceGraph<SimNode, SimLink>(container.value)
    .width(width)
    .height(height)
    .backgroundColor('rgba(0,0,0,0)')
    .graphData({ nodes: simNodes, links: allLinks })
    .nodeId('id')
    .nodeLabel((n) => `${TYPE_LABEL[n.domainType]} · ${n.label}`)
    // 三層各自的範圍畫成底圖（節點/邊之前先畫，才不會蓋到前景）：畫一圈該類別
    // 自己顏色的虛線圓框。原本還有一條貫穿三層中心的黃銅色虛線（「Z 軸」），2026-10-01
    // 使用者決定拿掉：訪客看不懂、跟 hover 的 accent 撞色。
    .onRenderFramePre((ctx) => {
      if (!layerTargetsCache) return
      for (const type of DEPTH_ORDER) {
        const target = layerTargetsCache[type]
        ctx.save()
        ctx.beginPath()
        ctx.arc(target.cx, target.cy, target.r, 0, 2 * Math.PI)
        ctx.setLineDash([3, 4])
        ctx.lineWidth = 1.3
        ctx.strokeStyle = withAlpha(typeColor(type), 0.5)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }
    })
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject((n, ctx, globalScale) => {
      const x = n.x ?? 0
      const y = n.y ?? 0
      const r = radiusFor(n)
      const dim = isDimmedNode(n.id) || isTypeFilterDimmed(n.domainType)
      ctx.save()
      // hover 到別的節點時，跟它沒有直接關聯的節點淡化（globalAlpha 統一蓋掉
      // 底下所有畫法，不用個別改 fillStyle/strokeStyle 的透明度）。
      ctx.globalAlpha = dim ? 0.22 : 1
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
      const focused = n.id === focusId()
      ctx.lineWidth = focused ? 2 : 1
      ctx.strokeStyle = focused ? css('--text-accent') : isDark() ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.38)'
      ctx.stroke()
      // 雷達跳動：只有目前真的被 hover 的節點才畫，兩圈相位錯開半個週期。
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
      if (shouldRenderLabel(n)) {
        const fontPx = 10.5
        ctx.font = `500 ${fontPx / globalScale}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = css('--text-ink-body')
        ctx.fillText(n.label, x, y + r + 3.5 / globalScale)
      }
      ctx.restore()
    })
    .nodePointerAreaPaint((n, color, ctx) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(n.x ?? 0, n.y ?? 0, radiusFor(n) + 2, 0, 2 * Math.PI)
      ctx.fill()
    })
    .linkColor((l) => linkDisplayColor(l))
    // 真實邊寬度 1.5：三層疊圖之後線條密度變高，太細會糊成一片。
    .linkWidth((l) =>
      linkTouchesFocus(l) && !isLinkFilterDimmed(l) ? 2.2 : l.derived ? 1.2 + 0.8 * derivedStrength(l) : 1.5,
    )
    // 推導邊用虛線跟真實邊區分開來——這是唯一負責「這條線是不是資料庫真實關聯」
    // 這件事的視覺線索，顏色/寬度只負責亮不亮。
    .linkLineDash((l) => (l.derived ? [5, 4] : null))
    .linkVisibility((l) => !l.derived || props.showIndirect)
    .linkLabel((l) => {
      const s = typeof l.source === 'object' ? l.source.label : l.source
      const t = typeof l.target === 'object' ? l.target.label : l.target
      if (l.derived) {
        const viaLabels = (l.via ?? []).map((id) => simNodes.find((n) => n.id === id)?.label ?? id).join('、')
        return `${s} ↔ ${t}：間接關聯，兩邊都連到「${viaLabels}」（推算出來的，不是直接關係）`
      }
      if (typeof l.source !== 'object' || typeof l.target !== 'object') return ''
      const phrase = relationPhrase(l.source, l.target)
      return phrase.note ? `${phrase.sentence}：${phrase.note}` : phrase.sentence
    })
    // 箭頭只在 hover／固定選取到端點節點時才畫；推導邊沒有方向性，不畫箭頭。
    .linkDirectionalArrowLength((l) => (!l.derived && linkTouchesFocus(l) && !isLinkFilterDimmed(l) ? 5 : 0))
    .linkDirectionalArrowRelPos(0.96)
    .linkDirectionalArrowColor((l) => linkDisplayColor(l))
    .enableNodeDrag(false)
    .enableZoomInteraction(false)
    .enablePanInteraction(false)
    // 點節點：固定選取並打開內容卡；再點同一個節點取消固定選取並收起卡片。
    // 點空白處：取消固定選取、收起卡片。觸控裝置的點一下也走這裡，手機才看得到高亮。
    .onNodeClick((n, ev) => {
      if (pinnedNodeId === n.id) {
        pinnedNodeId = null
        popover.open = false
        // 觸控點一下之後，force-graph 會把手指最後的位置一直當成 hover 中（沒有「移開」
        // 這回事），不清掉的話取消固定選取後畫面還是亮著。滑鼠不用清：游標還停在節點上，
        // 顯示 hover 預覽是對的。
        if ((ev as PointerEvent).pointerType !== 'mouse') {
          hoveredNodeId = null
          hoverPingStartTime = null
        }
      } else {
        pinnedNodeId = n.id
        openPopover('node', n, ev)
      }
      forceRedraw()
    })
    .onLinkClick((l, ev) => openPopover('link', l, ev))
    .onBackgroundClick(() => {
      pinnedNodeId = null
      popover.open = false
      forceRedraw()
    })
    .onNodeHover((n) => {
      const nextId = n?.id ?? null
      if (nextId === hoveredNodeId) return
      hoveredNodeId = nextId
      hoverPingStartTime = nextId != null ? Date.now() : null
      if (container.value) container.value.style.cursor = n ? 'pointer' : 'default'
      forceRedraw()
    })
    // layerGravity 把每一層的節點溫和拉向自己那層的目標中心點；layerBoundary 是超出範圍時的
    // 軟修正。charge/collide 在範圍內還是能自然撐開、均勻分佈。
    .d3Force('boundary', boundaryForce<SimNode>(() => width, () => height, 30))
    .d3Force('layerGravity', layerGravityForce<SimNode>(() => layerTargetsCache, 0.06))
    .d3Force('layerBoundary', layerBoundaryForce<SimNode>(() => layerTargetsCache, radiusFor))
    .d3Force('collide', forceCollide<SimNode>((n) => radiusFor(n) + (shouldLabelNode(n) ? 26 : 3)).iterations(2))
    .cooldownTicks(300)
    // hover 雷達跳動要每一幀重繪。
    .autoPauseRedraw(false)
    .onEngineStop(() => {
      clampAllNodes()
      graph?.zoomToFit(0, framePadding())
      settling.value = false
    })
  graph.d3Force('charge')?.strength(-130)
  graph.d3Force('link')?.distance(58)
  // 跨類別的邊(specs／uses)是「層間對齊力」：力道刻意比同類別邊(強度 1)弱很多，不能蓋掉
  // layerGravity 想維持的「每層仍是可辨識的一團」。推導邊力道更弱：一項熱門技術可能讓一大群
  // Implementation 兩兩之間都冒出推導邊，強度太高會讓這群節點糊成一坨。
  graph.d3Force('link')?.strength((l: SimLink) => {
    if (l.derived) return 0.35
    const st = typeof l.source === 'object' ? l.source.domainType : undefined
    const tt = typeof l.target === 'object' ? l.target.domainType : undefined
    return st && tt && st === tt ? 1 : 0.4
  })
  // 內建 center force 預設拉向 (0,0)，明確覆寫成畫布中心。
  graph.d3Force('center')?.x(width / 2).y(height / 2)

  resizeObserver = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width
    const h = entries[0]?.contentRect.height
    if (w && h && graph) {
      width = w
      height = h
      graph.width(w).height(h)
      // 寬高變了，center force 與三層的目標中心點/範圍半徑都要跟著更新。
      graph.d3Force('center')?.x(width / 2).y(height / 2)
      recomputeLayerTargets()
      clampAllNodes()
      graph.zoomToFit(0, framePadding())
    }
  })
  resizeObserver.observe(container.value)
}

onMounted(() => {
  boot()
})
onUnmounted(() => {
  resizeObserver?.disconnect()
  graph?._destructor?.()
})
</script>

<template>
  <div
    class="kg-stage relative rounded-xl border border-(--border-shelf) shadow-[0_12px_32px_color-mix(in_srgb,var(--bg-nav-footer)_14%,transparent)] overflow-hidden h-[460px]"
    :style="{
      background: 'var(--canvas-bg)',
      backgroundImage: 'radial-gradient(var(--canvas-dot) 1.3px, transparent 1.3px)',
      backgroundSize: '22px 22px',
    }"
  >
    <div ref="container" class="w-full h-full" />

    <div
      class="kg-settling absolute inset-0 z-[5] flex items-end justify-center pb-5 backdrop-blur-sm bg-(--bg-paper-light)/50 transition-opacity duration-700"
      :class="settling ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <span class="text-[13px] text-(--text-ink-body)/70"> 節點排列中… </span>
    </div>

    <div
      class="popover absolute min-w-[220px] max-w-[280px] rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) px-4 py-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--bg-nav-footer)_14%,transparent)] transition-[opacity,transform] duration-150 z-10"
      :class="popover.open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-1.5 pointer-events-none'"
      :style="{ left: popover.left + 'px', top: popover.top + 'px' }"
    >
      <button
        type="button"
        class="absolute top-0.5 right-0.5 w-9 h-9 flex items-center justify-center rounded-lg text-(--text-ink-muted) hover:text-(--text-ink-body) text-base leading-none cursor-pointer"
        aria-label="關閉"
        @click="popover.open = false"
      >
        ×
      </button>
      <div class="text-[13px] tracking-[0.05em] text-(--text-ink-muted) mb-1">
        {{ popover.kind }}
      </div>
      <h3 class="text-[15.5px] font-bold text-(--text-ink-main) mb-2 leading-tight">{{ popover.title }}</h3>
      <div v-for="(row, i) in popover.rows" :key="i" class="text-[12.5px] text-(--text-ink-body) mb-0.5">
        {{ row }}
      </div>
      <RouterLink
        v-if="popover.link?.kind === 'internal'"
        :to="popover.link.to"
        class="inline-flex items-center min-h-11 -mb-2 pr-3 text-[14px] text-(--text-accent) hover:underline"
        >{{ popover.link.text }}</RouterLink
      >
      <a
        v-else-if="popover.link?.kind === 'external'"
        :href="popover.link.href"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center min-h-11 -mb-2 pr-3 text-[14px] text-(--text-accent) hover:underline"
        >{{ popover.link.text }}</a
      >
    </div>
  </div>
</template>
