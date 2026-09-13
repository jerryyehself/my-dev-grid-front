<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ForceGraph, { type NodeObject, type LinkObject } from 'force-graph'
import { forceCollide } from 'd3-force'
import { fetchGraphOrDemo, type GraphNodeType } from '@/api/graph'
import { useTheme } from '@/composables/useTheme'

// 首頁知識網路小工具：只看、不深挖（拖曳留給 /graph 頁），用真實
// GET /api/graph 資料畫「文件 → 技術 → 實作」三層等角疊層排版。
//
// 排版沿革（2026-09-11 兩次改版紀錄）：
// 第一版跟 /graph 頁 GraphPoc2D.vue 一樣把三層擺在圓周上三個等角度中心點，
// 各自用一個圓形範圍圍起來——問題是三層筆數差距懸殊(Documentation 5、
// Technique 35、Implementation 16)，圓心散在圓周上不同位置，三層完全沒有
// 共同的參照中心，看起來像三張各自漂浮的圖。
// 第二版改成三層垂直堆疊成橫向色帶（Documentation 在上、Technique 中間、
// Implementation 在下）——這其實是把同一個問題換了個方向重犯：色帶把整個
// 畫布高度切成互不重疊的三段，三層的「垂直中心」還是散落在完全不同的 Y
// 座標上，本質上只是「用 Y 軸堆」而不是使用者要的「Z 軸貫穿」，被使用者
// 當場指出來。
//
// 第三版（目前版本）才是真正對應「Z 軸貫穿所有圖層中心」的做法：借鏡
// muxViz／Kivelä 等人慣用的多層網路等角疊層畫法（透明圖層前後疊放，
// 同一條軸貫穿所有圖層），以及 Rossi & Magnani 的 multiforce layout
// ("A Generalized Force-Directed Layout for Multiplex Sociograms",
// arXiv:1607.03914)——三層各自的力學目標中心點都是「畫布中心 + 一個沿同一
// 條對角線方向的小幅度固定位移」（見 depthOffset()）：Documentation 位移到
// 左上（最靠後）、Technique 不位移（在共用中心本身）、Implementation 位移到
// 右下（最靠前）。位移量刻意遠小於每一層自己的節點範圍半徑，讓三層的節點雲
// 大部分互相重疊——這才是「疊」在一起，不是分開排列；三個位移後的中心點連
// 成一條直線，恰好通過共用中心，這條線就是概念上的 Z 軸，onRenderFramePre
// 裡會把這條軸線實際畫出來，不是只讓使用者腦補。這是 2D canvas 上模擬「疊
// 圖」的視覺手法，不是真的 3D（專案的 /graph 頁另外有 GraphPoc3D.vue 可做
// 真的 3D，這裡刻意選 2D 的堆疊視覺，跟使用者確認過，見 D 版對話）。
//
// 我們的三層節點集合互不相同，沒有「同一個實體跨層對齊」這種 multiforce
// 原始論文情境可以用，所以「層間對齊」改用「真實跨型別關聯(specs/uses 這類)
// 拉著彼此相關的節點在座標上盡量靠近」（見 boot() 內的 link strength 說明）
// 取代；同型別的力(charge/collide+同型別關聯)繼續各自定型每一層的內部結構。
// 分類法/技術參考另見 McGee, Ghoniem, Melançon, Otjacques, Pinaud,
// "The State of the Art in Multilayer Network Visualization"
// (Computer Graphics Forum 2019, arXiv:1902.06815)。

interface SimNode extends NodeObject {
  id: string
  domainType: GraphNodeType
  label: string
  degree: number
  createdAt: string | null
}
interface SimLink extends LinkObject<SimNode> {
  predicate: string | null
  // 推導邊（bipartite projection，見 computeDerivedEdges()）專用欄位：
  // derived 標記這條邊不是資料庫真實關聯；via 記錄促成這條推導關係的共同
  // 鄰居 id，用在 tooltip/popover 上讓使用者看得懂「為什麼這兩個算相關」。
  derived?: boolean
  via?: string[]
}

const sectionRef = ref<HTMLElement>()
// 進場動畫：整個 panel 捲入可視範圍才淡入＋輕微上移，而不是頁面一載入就播放——
// 這個 panel 常常在首頁往下捲一段才看得到，載入當下播放使用者根本看不到，
// 等真正捲到才播放才有意義。只播一次，看過一次之後就不用每次捲進捲出都重播。
const entered = ref(false)
let entranceObserver: IntersectionObserver | undefined

