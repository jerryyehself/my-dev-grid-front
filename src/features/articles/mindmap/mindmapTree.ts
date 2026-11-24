// 把一份心智圖資料整理成「要畫什麼」：哪些分枝在右、哪些在左，每個分枝底下露出哪些詞，
// 收合的次要節點換成「＋N 次要」，以及橫向關係的說法。排座標在 mindmapLayout.ts。
import type { ArticleMindmap, MindmapLink, MindmapNode } from './articleMindmapTypes'
import type {
  MindmapBranchSpec,
  MindmapCrossLinkSpec,
  MindmapLabelSpec,
  MindmapTreeSpec,
} from './mindmapLayout'

export interface MindmapBranch {
  node: MindmapNode
  primaries: MindmapNode[]
  secondaries: MindmapNode[]
}

/** 中心底下的分枝，照資料裡的順序（作者的順序），各自分出主要與次要的概念。 */
export function branchesOf(mindmap: ArticleMindmap): MindmapBranch[] {
  return mindmap.nodes
    .filter((n) => n.parent === mindmap.center)
    .map((node) => {
      const kids = mindmap.nodes.filter((n) => n.parent === node.id)
      return {
        node,
        primaries: kids.filter((k) => k.strength === 'primary'),
        secondaries: kids.filter((k) => k.strength === 'secondary'),
      }
    })
}

export function centerOf(mindmap: ArticleMindmap): MindmapNode {
  // 驗證過的資料一定找得到中心
  return mindmap.nodes.find((n) => n.id === mindmap.center)!
}

/**
 * 分左右：照作者的順序從右上開始順時針排，前面幾個在右（由上往下）、後面的在左（由下往上），
 * 切在哪裡由兩邊的「列數」最接近決定，不是分枝數，避免一邊很長。一樣接近時右邊多放一點。
 * 回傳的 left 已經是由上往下的順序。
 */
export function assignSides<T>(items: T[], rows: (item: T) => number): { right: T[]; left: T[] } {
  if (items.length === 0) return { right: [], left: [] }
  const weights = items.map((item) => Math.max(1, rows(item)))
  const total = weights.reduce((a, b) => a + b, 0)
  let best = 1
  let bestDiff = Infinity
  let acc = 0
  for (let k = 1; k <= items.length; k++) {
    acc += weights[k - 1]!
    const diff = Math.abs(acc - (total - acc))
    // 一樣接近時取後面的切法：右邊多的那個
    if (diff <= bestDiff) {
      best = k
      bestDiff = diff
    }
  }
  return { right: items.slice(0, best), left: items.slice(best).reverse() }
}

function labelOf(node: MindmapNode, kind: MindmapLabelSpec['kind'], graph: boolean): MindmapLabelSpec {
  return { id: node.id, label: node.label, kind, graph: graph && node.res_id !== null }
}

/** 清單懸停最少、最多放幾個概念（站主 2026-11-25 定案：6–8 個） */
export const HOVER_CONCEPT_MIN = 6
export const HOVER_CONCEPT_MAX = 8

/**
 * 清單懸停要放的概念：主要分枝底下的主要概念，依 weight 由高到低取。
 * 先取 HOVER_CONCEPT_MIN 個；後面的跟第 MIN 個 weight 一樣時一併帶上（不在同分的地方硬切），
 * 最多 HOVER_CONCEPT_MAX 個。weight 一樣時照資料順序（作者的順序）。不足 MIN 個就全部放。
 * 回傳的順序是資料順序，同一個分枝的概念排在一起。
 */
export function hoverConceptsOf(mindmap: ArticleMindmap): MindmapNode[] {
  const pool = branchesOf(mindmap)
    .filter((b) => b.node.strength === 'primary')
    .flatMap((b) => b.primaries)
  const order = new Map(mindmap.nodes.map((n, i) => [n.id, i]))
  const ranked = [...pool].sort((a, b) => b.weight - a.weight || order.get(a.id)! - order.get(b.id)!)
  let count = Math.min(HOVER_CONCEPT_MIN, ranked.length)
  while (count < Math.min(HOVER_CONCEPT_MAX, ranked.length) && ranked[count]!.weight === ranked[count - 1]!.weight) {
    count++
  }
  const chosen = new Set(ranked.slice(0, count).map((n) => n.id))
  return pool.filter((n) => chosen.has(n.id))
}

/**
 * 清單懸停：兩階，中心直接接權重最高的幾個主要概念，不放分枝（站主 2026-11-25 定案：
 * 「背景、方法論」這類分枝每篇都差不多，看不出文章的差別）。概念照資料順序從右上順時針分到左右兩邊。
 * 沒有橫向線、沒有 ↗（提示框裡不能點）。
 */
