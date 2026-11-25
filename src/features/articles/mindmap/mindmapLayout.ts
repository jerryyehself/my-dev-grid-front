// 心智圖的左右對稱版型（C 版型）：中心在正中，分枝分在左右兩邊，
// 每邊用 d3-hierarchy 的 tree() 算上下位置（兩棵樹，左邊鏡像），欄位位置依標籤寬度排。
// 這裡只算座標，畫成 SVG 由 ArticleMindmapDiagram.vue 負責。
//
// 每個詞是「字在上、底線在下」：y 是底線的位置，線條從上一層底線的外端接到下一層底線的內端。
// 數字來自定案的線框（清單懸停版、內頁的 C 版型）。
import { hierarchy, tree } from 'd3-hierarchy'
import type { LabelFont } from './measureLabel'

export type MindmapLabelKind = 'center' | 'branch' | 'primary' | 'secondary' | 'chip'
export type MindmapSide = 'center' | 'left' | 'right'

export interface MindmapLabelSpec {
  /** 節點 id；收合鈕是 `chip:<分枝 id>` */
  id: string
  label: string
  kind: MindmapLabelKind
}

export interface MindmapBranchSpec extends MindmapLabelSpec {
  children: MindmapLabelSpec[]
}

export interface MindmapCrossLinkSpec {
  source: string
  target: string
  /** 有類型畫實線，null（只是常一起出現）畫虛線 */
  typed: boolean
  /** 線上的字；沒有就不標 */
  label: string | null
}

export interface MindmapTreeSpec {
  center: MindmapLabelSpec
  /** 由上往下 */
  right: MindmapBranchSpec[]
  /** 由上往下 */
  left: MindmapBranchSpec[]
  links: MindmapCrossLinkSpec[]
}

export interface MindmapMetrics {
  font: Record<MindmapLabelKind, LabelFont>
  /** 同一個分枝底下，相鄰兩個概念的底線距離 */
  rowHeight: number
  /** 不同分枝的概念之間，再多空的距離 */
  groupGap: number
  /** 中心到分枝、分枝到概念欄的水平間距 */
  columnGap: number
  /** 四周留白 */
  padding: number
  /** 底線粗細 */
  underline: Record<MindmapLabelKind, number>
}

/** 清單懸停：中心 15px、概念 14px（兩階，不放分枝；branch 字級留著沒用到），概念間距 32、欄距 30。 */
export const HOVER_METRICS: MindmapMetrics = {
  font: {
    center: { size: 15, weight: 700, serif: true },
    branch: { size: 15, weight: 700, serif: false },
    primary: { size: 14, weight: 500, serif: false },
    secondary: { size: 14, weight: 400, serif: false },
    chip: { size: 14, weight: 600, serif: false },
  },
  rowHeight: 32,
  groupGap: 14,
  columnGap: 30,
  padding: 28,
  underline: { center: 2, branch: 1.4, primary: 1.25, secondary: 1, chip: 1 },
}

/** 內頁：中心 16、分枝 14、概念 13，概念間距 23、分組多 6、欄距 16。 */
export const DETAIL_METRICS: MindmapMetrics = {
  font: {
    center: { size: 16, weight: 700, serif: true },
    branch: { size: 14, weight: 700, serif: false },
    primary: { size: 13, weight: 500, serif: false },
    secondary: { size: 13, weight: 400, serif: false },
    chip: { size: 13, weight: 600, serif: false },
  },
  rowHeight: 23,
  groupGap: 6,
  columnGap: 16,
  padding: 24,
  underline: { center: 2, branch: 1.4, primary: 1.25, secondary: 1, chip: 1 },
}

export interface PositionedLabel extends MindmapLabelSpec {
  side: MindmapSide
  /** 文字的錨點 x（右側是左端、左側是右端、中心是中點） */
  x: number
  /** 底線的 y */
  y: number
  /** 底線（也是詞）的左右端 */
  x1: number
  x2: number
  fontSize: number
  anchor: 'start' | 'end' | 'middle'
}