const container = ref<HTMLDivElement>()
const loading = ref(true)
// loading 蓋「API 資料還沒回來」這段（畫布連掛都還沒掛上去）；settling 另外蓋
// 「畫布已經掛上去、力導向模擬還在跑」這段——力學收斂到位（onEngineStop 第一次
// 觸發）前，節點會經過一段跟設計排版對不上的中間過程（真實跑起來實測：92 條邊、
// 16+35+5 個節點時要跑約 10 幾秒才收斂），直接曝露會被誤認成排版壞了。用霧面
// 遮罩蓋住這段而不是整個藏起來，讓使用者看得出「畫面正在動、還沒定」而不是空白。
const settling = ref(true)
const isDemoData = ref(false)
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
// 顯示層篩選：點某一層的按鈕讓那層維持正常清晰度，其餘層淡化（不是完全隱藏）
// ——不選任何一層時視為「全部一樣清楚」，是預設狀態。純粹是渲染時的透明度
// 判斷，不重跑力學模擬，跟 hover highlight 共用同一套「dim 到 0.22」的視覺
// 語言，讓使用者不用學兩套淡化邏輯。
const typeFilter = reactive<Record<GraphNodeType, boolean>>({
  documentation: false,
  technique: false,
  implementation: false,
})
function isAnyTypeFilterActive(): boolean {
  return typeFilter.documentation || typeFilter.technique || typeFilter.implementation
}
function toggleTypeFilter(type: GraphNodeType) {
  typeFilter[type] = !typeFilter[type]
  forceRedraw()
}
function isTypeFilterDimmed(type: GraphNodeType): boolean {
  return isAnyTypeFilterActive() && !typeFilter[type]
}
// 邊的兩端都要在被選的層裡才不淡化——只要有一端連到沒被選的層，就算另一端
// 是被選的層，這條邊也要跟著淡化（使用者明確要求：選了某層之後，連到其他
// 層的邊也要淡，不是只淡沒被選的節點本身）。
function isLinkFilterDimmed(l: SimLink): boolean {
  if (!isAnyTypeFilterActive()) return false
  const sType = typeof l.source === 'object' ? l.source.domainType : undefined
  const tType = typeof l.target === 'object' ? l.target.domainType : undefined
  const sOk = sType != null && typeFilter[sType]
  const tOk = tType != null && typeFilter[tType]
  return !(sOk && tOk)
}

const colorMode = ref<'type' | 'overlay'>('type')
function nodeColorFor(n: SimNode): string {
  if (colorMode.value === 'type') return typeColor(n.domainType)
  if (!n.createdAt) return css('--overlay-nodata') || '#9a9186'
  return viridis(recencyScore(n.createdAt))
}

const radiusFor = (n: SimNode) => 4.5 + Math.min(n.degree, 8) * 1.1

// 高權重節點的呼吸發光：套用 base.css .beacon-dot/beacon-breathe 同一套視覺節奏
// （2.6 秒、opacity 1 ↔ 0.55、ease-in-out），但這裡是畫在 canvas 上的節點，不是
// DOM 元素，沒辦法直接套用那個 CSS class/@keyframes，改成在 nodeCanvasObject 裡
// 用時間算出目前的透明度，數值刻意跟 CSS 版本對齊，讓兩處視覺上是同一顆「呼吸中
// 的燈」。用餘弦函數模擬 ease-in-out：t=0(週期起點)值最大、t=0.5(半週期)值最小。
const BEACON_BREATHE_PERIOD_MS = 2600
function beaconBreatheOpacity(): number {
  const t = (Date.now() % BEACON_BREATHE_PERIOD_MS) / BEACON_BREATHE_PERIOD_MS
  return 0.775 + 0.225 * Math.cos(2 * Math.PI * t)
}
// 「高權重」＝真實關聯數(degree)相對於這張圖裡最高 degree 的比例達到門檻——
// 跟 /graph 頁 GraphPoc2D.vue 的 weight > 0.6「core 節點」用同一個 0.6 門檻，
// 只是我們沒有預先正規化好的 weight 欄位，改用 degree/maxDegree 現算。
let maxDegree = 0
function isHighWeightNode(n: SimNode): boolean {
  return maxDegree > 0 && n.degree / maxDegree >= 0.6
}

// hover 高亮鄰居：拖曳／縮放留給 /graph 頁深挖，但「看清楚一個節點跟誰有關聯」
// 不需要那麼重的互動——hover 就能問「這個節點連到哪裡」，是靜態圖跟完整拖曳
// 探索之間的中間地帶。用 module 層級的一般變數（不是 ref）存目前 hover 的
// 節點 id：這個值只有 canvas 畫圖迴圈跟滑鼠事件會讀寫，不需要 Vue 響應式，
// 用 forceRedraw() 手動觸發重畫就夠。
let hoveredNodeId: string | null = null
let neighborIds = new Map<string, Set<string>>()

function endpointId(x: string | number | SimNode | undefined): string {
  if (x == null) return ''
  return typeof x === 'object' ? x.id : String(x)
}
function linkTouchesHovered(l: SimLink): boolean {
  return hoveredNodeId != null && (endpointId(l.source) === hoveredNodeId || endpointId(l.target) === hoveredNodeId)
}
function isDimmedNode(id: string): boolean {
  if (!hoveredNodeId) return false
  if (id === hoveredNodeId) return false
  return !neighborIds.get(hoveredNodeId)?.has(id)
}
function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}
// hover 中：跟被 hover 節點有直接關聯的邊提亮成 accent 色，其餘淡化。
// 沒有 hover 時：推導邊（見 computeDerivedEdges）用比真實邊更淡的顏色，
// 搭配虛線讓「這條線是算出來的、不是資料庫真實關聯」一眼看得出來；淡度本身
// 再依 derivedStrength() 分級，共用鄰居越多顏色越接近真實邊。
function linkDisplayColor(l: SimLink): string {
  if (hoveredNodeId) return linkTouchesHovered(l) ? css('--text-accent') : withAlpha(css('--edge-real'), 0.18)
  const filterDimmed = isLinkFilterDimmed(l)
  if (l.derived) {
    const base = 0.28 + 0.42 * derivedStrength(l)
    return withAlpha(css('--edge-real'), filterDimmed ? base * 0.4 : base)
  }
  return filterDimmed ? withAlpha(css('--edge-real'), 0.22) : css('--edge-real')
}