export function buildHoverSpec(mindmap: ArticleMindmap): MindmapTreeSpec {
  const concepts = hoverConceptsOf(mindmap).map<MindmapBranchSpec>((c) => ({
    ...labelOf(c, 'primary', false),
    children: [],
  }))
  const { right, left } = assignSides(concepts, () => 1)
  return { center: labelOf(centerOf(mindmap), 'center', false), right, left, links: [] }
}

export const CHIP_PREFIX = 'chip:'

/** 「＋N 次要」或「－ 收合次要」的文字 */
export function chipLabel(secondaryCount: number, expanded: boolean): string {
  return expanded ? '－ 收合次要' : `＋${secondaryCount} 次要`
}

/**
 * 內頁：次要節點預設收合，每個有次要的分枝最後一列是「＋N 次要」，展開後換成「－ 收合次要」。
 * 本身是次要的分枝，只有在全部展開（expanded 含中心 id）時才露出。
 * 分邊用全部概念數算，展開或收合時分枝不會跳到另一邊。
 */
export function buildDetailSpec(
  mindmap: ArticleMindmap,
  expanded: ReadonlySet<string>,
  linkLabels: (link: MindmapLink) => string | null,
  showLinks: boolean,
): { spec: MindmapTreeSpec; hiddenLinkCount: number } {
  const all = branchesOf(mindmap)
  const { right, left } = assignSides(all, (b) => b.primaries.length + b.secondaries.length + 1)
  const toSpec = (b: MindmapBranch): MindmapBranchSpec => {
    const open = expanded.has(b.node.id)
    const children = b.primaries.map((c) => labelOf(c, 'primary', true))
    if (open) children.push(...b.secondaries.map((c) => labelOf(c, 'secondary', true)))
    if (b.secondaries.length > 0) {
      children.push({
        id: `${CHIP_PREFIX}${b.node.id}`,
        label: chipLabel(b.secondaries.length, open),
        kind: 'chip',
        graph: false,
      })
    }
    return { ...labelOf(b.node, 'branch', true), children }
  }
  const showSecondaryBranches = expanded.has(mindmap.center)
  const visibleBranch = (b: MindmapBranch) => b.node.strength === 'primary' || showSecondaryBranches
  const spec: MindmapTreeSpec = {
    center: labelOf(centerOf(mindmap), 'center', true),
    right: right.filter(visibleBranch).map(toSpec),
    left: left.filter(visibleBranch).map(toSpec),
    links: [],
  }
  if (!showLinks) return { spec, hiddenLinkCount: 0 }

  const visible = new Set<string>([spec.center.id])
  for (const b of [...spec.right, ...spec.left]) {
    visible.add(b.id)
    for (const c of b.children) visible.add(c.id)
  }
  let hiddenLinkCount = 0
  const links: MindmapCrossLinkSpec[] = []
  for (const link of mindmap.links) {
    if (!visible.has(link.source) || !visible.has(link.target)) {
      hiddenLinkCount++
      continue
    }
    links.push({ source: link.source, target: link.target, typed: link.type !== null, label: linkLabels(link) })
  }
  spec.links = links
  return { spec, hiddenLinkCount }
}

// 橫向關係的說法。類型是英文代號，訪客頁要中文；沒列到的類型說「相關」，
// 沒有類型（只是常一起出現）是虛線，不標字。
const TYPE_LINE_LABEL: Record<string, string> = {
  rejectedBy: '被否決',
  implements: '實現',
  isBasedOn: '依據',
}

/** 線上的字（桌機圖）：有類型才標。 */
export function linkLineLabel(link: MindmapLink): string | null {
  if (link.type === null) return null
  return TYPE_LINE_LABEL[link.type] ?? '相關'
}

/**
 * 一條關係從某一端看過去的說法（手機大綱樹每個詞底下的小字）。
 * `from` 是這一列的詞是 source 還是 target，`other` 是另一端的詞。
 */
export function linkPhrase(link: MindmapLink, from: 'source' | 'target', other: string): string {
  const q = `「${other}」`
  if (link.type === null) return `常和${q}一起出現`
  switch (link.type) {
    case 'rejectedBy':
      return from === 'source' ? `被${q}否決` : `否決${q}`
    case 'implements':
      return from === 'source' ? `實現${q}` : `由${q}實現`
    case 'isBasedOn':
      return from === 'source' ? `依據${q}` : `是${q}的依據`
    default:
      return `和${q}相關`
  }
}