export interface PositionedCrossLink extends MindmapCrossLinkSpec {
  d: string
  labelX: number
  labelY: number
  /** 線本身佔到的範圍（含控制點），算 viewBox 用 */
  extent: { minX: number; maxX: number; minY: number }
}

export interface MindmapLayout {
  /** viewBox：x、y、寬、高 */
  viewBox: [number, number, number, number]
  labels: PositionedLabel[]
  /** 樹的連線 */
  edges: { id: string; d: string }[]
  crossLinks: PositionedCrossLink[]
}

export type MeasureLabel = (text: string, font: LabelFont) => number

interface TreeDatum {
  spec: MindmapLabelSpec | null
  children?: TreeDatum[]
}

function labelWidth(spec: MindmapLabelSpec, metrics: MindmapMetrics, measure: MeasureLabel): number {
  return measure(spec.label, metrics.font[spec.kind])
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2
  return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`
}

/** 字的上緣到底線的距離：字身約 1.3 倍字級 */
function labelTop(label: PositionedLabel): number {
  return label.y - label.fontSize * 1.3
}

/**
 * 排一邊（右或左）。tree() 的 nodeSize 給「相鄰兩列的距離」，separation 讓不同分枝的概念多空一點；
 * 算完把這一邊上下置中對齊中心。
 */
function layoutSide(
  branches: MindmapBranchSpec[],
  side: 'left' | 'right',
  centerHalf: number,
  metrics: MindmapMetrics,
  measure: MeasureLabel,
): { labels: PositionedLabel[]; edges: { id: string; d: string }[] } {
  if (branches.length === 0) return { labels: [], edges: [] }
  const root = hierarchy<TreeDatum>({
    spec: null,
    children: branches.map((b) => ({
      spec: b,
      children: b.children.map((c) => ({ spec: c })),
    })),
  })
  const groupRatio = (metrics.rowHeight + metrics.groupGap) / metrics.rowHeight
  tree<TreeDatum>()
    .nodeSize([metrics.rowHeight, 1])
    .separation((a, b) => (a.parent === b.parent ? 1 : groupRatio))(root)

  const nodes = root.descendants().filter((n) => n.depth > 0)
  const xs = nodes.map((n) => n.x ?? 0)
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2
  const dir = side === 'right' ? 1 : -1

  const widths = new Map<string, number>()
  for (const n of nodes) widths.set(n.data.spec!.id, labelWidth(n.data.spec!, metrics, measure))

  const branchStart = centerHalf + metrics.columnGap
  const widestBranch = Math.max(...branches.map((b) => widths.get(b.id) ?? 0))
  const conceptStart = branchStart + widestBranch + metrics.columnGap

  const labels: PositionedLabel[] = []
  const edges: { id: string; d: string }[] = []
  const byId = new Map<string, PositionedLabel>()
  for (const n of nodes) {
    const spec = n.data.spec!
    const start = n.depth === 1 ? branchStart : conceptStart
    const w = widths.get(spec.id) ?? 0
    const inner = dir * start
    const outer = dir * (start + w)
    const label: PositionedLabel = {
      ...spec,
      side,
      x: inner,
      y: (n.x ?? 0) - mid,
      x1: Math.min(inner, outer),
      x2: Math.max(inner, outer),
      fontSize: metrics.font[spec.kind].size,
      anchor: side === 'right' ? 'start' : 'end',
    }
    labels.push(label)
    byId.set(spec.id, label)
  }
  for (const n of nodes) {
    const spec = n.data.spec!
    const me = byId.get(spec.id)!
    if (n.depth === 1) {
      edges.push({ id: `${spec.id}`, d: curve(dir * centerHalf, 0, me.x, me.y) })
    } else {
      const parent = byId.get(n.parent!.data.spec!.id)!
      const parentOuter = side === 'right' ? parent.x2 : parent.x1
      edges.push({ id: `${parent.id}-${spec.id}`, d: curve(parentOuter, parent.y, me.x, me.y) })
    }
  }
  return { labels, edges }
}

/** 橫向線從詞的外端出去：右側在右端、左側在左端；中心看另一端在哪邊 */
function outerPoint(label: PositionedLabel, towards: MindmapSide): { x: number; y: number } {
  const side = label.side === 'center' ? (towards === 'left' ? 'left' : 'right') : label.side
  return { x: side === 'right' ? label.x2 : label.x1, y: label.y }
}

/**
 * 橫向關係：同一側的畫成往外鼓的弧；跨到另一側的沿上緣繞過去（不穿過中心），
 * 每多一條往外一道，彼此不疊在一起。只排兩端都看得到的線，其他的由呼叫端數。
 */
function layoutCrossLinks(
  links: MindmapCrossLinkSpec[],
  byId: Map<string, PositionedLabel>,
  bounds: { minX: number; maxX: number; minY: number },
  measure: MeasureLabel,
): PositionedCrossLink[] {
  const out: PositionedCrossLink[] = []
  let lane = 0
  const sideLane = { left: 0, right: 0 }
  for (const link of links) {
    const a = byId.get(link.source)
    const b = byId.get(link.target)
    if (!a || !b) continue
    const sameSide = a.side === b.side || a.side === 'center' || b.side === 'center'
    if (sameSide) {
      const side = a.side === 'center' ? b.side : a.side
      const pa = outerPoint(a, side)
      const pb = outerPoint(b, side)
      const n = side === 'left' ? sideLane.left++ : sideLane.right++
      const bulge = 14 + n * 8
      const px = side === 'left' ? Math.min(pa.x, pb.x) - bulge : Math.max(pa.x, pb.x) + bulge
      out.push({
        ...link,
        d: `M${pa.x} ${pa.y} C${px} ${pa.y} ${px} ${pb.y} ${pb.x} ${pb.y}`,
        // 曲線 t=0.5 的位置
        labelX: 0.75 * px + 0.125 * (pa.x + pb.x),
        labelY: (pa.y + pb.y) / 2,
        extent: { minX: Math.min(px, pa.x, pb.x), maxX: Math.max(px, pa.x, pb.x), minY: Math.min(pa.y, pb.y) },
      })
    } else {
      const pa = outerPoint(a, a.side)
      const pb = outerPoint(b, b.side)
      const offset = 10 + lane * 6
      const topY = bounds.minY - 10 - lane * 8
      const xa = a.side === 'left' ? bounds.minX - offset : bounds.maxX + offset
      const xb = b.side === 'left' ? bounds.minX - offset : bounds.maxX + offset
      lane++
      out.push({
        ...link,
        d: `M${pa.x} ${pa.y} H${xa} V${topY} H${xb} V${pb.y} H${pb.x}`,
        labelX: (xa + xb) / 2,
        labelY: topY,
        extent: { minX: Math.min(xa, xb), maxX: Math.max(xa, xb), minY: topY },
      })
    }
  }
  return avoidLabelOverlap(out, [...byId.values()].map(wordBox), measure)
}

/** 線上的字（12px 半粗體）的字型，跟 ArticleMindmapDiagram 畫的一樣，量寬度用 */
const LINK_LABEL_FONT: LabelFont = { size: 12, weight: 600, serif: false }
/** 線上的字外面一圈底色描邊（stroke-4）的一半 */
const LINK_LABEL_PAD = 2
/** 線上的字的半高：字級 12，字身約一個字級 */
const LINK_LABEL_HALF_HEIGHT = 6

interface Box {
  x1: number
  x2: number
  y1: number
  y2: number
}

function overlaps(a: Box, b: Box): boolean {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2
}

/** 詞佔的範圍：字的上緣到底線（再多 1px 是底線粗細） */
function wordBox(label: PositionedLabel): Box {
  return { x1: label.x1, x2: label.x2, y1: labelTop(label), y2: label.y + 1 }
}

/**
 * 線上的字不能蓋到別的東西：
 * - 蓋到詞：沿水平方向往外（離中心遠的方向）挪到那個詞的外面。
 * - 彼此疊到：同一個字（例如兩條「被否決」連到同一個詞）只留第一個，不同的字往下挪一行。
 * 線本身不動。挪了還是蓋到（來回挪不出去）就不標這個字，寧可沒有字也不蓋住詞。
 */
function avoidLabelOverlap(
  links: PositionedCrossLink[],
  words: Box[],
  measure: MeasureLabel,
): PositionedCrossLink[] {
  const placed: PositionedCrossLink[] = []
  const guardMax = 4 * (links.length + words.length) + 4
  return links.map((link) => {
    if (!link.label) return link
    const next = { ...link }
    const half = measure(link.label, LINK_LABEL_FONT) / 2 + LINK_LABEL_PAD
    const boxOf = (l: PositionedCrossLink): Box => ({
      x1: l.labelX - half,
      x2: l.labelX + half,
      y1: l.labelY - LINK_LABEL_HALF_HEIGHT,
      y2: l.labelY + LINK_LABEL_HALF_HEIGHT,
    })
    let settled = false
    for (let guard = 0; guard < guardMax; guard++) {
      const box = boxOf(next)
      const word = words.find((w) => overlaps(box, w))
      if (word) {
        next.labelX = next.labelX < 0 ? word.x1 - half : word.x2 + half
        continue
      }
      const hit = placed.find((p) => Math.abs(p.labelX - next.labelX) < 40 && Math.abs(p.labelY - next.labelY) < 14)
      if (!hit) {
        settled = true
        break
      }
      if (hit.label === next.label) {
        next.label = null
        settled = true
        break
      }
      next.labelY = hit.labelY + 14
    }
    if (!settled) next.label = null
    if (next.label) placed.push(next)
    return next
  })
}

/**
 * 把整張圖排好。座標以中心底線的中點為原點，viewBox 包住所有詞與線再加 padding；
 * `minWidth` 給了的話，內容較窄時左右補空白讓圖置中（提示框、內頁框都是固定寬）。
 */
export function layoutMindmap(
  spec: MindmapTreeSpec,
  metrics: MindmapMetrics,
  measure: MeasureLabel,
  minWidth = 0,
): MindmapLayout {
  const centerWidth = labelWidth(spec.center, metrics, measure)
  const half = centerWidth / 2
  const center: PositionedLabel = {
    ...spec.center,
    side: 'center',
    x: 0,
    y: 0,
    x1: -half,
    x2: half,
    fontSize: metrics.font.center.size,
    anchor: 'middle',
  }
  const right = layoutSide(spec.right, 'right', half, metrics, measure)
  const left = layoutSide(spec.left, 'left', half, metrics, measure)
  const labels = [center, ...right.labels, ...left.labels]
  const edges = [...right.edges, ...left.edges]

  const byId = new Map(labels.map((l) => [l.id, l]))
  const treeBounds = {
    minX: Math.min(...labels.map((l) => l.x1)),
    maxX: Math.max(...labels.map((l) => l.x2)),
    minY: Math.min(...labels.map(labelTop)),
    maxY: Math.max(...labels.map((l) => l.y)),
  }
  const crossLinks = layoutCrossLinks(spec.links, byId, treeBounds, measure)

  // 橫向線可能伸出樹的範圍（往外鼓、沿上緣繞），viewBox 要一起包進去
  let { minX, maxX, minY } = treeBounds
  const { maxY } = treeBounds
  for (const link of crossLinks) {
    minX = Math.min(minX, link.extent.minX, link.labelX - 24)
    maxX = Math.max(maxX, link.extent.maxX, link.labelX + 24)
    minY = Math.min(minY, link.extent.minY, link.labelY - 14)
  }

  const p = metrics.padding
  let x = minX - p
  let width = maxX - minX + 2 * p
  if (width < minWidth) {
    x -= (minWidth - width) / 2
    width = minWidth
  }
  return {
    viewBox: [x, minY - p, width, maxY - minY + 2 * p],
    labels,
    edges,
    crossLinks,
  }
}
