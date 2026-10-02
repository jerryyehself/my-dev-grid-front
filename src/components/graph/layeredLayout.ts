import type { GraphNodeType } from '@/api/graph'

// 首頁圖譜的「三層疊圖」排版（從 KnowledgeGraphPanel.vue 抽出，D-87）。
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
// 大部分互相重疊——這才是「疊」在一起，不是分開排列。這是 2D canvas 上模擬「疊
// 圖」的視覺手法，不是真的 3D（/graph 頁另外有 GraphPoc3D.vue 可做真的 3D）。
//
// 我們的三層節點集合互不相同，沒有「同一個實體跨層對齊」這種 multiforce
// 原始論文情境可以用，所以「層間對齊」改用「真實跨類別關聯(specs/uses 這類)
// 拉著彼此相關的節點在座標上盡量靠近」取代。
// 分類法/技術參考另見 McGee, Ghoniem, Melançon, Otjacques, Pinaud,
// "The State of the Art in Multilayer Network Visualization"
// (Computer Graphics Forum 2019, arXiv:1902.06815)。
//
// D-87（2026-10-02）：這整套排版保留，但變成可以整個拿掉的選項——元件的 layout prop
// 設成 'free' 就不加 layerGravity/layerBoundary 兩股力、不夾回圓框、不畫虛線圓框。

interface PositionedNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  domainType: GraphNodeType
}

export interface LayerTarget {
  cx: number
  cy: number
  r: number
}
export type LayerTargets = Record<GraphNodeType, LayerTarget>

// 三層等角疊層的固定次序跟位移方向：陣列索引 0/1/2 對應
// depthIndex -1/0/+1，Documentation 最靠後(左上)、Technique 是共用中心本身
// (不位移)、Implementation 最靠前(右下)。DEPTH_DX/DEPTH_DY 刻意抓得比每層
// 自己的節點範圍半徑小很多(見 layerTargets 的半徑算法)，讓三層節點雲大部分
// 互相重疊。
export const DEPTH_ORDER: GraphNodeType[] = ['documentation', 'technique', 'implementation']
const DEPTH_DX = 68
const DEPTH_DY = 52
export function depthOffset(type: GraphNodeType): { dx: number; dy: number } {
  const idx = DEPTH_ORDER.indexOf(type) - 1
  return { dx: idx * DEPTH_DX, dy: idx * DEPTH_DY }
}

// 每層節點範圍半徑依節點數量開根號成長（面積跟數量成正比，是視覺上比較
// 均勻的分配方式，不是半徑直接跟數量成正比會讓多節點的層大得不成比例）；
// 加一個固定底限，節點數少的 Documentation 也有足夠空間展開跟容納標籤。
export const MIN_LAYER_RADIUS = 108
export const RADIUS_PER_SQRT_NODE = 20
export function layerTargets(
  width: number,
  height: number,
  countByType: Record<GraphNodeType, number>,
  radiusPerSqrtNode = RADIUS_PER_SQRT_NODE,
): LayerTargets {
  const cx = width / 2
  const cy = height / 2
  const targets = {} as LayerTargets
  for (const type of DEPTH_ORDER) {
    const { dx, dy } = depthOffset(type)
    const count = countByType[type] ?? 0
    const r = MIN_LAYER_RADIUS + Math.sqrt(count) * radiusPerSqrtNode
    targets[type] = { cx: cx + dx, cy: cy + dy, r }
  }
  return targets
}

export function countByType(nodes: { domainType: GraphNodeType }[]): Record<GraphNodeType, number> {
  const counts: Record<GraphNodeType, number> = {
    documentation: 0,
    technique: 0,
    implementation: 0,
  }
  for (const n of nodes) counts[n.domainType]++
  return counts
}

// 讓每一層的節點真的圍繞在自己那層的中心點附近(各自成一團可辨識的形狀)，
// 而不是被跨類別的 link 力硬拉到別層去——溫和的向心力，強度不高，讓
// charge/collide 在範圍內還是能自然撐開分佈，不會被拉成死板的一個點。
export function layerGravityForce<N extends PositionedNode>(
  targetsFn: () => LayerTargets | undefined,
  strength: number,
) {
  let nodes: N[] = []
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
  force.initialize = (list: N[]) => {
    nodes = list
  }
  return force
}

// 超出自己那層範圍半徑的節點溫和推回去——這是模擬過程中的軟力，最終保證
// 「節點真的沒有越界」的是 clampToLayer() 的硬夾限。
export function layerBoundaryForce<N extends PositionedNode>(
  targetsFn: () => LayerTargets | undefined,
  radiusFor: (n: N) => number,
) {
  let nodes: N[] = []
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
  force.initialize = (list: N[]) => {
    nodes = list
  }
  return force
}

// 各層自己的範圍半徑在模擬結束時收尾：不管 layerBoundaryForce 有沒有把力道打平衡，
// 結算時每個節點都該落在自己類別的目標中心範圍內。
export function clampToLayer(n: PositionedNode, target: LayerTarget, r: number) {
  if (n.x == null || n.y == null) return
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

// 邊界安全網：稀疏圖在多輪 tick 後可能被 charge 排斥力推出可視範圍之外。
// 只對真的超出邊界的節點施加溫和回推力。
export function boundaryForce<N extends PositionedNode>(
  widthFn: () => number,
  heightFn: () => number,
  padding: number,
) {
  let nodes: N[] = []
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
  force.initialize = (list: N[]) => {
    nodes = list
  }
  return force
}
