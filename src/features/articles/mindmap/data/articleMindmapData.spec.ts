import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { extractHeadings, stripHeadingIds } from '@/components/markdown/headings'
import type { ArticleMindmap, MindmapNode } from '../articleMindmapTypes'
import { isArticleMindmap, validateArticleMindmap } from '../articleMindmapValidate'
import { mindmapArticleIds } from '../articleMindmapSource'
import { unitLinksOf } from '../mindmapUnits'
import { ARTICLE_MINDMAP_DATA } from './articleMindmapData'

// articleMindmap<id>Body.md 是正式環境各篇文章內文的快照，2026-11-25 從正式 API 取得。
// 測試時不去抓，免得測試結果跟著線上內容變。文章改版改到標題時，要重抓快照、重對出處。
const bodies = import.meta.glob<string>('./articleMindmap*Body.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const bodyOf = (id: number) => bodies[`./articleMindmap${id}Body.md`]

const PUBLISHED_IDS = [13, 14, 15, 16, 17]
/** 有資料與快照、但不上線的文章（理由見 articleMindmapData.ts），資料一樣要檢查 */
const WITHHELD_IDS = [12]
const CHECKED_IDS = [...WITHHELD_IDS, ...PUBLISHED_IDS]
const WITHHELD_DATA: Readonly<Record<number, () => Promise<unknown>>> = {
  12: async () => (await import('./articleMindmap12.json')).default,
}
const dataOf = (id: number) => (ARTICLE_MINDMAP_DATA[id] ?? WITHHELD_DATA[id])!

// ---- 段落切分與字串比對（只給這個測試用，規則跟產生資料時的一致性檢查相同） ----
// 段落 = 後端切段落的單位：每個 H2／H3 標題行到下一個 H2／H3 標題行之前（H1、H4 以下算在內文裡）。
// 註腳定義從原位置拿掉，改接在引用它的段落後面（含定義裡再引用的）。

interface MdNode {
  type: string
  identifier?: string
  position?: { start: { line: number }; end: { line: number } }
  children?: MdNode[]
}

interface Unit {
  slug: string
  depth: number
  /** 正規化過的段落文字 */
  text: string
}

const CJK = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}'

/** 拿掉 Markdown 記號與網址，只留讀者看得到的字 */
function clean(md: string): string {
  return md
    .replace(/^ {0,3}#{1,6}[ \t]+/gm, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<https?:\/\/[^>]*>/g, ' ')
    .replace(/https?:\/\/[^\s\u0080-￿)\]>]+/g, ' ')
    .replace(/\[\^[^\]]+\]/g, ' ')
    .replace(/^\|?[\s:|-]+\|?$/gm, ' ')
    .replace(/\\([|*_`#[\]])/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/`/g, ' ')
    .replace(/\*\*|\*|~~/g, '')
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
}

/** 全形轉半形、小寫、橫線統一、空白收成一格，再拿掉緊鄰中日韓文字的空白 */
function norm(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‐-―−－]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`\\s(?=[${CJK}])|(?<=[${CJK}])\\s`, 'gu'), '')
    .trim()
}

const isWord = (c: string | undefined) => c !== undefined && /[a-z0-9_]/.test(c)

/** 詞是否出現在段落裡；詞的頭尾是拉丁字母／數字時要對齊詞界（"CSP" 不算出現在 "CSPs"） */
function appears(term: string, unitText: string): boolean {
  const t = norm(clean(term))
  if (t === '') return false
  for (let i = unitText.indexOf(t); i !== -1; i = unitText.indexOf(t, i + 1)) {
    if (isWord(t[0]) && isWord(unitText[i - 1])) continue
    if (isWord(t[t.length - 1]) && isWord(unitText[i + t.length])) continue
    return true
  }
  return false
}