// 節點是否要「常駐」烤字在圖上：文件／實作筆數少，每個標題都有意義，全部
// 烤字；技術筆數比較多、又跟其他兩層疊在同一區，全部烤字會擠成一片(拿真實
// 資料庫實測過 degree 分布：35 個 technique 裡有 12 個 degree>=3，8 個
// degree>=5)，改成只烤 degree>=5 的樞紐節點（比如 PHP、Laravel、Vue），
// 其餘留白圈，靠圖例色＋下面 shouldRenderLabel() 的 hover 動態顯示辨識——
// 不是每個點都烤字（selective labeling），這是「常駐」的判斷，模擬過程中
// 的 collide 留白/座標夾限都依這個判斷分配空間，不會因為 hover 而變動。
function shouldLabelNode(n: SimNode): boolean {
  if (n.domainType !== 'technique') return true
  return n.degree >= 5
}

// 實際畫字時用的判斷：在 shouldLabelNode() 的常駐清單之外，hover 到的節點
// 本身跟它的直接鄰居也臨時秀出 label——想看某個冷門技術是什麼，不用等它自己
// 冒出標籤，滑過去或滑過跟它相關的節點就看得到。這裡沒有額外幫 hover 秀出的
// label 留 collide 空間，只是短暫互動時的臨時文字，容許偶爾跟旁邊節點疊到。
function shouldRenderLabel(n: SimNode): boolean {
  if (shouldLabelNode(n)) return true
  if (n.id === hoveredNodeId) return true
  return hoveredNodeId != null && (neighborIds.get(hoveredNodeId)?.has(n.id) ?? false)
}

