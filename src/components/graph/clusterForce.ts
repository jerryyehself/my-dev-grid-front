import type { GraphNodeType } from '@/api/graph'

// 同類別的弱聚集力（D-87）：每一幀算出每個類別目前的重心，把該類別的節點往自己類別的重心
// 輕輕拉。跟三層疊圖的 layerGravity 不同：
// - 目標是「即時重心」而不是固定座標，所以不會把整個類別拉到畫布某個指定位置，只是讓同類
//   的節點彼此靠近一點；
// - 沒有圓框邊界，節點不會被框住，被跨類別關係拉走的節點照樣可以離群。
// 每個類別內所有節點受到的拉力加總為零（各自朝重心、重心本身不動），所以這股力不會讓整張圖
// 漂移，只改變類別內部的鬆緊。
//
// 2026-09-14 拿掉過一次「依 Scope 分區」的力（見 data/graphPocData.ts 檔頭）：那個是強力分區，
// 跟真實關係互相拉扯，結果更亂。這裡刻意很弱，只當「同類略微成團」的提示，數值調校見元件。

interface ClusterNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  domainType: GraphNodeType
}

export function typeCentroids(nodes: ClusterNode[]): Map<GraphNodeType, { x: number; y: number }> {
  const sums = new Map<GraphNodeType, { x: number; y: number; n: number }>()
  for (const n of nodes) {
    if (n.x == null || n.y == null) continue
    const s = sums.get(n.domainType) ?? { x: 0, y: 0, n: 0 }
    s.x += n.x
    s.y += n.y
    s.n++
    sums.set(n.domainType, s)
  }
  const out = new Map<GraphNodeType, { x: number; y: number }>()
  for (const [type, s] of sums) out.set(type, { x: s.x / s.n, y: s.y / s.n })
  return out
}

export function typeClusterForce<N extends ClusterNode>(strength: () => number) {
  let nodes: N[] = []
  const force = (alpha: number) => {
    const k = strength()
    if (k <= 0) return
    const centroids = typeCentroids(nodes)
    for (const n of nodes) {
      if (n.x == null || n.y == null) continue
      const c = centroids.get(n.domainType)
      if (!c) continue
      n.vx = (n.vx ?? 0) + (c.x - n.x) * k * alpha
      n.vy = (n.vy ?? 0) + (c.y - n.y) * k * alpha
    }
  }
  force.initialize = (list: N[]) => {
    nodes = list
  }
  return force
}