function splitUnits(source: string): Unit[] {
  const heads = extractHeadings(source)
  const stripped = stripHeadingIds(source).source
  const tree = unified().use(remarkParse).use(remarkGfm).parse(stripped) as unknown as MdNode
  const headLines: number[] = []
  const defs = new Map<string, { start: number; end: number }>()
  const refs: { id: string; line: number }[] = []
  const walk = (n: MdNode, inDef: boolean) => {
    if (n.type === 'footnoteDefinition') {
      if (!defs.has(n.identifier!))
        defs.set(n.identifier!, { start: n.position!.start.line, end: n.position!.end.line })
      ;(n.children ?? []).forEach((c) => walk(c, true))
      return
    }
    if (n.type === 'heading' && !inDef) headLines.push(n.position!.start.line)
    if (n.type === 'footnoteReference') refs.push({ id: n.identifier!, line: n.position!.start.line })
    ;(n.children ?? []).forEach((c) => walk(c, inDef))
  }
  walk(tree, false)
  if (headLines.length !== heads.length) throw new Error('標題數對不上')
  const lines = stripped.split('\n')
  const defOf = (ln: number) =>
    [...defs.entries()].find(([, d]) => ln >= d.start && ln <= d.end)?.[0] ?? null
  const cuts = heads
    .map((h, i) => ({ ...h, line: headLines[i]! }))
    .filter((h) => h.depth === 2 || h.depth === 3)
  return cuts.map((h, i) => {
    const end = (cuts[i + 1]?.line ?? lines.length + 1) - 1
    const own: string[] = []
    for (let ln = h.line; ln <= end; ln++) if (defOf(ln) === null) own.push(lines[ln - 1]!)
    const want: string[] = []
    const queue = refs
      .filter((r) => r.line >= h.line && r.line <= end && defOf(r.line) === null)
      .map((r) => r.id)
    while (queue.length) {
      const id = queue.shift()!
      const d = defs.get(id)
      if (!d || want.includes(id)) continue
      want.push(id)
      for (const r of refs) if (r.line >= d.start && r.line <= d.end) queue.push(r.id)
    }
    const extra = want.map((id) => lines.slice(defs.get(id)!.start - 1, defs.get(id)!.end).join('\n'))
    return { slug: h.slug, depth: h.depth, text: norm(clean([...own, ...extra].join('\n'))) }
  })
}