const measureCtx = document.createElement('canvas').getContext('2d')!
const LABEL_FONT = '500 10.5px system-ui, sans-serif'
function labelWidth(n: SimNode): number {
  if (!shouldLabelNode(n)) return 0
  measureCtx.font = LABEL_FONT
  return measureCtx.measureText(n.label).width
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

interface LayerTarget {
  cx: number
  cy: number
  r: number
}

// 三層等角疊層的固定次序跟位移方向（見檔頭註解）：陣列索引 0/1/2 對應
// depthIndex -1/0/+1，Documentation 最靠後(左上)、Technique 是共用中心本身
// (不位移)、Implementation 最靠前(右下)。DEPTH_DX/DEPTH_DY 刻意抓得比每層
// 自己的節點範圍半徑小很多(見 layerTargets 的半徑算法)，讓三層節點雲大部分
// 互相重疊——這是跟先前色帶版本最本質的差異：色帶版位移量(整個畫布高度切三
// 段)遠大於每層範圍，三層完全不重疊；這裡的位移只是「同一團裡稍微偏一點」。
const DEPTH_ORDER: GraphNodeType[] = ['documentation', 'technique', 'implementation']
const DEPTH_DX = 68
const DEPTH_DY = 52
function depthIndexOf(type: GraphNodeType): number {
  return DEPTH_ORDER.indexOf(type) - 1
}
function depthOffset(type: GraphNodeType): { dx: number; dy: number } {
  const idx = depthIndexOf(type)
  return { dx: idx * DEPTH_DX, dy: idx * DEPTH_DY }
}

// 每層節點範圍半徑依節點數量開根號成長（面積跟數量成正比，是視覺上比較
// 均勻的分配方式，不是半徑直接跟數量成正比會讓多節點的層大得不成比例）；
// 加一個固定底限，節點數少的 Documentation 也有足夠空間展開跟容納標籤。
const MIN_LAYER_RADIUS = 108
const RADIUS_PER_SQRT_NODE = 20
function layerTargets(countByType: Record<GraphNodeType, number>): Record<GraphNodeType, LayerTarget> {
  const cx = width / 2
  const cy = height / 2
  const targets = {} as Record<GraphNodeType, LayerTarget>
  for (const type of DEPTH_ORDER) {
    const { dx, dy } = depthOffset(type)
    const count = countByType[type] ?? 0
    const r = MIN_LAYER_RADIUS + Math.sqrt(count) * RADIUS_PER_SQRT_NODE
    targets[type] = { cx: cx + dx, cy: cy + dy, r }
  }
  return targets
}

let layerTargetsCache: Record<GraphNodeType, LayerTarget> | undefined
function recomputeLayerTargets() {
  const countByType: Record<GraphNodeType, number> = { documentation: 0, technique: 0, implementation: 0 }
  for (const n of simNodes) countByType[n.domainType]++
  layerTargetsCache = layerTargets(countByType)
}

// 讓每一層的節點真的圍繞在自己那層的中心點附近(各自成一團可辨識的形狀)，
// 而不是被跨型別的 link 力硬拉到別層去——溫和的向心力，強度不高，讓
// charge/collide 在範圍內還是能自然撐開分佈，不會被拉成死板的一個點。
function layerGravityForce(targetsFn: () => Record<GraphNodeType, LayerTarget> | undefined, strength: number) {
  let nodes: SimNode[] = []
  const force = (alpha: number) => {
    const targets = targetsFn()
    if (!targets) return
    for (const n of nodes) {
      if (n.x == null || n.y == null) continue
      const target = targets[n.domainType]
      if (!target) continue
      n.vx = (n.vx ?? 0) + (target.cx - n.x) * strength * alpha
      n.vy = (n.vy ?? 0) + (target.cy - n.y) * strength * alpha
    }
  }
  force.initialize = (list: SimNode[]) => {
    nodes = list
  }
  return force
}

// 超出自己那層範圍半徑的節點溫和推回去——這是模擬過程中的軟力，最終保證
// 「節點真的沒有越界」的是下面 clampAllNodes() 裡疊加的硬夾限。
function layerBoundaryForce(targetsFn: () => Record<GraphNodeType, LayerTarget> | undefined) {
  let nodes: SimNode[] = []
  const force = () => {
    const targets = targetsFn()
    if (!targets) return
    for (const n of nodes) {
      if (n.x == null || n.y == null) continue
      const target = targets[n.domainType]
      if (!target) continue
      const r = radiusFor(n)
      const dx = n.x - target.cx
      const dy = n.y - target.cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = Math.max(4, target.r - r - 2)
      if (dist > maxDist && dist > 0) {
        const pull = (dist - maxDist) * 0.08
        n.vx = (n.vx ?? 0) - (dx / dist) * pull
        n.vy = (n.vy ?? 0) - (dy / dist) * pull
      }
    }
  }
  force.initialize = (list: SimNode[]) => {
    nodes = list
  }
  return force
}

let simNodes: SimNode[] = []

// 推導邊（bipartite network projection / one-mode projection，見
// https://en.wikipedia.org/wiki/Bipartite_network_projection）：這個 ontology
// 幾乎每條真實邊都是跨型別（文件指定技術、技術用在實作上，見 SaveReposDataService
// 註解），導致同型別節點之間完全沒有視覺連結——但兩個 Implementation 如果用了
// 同一項 Technique，或兩份 Documentation 指定了同一項 Technique，這種「同 scope
// 潛在關聯」在概念上是存在的，只是資料庫沒有這張表存這種關聯。
// 只投影 Documentation／Implementation 這兩種型別，刻意不含 Technique：
// Technique 自己就有真實的同型別關聯（entity_relations 的 requires，例如
// framework→base language），不需要這層推導；而且 Technique 節點常常是「一個
// repo 用了 10 種技術」這種高度數的中介，真的算過一輪就爆量——實測拿玩具資料
// 快照跑，含 Technique 會生出 53 條推導邊，拿掉之後剩 1 條，才是真的有意義的
// 訊號，不是雜訊。
//
// 門檻依型別而不同（不是全部用同一個數字）：拿真實資料庫（16 個 repo、
// 84 條 technique-implementation 連結）實測過，Implementation 只要「共用
// ≥1 項技術」就算數的話會冒出 60 條推導邊（120 種可能配對的一半，等於幾乎
// 每兩個 repo 都被判定相關，訊號被稀釋成雜訊）；改成「共用 ≥3 項技術」降到
// 21 條，扣掉本來就已經有真實關聯的配對後剩 18 條，數量跟訊噪比才合理。
// Documentation 目前每份文件通常只連到 1 項技術（見 SaveReposDataService
// 的 link_official_docs()），門檻拉到跟 Implementation 一樣高只會讓
// Documentation 永遠生不出任何推導邊，所以維持 ≥1。
const DERIVED_EDGE_MIN_SHARED: Partial<Record<GraphNodeType, number>> = {
  documentation: 1,
  implementation: 3,
}
function computeDerivedEdges(nodes: SimNode[], realLinks: SimLink[]): SimLink[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const neighbors = new Map<string, Set<string>>()
  // 已經有真實同型別關聯的配對記下來，等一下推導的時候跳過——真的知道的事實
  // 優先於算出來的猜測，不要疊床架屋(同一對節點又是實線又是虛線)。
  const realSameTypePairs = new Set<string>()
  for (const l of realLinks) {
    const s = endpointId(l.source)
    const t = endpointId(l.target)
    if (!neighbors.has(s)) neighbors.set(s, new Set())
    if (!neighbors.has(t)) neighbors.set(t, new Set())
    neighbors.get(s)!.add(t)
    neighbors.get(t)!.add(s)
    const sType = nodeById.get(s)?.domainType
    const tType = nodeById.get(t)?.domainType
    if (sType && tType && sType === tType) {
      realSameTypePairs.add(s < t ? `${s}|${t}` : `${t}|${s}`)
    }
  }

  const byType = new Map<GraphNodeType, SimNode[]>()
  for (const n of nodes) {
    if (!(n.domainType in DERIVED_EDGE_MIN_SHARED)) continue
    if (!byType.has(n.domainType)) byType.set(n.domainType, [])
    byType.get(n.domainType)!.push(n)
  }

  const derived: SimLink[] = []
  for (const [type, list] of byType) {
    const minShared = DERIVED_EDGE_MIN_SHARED[type]!
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!
        const b = list[j]!
        const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
        if (realSameTypePairs.has(pairKey)) continue
        const an = neighbors.get(a.id)
        const bn = neighbors.get(b.id)
        if (!an || !bn) continue
        const via = [...an].filter((id) => bn.has(id))
        if (via.length < minShared) continue
        derived.push({ source: a.id, target: b.id, predicate: null, derived: true, via })
      }
    }
  }
  return derived
}
// 推導邊的視覺強度依共同鄰居數量分級，不是所有推導邊一視同仁的同一種淡度——
// 這是 weighted one-mode projection 的概念（見 Zhou, Ren, Medo & Zhang,
// "Bipartite network projection and personal recommendation", Phys. Rev. E
// 76, 046115 (2007)）：共用越多異型別鄰居，關聯訊號越強，線條該越明顯。
// 0 對應該型別自己的門檻值(剛好壓線，最淡)，1 對應門檻值+3(明顯更強，封頂)——
// 各型別門檻不同(Documentation 1 / Implementation 3)，起點要跟著各自門檻走，
// 不能全部套用同一個絕對數字。
function derivedStrength(l: SimLink): number {
  const shared = l.via?.length ?? 1
  const type = typeof l.source === 'object' ? l.source.domainType : undefined
  const minShared = (type && DERIVED_EDGE_MIN_SHARED[type]) || 1
  return Math.min(1, Math.max(0, (shared - minShared) / 3))
}