/** 模擬文章重新匯入：H2、H3 標題依序補上 `{#s1}`、`{#s2}`……（程式碼區塊裡的不動） */
function withExplicitIds(source: string): string {
  let n = 0
  let fence = false
  return source
    .split('\n')
    .map((line) => {
      if (/^ {0,3}(`{3,}|~{3,})/.test(line)) fence = !fence
      if (fence || !/^#{2,3}[ \t]/.test(line)) return line
      n += 1
      return `${line} {#s${n}}`
    })
    .join('\n')
}

function depthOf(map: ArticleMindmap, node: MindmapNode): number {
  const byId = new Map(map.nodes.map((n) => [n.id, n]))
  let d = 0
  for (let c = node; c.parent !== null; c = byId.get(c.parent)!) d++
  return d
}

// ---- 預期值：產生資料時一致性檢查的結果 ----
// C1：概念（第 2 層）的 label 或任一 text_forms 出現在它連到的段落之一裡。
//     沒過的都是有 res_id 的概念（內文寫法之後登記成圖譜那邊的 nomen，不放 text_forms）。
// C2：分枝（第 1 層）至少連到一個 H2 段落。
// text_forms：每個寫法都必須出現在連到的段落之一裡。
const EXPECTED: Record<
  number,
  { units: number; concepts: number; c1Miss: string[]; textForms: number; branches: number }
> = {
  12: { units: 40, concepts: 22, c1Miss: ['n4'], textForms: 24, branches: 6 },
  13: { units: 42, concepts: 19, c1Miss: ['n4', 'n8', 'n18'], textForms: 17, branches: 5 },
  14: { units: 42, concepts: 18, c1Miss: [], textForms: 21, branches: 4 },
  15: { units: 27, concepts: 14, c1Miss: ['n7'], textForms: 13, branches: 4 },
  16: { units: 41, concepts: 21, c1Miss: [], textForms: 14, branches: 6 },
  17: { units: 45, concepts: 21, c1Miss: [], textForms: 24, branches: 5 },
}

describe('ARTICLE_MINDMAP_DATA', () => {
  it('它應該只有上線的 5 篇，正式 build 認得的就是這 5 篇（12 有資料但不上線）', () => {
    expect(Object.keys(ARTICLE_MINDMAP_DATA).map(Number)).toEqual(PUBLISHED_IDS)
    expect([...mindmapArticleIds(false)]).toEqual(PUBLISHED_IDS)
    expect(Object.keys(EXPECTED).map(Number)).toEqual(CHECKED_IDS)
  })

  it('它應該每篇都有內文快照，而且快照沒讀錯（有 H2）', () => {
    expect(Object.keys(bodies)).toHaveLength(CHECKED_IDS.length)
    for (const id of CHECKED_IDS) expect(bodyOf(id)).toMatch(/^## /m)
  })
})

describe.each(CHECKED_IDS)('文章 %i 的心智圖', (id) => {
  const load = async () => {
    const data = await dataOf(id)()
    expect(isArticleMindmap(data)).toBe(true)
    return data as ArticleMindmap
  }
  const body = bodyOf(id)!
  const headings = extractHeadings(body)
  const units = splitUnits(body)
  const unitBySlug = new Map(units.map((u) => [u.slug, u]))

  it('它應該通過格式驗證，而且是這篇的', async () => {
    const data = await dataOf(id)()
    expect(validateArticleMindmap(data)).toEqual([])
    expect((data as ArticleMindmap).article_id).toBe(id)
  })

  it('它應該讓每個出處都直接對到正式環境內文的段落標題', async () => {
    const map = await load()
    const slugs = new Set(units.map((u) => u.slug))
    const refs = map.nodes.flatMap((n) => n.units.map((u) => u.unit_id))
    expect(refs).toHaveLength(EXPECTED[id]!.units)
    expect(refs.filter((r) => !slugs.has(r))).toEqual([])
    // 元件實際用的 unitLinksOf 也一個都沒濾掉
    for (const n of map.nodes) expect(unitLinksOf(n, headings)).toHaveLength(n.units.length)
  })

  it('它應該讓概念的詞出現在連到的段落裡（C1），沒過的只有預期的那幾個', async () => {
    const map = await load()
    const concepts = map.nodes.filter((n) => depthOf(map, n) === 2)
    expect(concepts).toHaveLength(EXPECTED[id]!.concepts)
    const miss = concepts.filter((n) => {
      const linked = unitLinksOf(n, headings).map((l) => unitBySlug.get(l.slug)!)
      return ![n.label, ...(n.text_forms ?? [])].some((t) => linked.some((u) => appears(t, u.text)))
    })
    expect(miss.map((n) => n.id)).toEqual(EXPECTED[id]!.c1Miss)
    for (const n of miss) expect(n.res_id).not.toBeNull()
  })

  it('它應該讓每個內文寫法（text_forms）都出現在連到的段落之一裡', async () => {
    const map = await load()
    const forms = map.nodes.flatMap((n) =>
      (n.text_forms ?? []).map((t) => ({
        id: n.id,
        t,
        hit: unitLinksOf(n, headings).some((l) => appears(t, unitBySlug.get(l.slug)!.text)),
      })),
    )
    expect(forms).toHaveLength(EXPECTED[id]!.textForms)
    expect(forms.filter((f) => !f.hit)).toEqual([])
  })

  it('它應該讓每個分枝至少連到一個 H2 段落（C2）', async () => {
    const map = await load()
    const branches = map.nodes.filter((n) => depthOf(map, n) === 1)
    expect(branches).toHaveLength(EXPECTED[id]!.branches)
    const bad = branches.filter(
      (b) => !unitLinksOf(b, headings).some((l) => unitBySlug.get(l.slug)!.depth === 2),
    )
    expect(bad.map((b) => b.label)).toEqual([])
  })

  it('它應該在文章重新匯入、標題補上 {#sN} 之後，出處照樣連得到（連到 sN）', async () => {
    const map = await load()
    const reimported = extractHeadings(withExplicitIds(body))
    const sections = reimported.filter((h) => h.depth === 2 || h.depth === 3)
    expect(sections.map((h) => h.slug)).toEqual(sections.map((...[, i]) => `s${i + 1}`))
    for (const n of map.nodes) {
      const links = unitLinksOf(n, reimported)
      expect(links).toHaveLength(n.units.length)
      for (const l of links) expect(l.slug).toMatch(/^s\d+$/)
    }
  })
})

describe('文章 17 的 n9「內容是最常用的相關性準則」', () => {
  it('它應該連到內文寫了「相關性準則」的速查表', async () => {
    const map = (await ARTICLE_MINDMAP_DATA[17]!()) as ArticleMindmap
    const n9 = map.nodes.find((n) => n.id === 'n9')!
    expect(n9.text_forms).toContain('相關性準則')
    expect(n9.units.map((u) => u.unit_id)).toContain('速查表')
    const units = splitUnits(bodyOf(17)!)
    expect(appears('相關性準則', units.find((u) => u.slug === '速查表')!.text)).toBe(true)
  })
})