// 最終安全網：不管前面的力有沒有把節點(含標籤)收在畫布內，這裡直接把座標夾回
// 邊界，保證畫面上不會有節點或字被裁到畫布外。標籤畫在節點下方，下邊界要多
// 留文字高度的空間，左右邊界用量出來的實際字寬（不是猜一個固定緩衝值）。
function clampAllNodes() {
  for (const n of simNodes) {
    if (n.x == null || n.y == null) continue
    const r = radiusFor(n)

    // 各層自己的範圍半徑也在這裡收尾：不管模擬過程中 layerBoundaryForce
    // 有沒有把力道打平衡，結算時每個節點都該落在自己型別的目標中心範圍內，
    // 三層才會真的看起來是各自可辨識的一團，不受彼此節點數量差距影響。
    const target = layerTargetsCache?.[n.domainType]
    if (target) {
      const dx = n.x - target.cx
      const dy = n.y - target.cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = Math.max(4, target.r - r - 2)
      if (dist > maxDist && dist > 0) {
        const scale = maxDist / dist
        n.x = target.cx + dx * scale
        n.y = target.cy + dy * scale
      }
    }

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
    if (l.derived) {
      const viaLabels = (l.via ?? []).map((id) => simNodes.find((n) => n.id === id)?.label ?? id).join('、')
      popover.kind = '推導關聯（虛線）'
      popover.title = `${String(s)} ↔ ${String(t)}`
      popover.rows = [`透過共同的「${viaLabels}」間接相關`, '不是資料庫裡的真實關聯，是算出來的']
    } else {
      popover.kind = 'Relation'
      popover.title = l.predicate ?? '(未命名關聯)'
      popover.rows = [String(s), `→ ${String(t)}`]
    }
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
  // fetchGraphOrDemo() 正常打真的 API；連不上時（單機展示沒開後端）才退回存好的
  // 資料快照，並且誠實回報 isDemo，畫面上要清楚標示這不是即時資料。
  const { dto, isDemo } = await fetchGraphOrDemo()
  isDemoData.value = isDemo
  loading.value = false
  await nextTick()
  if (!container.value) return

  const degree = new Map<string, number>()
  for (const e of dto.edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  }
  maxDegree = degree.size ? Math.max(...degree.values()) : 0

  width = container.value.clientWidth || width
  height = container.value.clientHeight || height

  stats.doc = dto.nodes.filter((n) => n.type === 'documentation').length
  stats.tech = dto.nodes.filter((n) => n.type === 'technique').length
  stats.impl = dto.nodes.filter((n) => n.type === 'implementation').length
  stats.edges = dto.edges.length

  const countByType0: Record<GraphNodeType, number> = { documentation: 0, technique: 0, implementation: 0 }
  for (const n of dto.nodes) countByType0[n.type]++
  const targets0 = layerTargets(countByType0)
  simNodes = dto.nodes.map((n) => {
    const target = targets0[n.type]
    return {
      id: n.id,
      domainType: n.type,
      label: n.label,
      degree: degree.get(n.id) ?? 0,
      createdAt: n.created_at,
      x: target.cx + (Math.random() - 0.5) * 24,
      y: target.cy + (Math.random() - 0.5) * 24,
    }
  })
  const simLinks: SimLink[] = dto.edges.map((e) => ({
    source: e.source,
    target: e.target,
    predicate: e.predicate,
  })) as SimLink[]
  // 首頁先行試作：同型別節點透過共同鄰居推導出來的關聯（見 computeDerivedEdges()
  // 檔頭註解），只加在這個 panel，/graph 頁完整探索頁先不動。
  const derivedLinks = computeDerivedEdges(simNodes, simLinks)
  const allLinks: SimLink[] = [...simLinks, ...derivedLinks]

  // 三層各自的目標中心點/範圍半徑要先算好，clampAllNodes()／layerBoundaryForce
  // 才有東西可以夾——依賴 simNodes 已經建立（拿得到各型別實際筆數）。
  recomputeLayerTargets()

  // hover highlight 的鄰居關係涵蓋真實邊＋推導邊：推導邊本來就是想讓「同型別
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

  graph = new ForceGraph<SimNode, SimLink>(container.value)
    .width(width)
    .height(height)
    .backgroundColor('rgba(0,0,0,0)')
    .graphData({ nodes: simNodes, links: allLinks })
    .nodeId('id')
    .nodeLabel((n) => `${typeLabel[n.domainType]} · ${n.label}`)
    // 三層各自的範圍畫成底圖（節點/邊之前先畫，才不會蓋到前景）：畫一圈該型別
    // 自己顏色的虛線圓框，讓「三層各自成一團、但大部分範圍重疊在一起」是看
    // 得見的設計，不用再腦補；型別是哪個看圓框顏色對照上面的色彩圖例就知道，
    // 不用在圓框旁邊另外浮一行文字——這行字先前跟節點 label 疊在同一個擁擠
    // 區，使用者反應「太混亂」，拿掉這個重複資訊來源比在旁邊硬塞文字更乾淨。
    // 貫穿三層中心的那條對角線再疊上去，這條線才是「Z 軸」本身的視覺化
    // （見檔頭註解的等角疊層說明）。
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
      // 貫穿三層共用中心的軸線：從最靠後那層的中心點畫到最靠前那層的中心點
      // （兩端各延伸一小段，讓軸線露出圓框外，看得出它真的貫穿整疊），這條
      // 線就是使用者要的「Z 軸」本身，不是只靠三個圓框重疊隱含。
      const back = layerTargetsCache[DEPTH_ORDER[0]!]
      const front = layerTargetsCache[DEPTH_ORDER[DEPTH_ORDER.length - 1]!]
      const dx = front.cx - back.cx
      const dy = front.cy - back.cy
      const len = Math.hypot(dx, dy) || 1
      const ext = 34
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(back.cx - (dx / len) * ext, back.cy - (dy / len) * ext)
      ctx.lineTo(front.cx + (dx / len) * ext, front.cy + (dy / len) * ext)
      ctx.setLineDash([3, 4])
      ctx.lineWidth = 1.5
      ctx.strokeStyle = withAlpha(css('--text-accent'), 0.5)
      ctx.stroke()
      ctx.restore()
    })
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject((n, ctx, globalScale) => {
      const x = n.x ?? 0
      const y = n.y ?? 0
      const r = radiusFor(n)
      const dim = isDimmedNode(n.id) || isTypeFilterDimmed(n.domainType)
      // hover 淡化／顯示層篩選中都暫停呼吸：被 dim 掉的節點不該還在那邊呼吸
      // 搶注意力；篩選器啟用時，被選中維持清晰的那層也暫停呼吸——不然同一層
      // 裡有呼吸、有不呼吸的節點，明暗週期不同時看起來會像「選中的顏色深淺
      // 不一」，跟篩選器想傳達的「這層很明確」互相矛盾。
      const breathing = !dim && !isAnyTypeFilterActive() && isHighWeightNode(n)
      const breathePhase = breathing ? beaconBreatheOpacity() : 1
      ctx.save()
      // hover 到別的節點時，跟它沒有直接關聯的節點淡化（globalAlpha 統一蓋掉
      // 底下所有畫法，不用個別改 fillStyle/strokeStyle 的透明度）。
      ctx.globalAlpha = dim ? 0.22 : breathePhase
      ctx.save()
      ctx.shadowColor = css('--node-shadow')
      // 呼吸發光的節點額外疊加隨呼吸節奏起伏的强度(仿 .beacon-dot 的
      // box-shadow 0 0 4px 1px currentColor ↔ 0 0 1px 0，用同一個相位算)。
      ctx.shadowBlur = breathing ? 7 + 6 * ((breathePhase - 0.55) / 0.45) : 7
      ctx.shadowOffsetY = 2
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.fillStyle = nodeColorFor(n)
      ctx.fill()
      ctx.restore()
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.lineWidth = n.id === hoveredNodeId ? 2 : 1
      ctx.strokeStyle =
        n.id === hoveredNodeId
          ? css('--text-accent')
          : isDark()
            ? 'rgba(255,255,255,0.16)'
            : 'rgba(255,255,255,0.38)'
      ctx.stroke()
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
    // 真實邊寬度從 1.1 拉到 1.5：三層疊圖之後線條密度變高，太細會糊成一片，
    // 跟 --edge-real 顏色對比度修正（見 variables.css 註解）一起處理「edge
    // 辨識度太低」的問題——顏色負責跟背景的對比，寬度負責跟其他線條的區分。
    .linkWidth((l) => (linkTouchesHovered(l) ? 2.2 : l.derived ? 0.6 + 0.6 * derivedStrength(l) : 1.5))
    // 推導邊(bipartite projection)用虛線跟真實邊區分開來——這是唯一負責
    // 「這條線是不是資料庫真實關聯」這件事的視覺線索，顏色/寬度只負責亮不亮。
    .linkLineDash((l) => (l.derived ? [4, 3] : null))
    // 同型別的真實邊(不管是 Technique 的 requires/isRequiredBy 還是
    // Implementation 的 descendantOf/accompanies/precedes)彎曲方向跟跨型別
    // 邊分開，才看得出「這條線是同一層內部的關聯」——用 domainType 比對，
    // 不是寫死比對 predicate 名稱，之後本體論加新的同型別關聯不用回來改這裡。
    .linkCurvature((l) => {
      if (l.derived) return 0.22
      const st = typeof l.source === 'object' ? l.source.domainType : undefined
      const tt = typeof l.target === 'object' ? l.target.domainType : undefined
      return st && tt && st === tt ? -0.3 : 0.22
    })
    .linkLabel((l) => {
      const s = typeof l.source === 'object' ? l.source.label : l.source
      const t = typeof l.target === 'object' ? l.target.label : l.target
      if (l.derived) {
        const viaLabels = (l.via ?? []).map((id) => simNodes.find((n) => n.id === id)?.label ?? id).join('、')
        return `${s} ↔ ${t}（推導關聯：透過「${viaLabels}」間接相關，非資料庫真實邊）`
      }
      return `${l.predicate ?? '關聯'}：${s} → ${t}`
    })
    // 推導邊沒有方向性(誰用了同一項技術不分先後)，不畫箭頭，跟真實邊的
    // 「A → B」語意分開。
    .linkDirectionalArrowLength((l) => (l.derived ? 0 : 5))
    .linkDirectionalArrowRelPos(0.96)
    .linkDirectionalArrowColor((l) => linkDisplayColor(l))
    .enableNodeDrag(false)
    // 首頁只看不操作(拖曳/縮放整個畫布留給 /graph 頁深挖,見下方說明文字)——
    // enableNodeDrag(false) 只擋得住拖單一節點,畫布本身的縮放/平移預設是開的,
    // 沒鎖住的話滑鼠滾輪、拖曳背景都還是能動鏡頭,跟文案講的不一致。
    .enableZoomInteraction(false)
    .enablePanInteraction(false)
    .onNodeClick((n, ev) => openPopover('node', n, ev))
    .onLinkClick((l, ev) => openPopover('link', l, ev))
    // hover 提亮直接鄰居：靜態圖跟 /graph 頁完整拖曳探索之間的中間地帶，
    // 不用進到 /graph 頁也能看出「這個節點連到哪裡」。
    .onNodeHover((n) => {
      const nextId = n?.id ?? null
      if (nextId === hoveredNodeId) return
      hoveredNodeId = nextId
      if (container.value) container.value.style.cursor = n ? 'pointer' : 'default'
      forceRedraw()
    })
    // layerGravity 把每一層的節點溫和拉向自己那層的目標中心點(共用中心+小幅
    // 位移，見檔頭註解)；layerBoundary 是超出範圍時的軟修正。charge/collide
    // 在範圍內還是能自然撐開、均勻分佈(沒有內部連接的節點理論上就該長這樣，
    // 見使用者確認的討論)，不是被硬拉成一個點。
    .d3Force('boundary', boundaryForce(() => width, () => height, 30))
    .d3Force('layerGravity', layerGravityForce(() => layerTargetsCache, 0.06))
    .d3Force('layerBoundary', layerBoundaryForce(() => layerTargetsCache))
    .d3Force(
      'collide',
      forceCollide<SimNode>((n) => radiusFor(n) + (shouldLabelNode(n) ? 26 : 3)).iterations(2),
    )
    .cooldownTicks(300)
    // 呼吸發光動畫要每一幀重繪：模擬穩定、engine 停止 tick 之後 canvas 預設就不會
    // 再重畫（省效能），關掉這個機制才能讓高權重節點持續呼吸，跟 /graph 頁
    // GraphPoc2D.vue 的 breatheOpacity() 用同一招。
    .autoPauseRedraw(false)
    .onEngineStop(() => {
      clampAllNodes()
      graph?.zoomToFit(0, framePadding())
      settling.value = false
    })
  graph.d3Force('charge')?.strength(-130)
  graph.d3Force('link')?.distance(58)
  // 跨型別的邊(specs／uses)現在是檔頭註解說的「層間對齊力」（借鏡 Rossi &
  // Magnani multiforce layout 的層內力＋層間力分工）：三層本來就因為
  // layerGravity 的小幅位移而大部分重疊，這股力再把有真實關聯的節點進一步
  // 拉近，讓「文件指定的技術」「技術用在的實作」這類關聯真的能穿過重疊區
  // 貫穿三層，不是純裝飾。力道刻意比同型別邊(強度 1)弱很多，不能蓋掉
  // layerGravity 想維持的「每層仍是可辨識的一團」，只需要在重疊區裡把相關
  // 節點稍微拉近。
  // 推導邊力道刻意比真實同型別邊更弱：一項熱門技術(例如 PHP)可能讓一大群
  // Implementation 兩兩之間都冒出推導邊，強度太高會讓這群節點糊成一坨、
  // 蓋過原本的分群結構，這裡只需要「有這回事」的溫和提示，不用強拉。
  graph.d3Force('link')?.strength((l: SimLink) => {
    if (l.derived) return 0.35
    const st = typeof l.source === 'object' ? l.source.domainType : undefined
    const tt = typeof l.target === 'object' ? l.target.domainType : undefined
    return st && tt && st === tt ? 1 : 0.4
  })
  // 內建 center force 預設拉向 (0,0)，跟畫布中心對不上會跟 layerGravity 打架，
  // 這裡跟 /graph 頁一樣明確覆寫成畫布中心。
  graph.d3Force('center')?.x(width / 2).y(height / 2)

  resizeObserver = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width
    const h = entries[0]?.contentRect.height
    if (w && h && graph) {
      width = w
      height = h
      graph.width(w).height(h)
      // 寬高變了，center force 的目標座標也要跟著更新，不然它會繼續拉向
      // resize 前的舊中心點；三層各自的目標中心點/範圍半徑也要重算，不然
      // resize 後的目標點還是舊尺寸算出來的，跟畫布對不上。
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
  if (sectionRef.value) {
    entranceObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          entered.value = true
          entranceObserver?.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    entranceObserver.observe(sectionRef.value)
  }
})
onUnmounted(() => {
  resizeObserver?.disconnect()
  entranceObserver?.disconnect()
  graph?._destructor?.()
})
</script>

<template>
  <section
    ref="sectionRef"
    class="w-full transition-[opacity,transform] duration-700 ease-out"
    :class="entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
  >
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 class="font-mono text-[11px] tracking-[0.2em] uppercase font-bold text-(--text-accent)">
        近期知識網路
      </h2>
    </div>

    <p v-if="!loading" class="text-sm text-(--text-ink-body) mb-3">
      <b class="text-(--text-ink-main) tabular-nums">{{ stats.doc }}</b> 份文件、<b
        class="text-(--text-ink-main) tabular-nums"
        >{{ stats.tech }}</b
      >
      項技術、<b class="text-(--text-ink-main) tabular-nums">{{ stats.impl }}</b> 個實作，由
      <b class="text-(--text-ink-main) tabular-nums">{{ stats.edges }}</b> 條已實現的關聯串成的知識網路。
    </p>

    <p v-if="!loading && isDemoData" class="text-[11px] font-mono text-(--text-accent) tracking-widest mb-2">
      // DEMO_DATA（連不上後端，顯示的是存好的資料快照，不是即時資料）
    </p>

    <div v-if="!loading" class="flex items-center gap-2 mb-2.5">
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

    <div v-if="!loading" class="flex items-center gap-2 mb-2.5">
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-(--text-ink-muted)">顯示層</span>
      <button
        v-for="type in (['documentation', 'technique', 'implementation'] as const)"
        :key="type"
        type="button"
        class="rounded-full border px-3 py-1 font-mono text-[11.5px] cursor-pointer"
        :class="typeFilter[type] ? 'text-(--bg-paper-light) border-transparent' : 'bg-(--bg-folder) text-(--text-ink-muted) border-(--border-shelf)'"
        :style="typeFilter[type] ? { background: `var(--node-${type === 'documentation' ? 'doc' : type === 'technique' ? 'tech' : 'impl'})` } : {}"
        :aria-pressed="typeFilter[type]"
        @click="toggleTypeFilter(type)"
      >
        {{ typeLabel[type] }}
      </button>
    </div>

    <div v-if="!loading && colorMode === 'type'" class="flex flex-wrap items-center gap-4 text-[12px] text-(--text-ink-muted) mb-3">
      <span class="flex items-center gap-1.5"
        ><span class="w-2 h-2 rounded-full" :style="{ background: 'var(--node-doc)' }"></span>Documentation</span
      >
      <span class="flex items-center gap-1.5"
        ><span class="w-2 h-2 rounded-full" :style="{ background: 'var(--node-tech)' }"></span>Technique</span
      >
      <span class="flex items-center gap-1.5"
        ><span class="w-2 h-2 rounded-full" :style="{ background: 'var(--node-impl)' }"></span>Implementation</span
      >
      <span class="flex items-center gap-1.5"
        ><span class="w-4 h-0 border-t border-dashed border-(--text-ink-muted)"></span>推導關聯（非真實邊）</span
      >
      <span class="ml-auto">hover 節點看直接鄰居・點節點看內容・點連線看關聯定義</span>
    </div>
    <div v-else-if="!loading" class="flex flex-wrap items-center gap-2.5 text-[11.5px] font-mono text-(--text-ink-muted) mb-3">
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

    <div
      v-show="!loading"
      class="kg-stage relative rounded-xl border border-(--border-shelf) shadow-[0_12px_32px_rgba(41,18,5,0.14)] overflow-hidden h-[460px]"
      :style="{
        background: 'var(--canvas-bg)',
        backgroundImage: 'radial-gradient(var(--canvas-dot) 1.3px, transparent 1.3px)',
        backgroundSize: '22px 22px',
      }"
    >
      <div ref="container" class="w-full h-full" />

      <div
        class="absolute inset-0 z-[5] flex items-end justify-center pb-5 backdrop-blur-sm bg-(--bg-paper-light)/50 transition-opacity duration-700"
        :class="settling ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      >
        <span class="font-mono text-[11px] tracking-widest text-(--text-ink-body)/70">
          // 節點排列中...
        </span>
      </div>

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
      節點大小＝真實關聯數（degree），不是編出來的權重；圖上的虛線是「推導關聯」——同型別的兩個節點（例如兩個
      Implementation）共用夠多項 Technique 時，就算兩者間接相關並補一條虛線，共用越多虛線越明顯，這是算出來的
      （bipartite network projection），不是資料庫裡真的有這筆關聯；已經有真實關聯（例如下面的
      <code>descendantOf</code>/<code>accompanies</code>/<code>precedes</code>）的配對不會重複疊一條虛線。首頁先行試作，
      <RouterLink to="/graph" class="text-(--text-accent) hover:underline">/graph</RouterLink> 頁完整版暫時不畫。
      目前 16 個公開 repo 裡有 15 個已經有真實 technique 資料（只有 <code>idea-trigger</code> 目前完全沒有語言／topics
      資料，暫時歸類不出技術）；三層各自的虛線圓框，是各型別的節點各自跑一套獨立佈局、彼此不受節點數量差距干擾，
      三個圓框的中心點都對齊在同一條斜向的軸線上（圖上那條較明顯的虛線）並刻意讓大部分範圍互相重疊——這條軸線貫穿
      三層的共用中心，才是「疊圖」而不是分開排列；跨型別的真實關聯（<code>specs</code>/<code>uses</code>
      這類）會把相關節點的位置進一步拉近，讓「文件－技術－實作」在重疊區裡對齊，這才是三層疊圖的重點，不只是各自跑各自的。
      拖曳互動留給 <RouterLink to="/graph" class="text-(--text-accent) hover:underline">/graph</RouterLink> 頁深挖，首頁只看不操作。
    </p>
  </section>
</template>
