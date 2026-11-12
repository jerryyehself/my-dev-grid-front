<script setup lang="ts">
// mdast → Vue vnode。把 Markdown 走成節點樹，再一個節點對一個 h() 呼叫。
//
// 為什麼不是 parse 成 HTML 字串再 v-html（D-47）:
// 1. 站內連結要是真的 <RouterLink>。v-html 塞進去的 <a> 是原生連結，
//    點下去整頁重新載入，SPA 的路由與捲動位置全部重來。
// 2. 樣式直接沿用站上既有的元件與 token，不用再寫一份 .prose 樣式表
//    把同一組值定義第二次——那正是這個專案最近才被燒到的問題。
// 3. 不用消毒器。實測 marked(13.1KB) + dompurify(11.1KB) = 24.2KB，
//    比 unified + remark-parse 的 20.6KB 還大，所以「AST 比較貴」是錯的。
import {
  computed,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useId,
  watch,
  type VNode,
} from 'vue'
import { RouterLink } from 'vue-router'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { extractHeadings } from './headings'
import { safeLink } from './safeLink'
import { buildFootnoteIndex, splitLastChar, stackSidenotes, type FootnoteInfo } from './footnotes'

const props = withDefaults(
  defineProps<{
    source: string
    /**
     * 註釋要不要在寬螢幕貼到正文右邊當邊注。預設不要：編輯頁預覽這類窄容器右邊沒有留白，
     * 邊注會長出容器外。要開的頁面（文章內頁）自己負責在寬螢幕留出右邊的欄位。
     * 不管開不開，文末的「註釋」清單都在。
     */
    sidenotes?: boolean
  }>(),
  { sidenotes: false },
)

// mdast 的節點形狀。remark 的型別來自 @types/mdast，但我們只需要走訪用得到的欄位，
// 所以這裡宣告一個夠用的最小介面，不把整棵樹的型別拉進來。
interface MdNode {
  type: string
  value?: string
  depth?: number
  url?: string
  alt?: string | null
  title?: string | null
  ordered?: boolean | null
  start?: number | null
  checked?: boolean | null
  identifier?: string
  label?: string | null
  lang?: string | null
  align?: (('left' | 'right' | 'center') | null)[]
  children?: MdNode[]
}

const processor = unified().use(remarkParse).use(remarkGfm)

const tree = computed(() => processor.parse(props.source) as unknown as MdNode)

/** 這篇的所有標題，依文件順序。父層要拿去做目錄,所以 expose 出去。 */
const headings = computed(() => extractHeadings(props.source))

// --- 註腳（GFM 的 [^1]） ---
//
// 以前註腳整個被吃掉的原因：remark-gfm 其實有裝，也確實把 `[^1]` 解析成 footnoteReference、
// 把 `[^1]: …` 解析成 footnoteDefinition，但下面的 render() 沒有這兩種節點的 case，
// 全部掉進 default 分支。default 的規則是「往下 render children」：
// footnoteReference 沒有 children，所以內文裡的 [^1] 憑空消失、讀者看不到任何標記；
// footnoteDefinition 有 children（一個段落），所以註釋內容被當成普通段落，
// 原地印在文章中間（通常是文末），沒有編號、沒有對應。
// 現在兩種節點都有明確的 case；編號與孤兒定義的規則見 footnotes.ts。
const footnotes = computed(() => buildFootnoteIndex(tree.value))

// 同一頁可能有多個 MarkdownBody（例如編輯頁預覽），id 加上實例前綴才不會互相撞
const uid = useId()
const rootEl = ref<HTMLElement | null>(null)

// 寬度夠（正文右邊有留白）才把註釋貼在正文旁；不夠就改成點編號在原地展開。
// 1000px 的依據：邊注欄 232px ＋ 與正文的間距 28px ＋ 正文最寬 65ch，在 1000px 的內容區（952px）放得下，
// 再窄就擠到正文了。文章內頁在 1240px 以上另外把目錄移到左欄，見 ArticleDetailView
const SIDE_QUERY = '(min-width: 1000px)'
const sideMode = ref(false)

/** 窄螢幕下展開中的註釋，key 是「編號-第幾次引用」。換新 Set 觸發更新。 */
const openNotes = shallowRef<Set<string>>(new Set())
/** 寬螢幕下點過編號、固定標亮的註釋編號（觸控裝置沒有 hover，點一下要有回饋）。 */
const pinnedNumber = ref<number | null>(null)

watch(
  () => props.source,
  () => {
    openNotes.value = new Set()
    pinnedNumber.value = null
  },
)

// 每次 render 歸零：同一則註釋被引用到第幾次，用來產生每個引用各自的 id
let refSeen = new Map<number, number>()
// >0 代表正在 render 註釋的內容：裡面不再產生註腳引用與有 id 的標題（見對應的 case）
let noteDepth = 0

// render() 走到第幾個 heading。每次從頭 render 都要歸零,
// 否則第二次渲染會從上次的位置接下去,id 全部對不上
let headingCursor = 0

// 連結與標題裡的註腳引用：註釋元素（邊注／展開框）不能長在 <a> 或 <h3> 裡面，
// 不然整塊註釋變成連結的一部分（點邊注會跳走，還會有 <a> 套 <a>），或被讀進標題的無障礙名稱。
// 所以 render 這兩種元素時開一個暫存區：註釋元素先收進去，等元素本身寫完再接在它後面。
// 編號按鈕：標題裡留在原地；連結裡也不能放（<a> 裡的 <button> 是巢狀的互動元件），
// 連同註釋一起接在連結後面。
interface Deferral {
  kind: 'link' | 'heading'
  markers: VNode[]
  notes: VNode[]
}
let deferral: Deferral | null = null

/**
 * 建出一個連結或標題元素，並把裡面註腳引用的註釋（連結的話還有編號）移到它後面。
 * `build` 必須同步把子節點 render 完（RouterLink 的 slot 是晚一點才執行的，要先算好再傳進去）。
 */
function withDeferral(kind: Deferral['kind'], build: () => VNode): VNode[] {
  const outer = deferral
  const mine: Deferral = { kind, markers: [], notes: [] }
  deferral = mine
  let el: VNode
  try {
    el = build()
  } finally {
    deferral = outer
  }
  // 連結在標題裡：連結的編號留在標題內（接在連結後面），註釋交給標題，等標題寫完再接在標題後面
  if (outer) {
    outer.notes.push(...mine.notes)
    return [el, ...mine.markers]
  }
  return [el, ...mine.markers, ...mine.notes]
}

function kids(node: MdNode): VNode[] {
  const children = node.children ?? []
  const out: VNode[] = []
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!
    const next = children[i + 1]
    // 緊接在文字後面的註腳編號：把文字的最後一個字交給它，兩者綁在一起換行（見 renderFootnoteRef）。
    // 連結裡的編號會被移到連結外面，最後一個字不能跟著走，所以連結裡不拆
    if (
      child.type === 'text' &&
      next?.type === 'footnoteReference' &&
      deferral?.kind !== 'link' &&
      liveFootnote(next)
    ) {
      const [head, lead] = splitLastChar(child.value ?? '')
      if (head) out.push(h('span', head))
      out.push(...renderFootnoteRef(next, lead))
      i++
      continue
    }
    out.push(...render(child))
  }
  return out
}

/** 這個引用對得到定義、而且不在註釋內容裡（註釋裡的巢狀引用不編號）才算「有效」。 */
function liveFootnote(node: MdNode): FootnoteInfo | undefined {
  if (noteDepth > 0) return undefined
  return node.identifier ? footnotes.value.byId.get(node.identifier) : undefined
}

/**
 * 一個節點 → 一個（或多個）vnode。
 *
 * 認不得的節點型別不會丟掉、也不會炸掉:直接往下 render 它的 children。
 * 這是刻意的——之後若加了 remark 外掛（例如 remark-directive），
 * 在這裡還沒對應處理之前，內容至少不會憑空消失。
 */
function render(node: MdNode): VNode[] {
  switch (node.type) {
    case 'root':
      return [...kids(node), ...renderEndNotes()]

    case 'text':
      return [h('span', node.value ?? '')]

    case 'paragraph':
      // 註釋元素是 <span>，長在內文的 <p> 裡面：註釋內容裡的區塊節點（段落、標題、清單）
      // 也只能用 <span>（display:block）畫，<p> 裡面不能有 <p>／<ul>／<h*>
      if (noteDepth > 0) return [h('span', { class: 'block' }, kids(node))]
      return [
        h(
          'p',
          { class: 'text-base leading-[1.6] text-(--text-ink-body) text-left sm:text-justify' },
          kids(node),
        ),
      ]

    case 'heading': {
      // 註釋內容裡的標題不編入目錄（extractHeadings 也略過了），這裡就不能去拿 headingCursor，
      // 不然後面所有標題的 id 會錯開一格
      if (noteDepth > 0) {
        return [h('span', { class: 'block font-bold text-(--text-ink-main)' }, kids(node))]
      }
      // 粗體標題，深度越深字越小，但都維持同一個形狀，不另外發明第二套標題語彙。
      // 以前前面有 accent 色的 `//`：那是程式碼註解的造型，放在圖譜、本體論這類技術頁合理，
      // 放在長文閱讀裡是雜訊（2026-09-29 拿掉，文章列表與首頁文章列同步拿掉）。
      const size = node.depth === 2 ? 'text-base' : node.depth === 3 ? 'text-[15px]' : 'text-sm'
      // id 從 headings 依序取，不在這裡自己算 slug——目錄跟這裡必須是同一份，
      // 分開算會漂移，而且症狀是「點目錄沒反應」，不會有任何錯誤訊息
      const slug = headings.value[headingCursor++]?.slug
      // 標題裡的註腳引用：編號留在標題裡，註釋元素接在標題後面（見 withDeferral）
      return withDeferral('heading', () =>
        h(
          'h3',
          {
            id: slug,
            // 導覽列（sticky，64px）+ MainLayout 捲動追蹤列（捲動超過 50px 才出現的
            // 第二層 sticky，45px）疊起來共 109px，捲到錨點時要留出兩層的總高度，
            // 不然標題會卡在追蹤列底下、只露出一半——scroll-mt-24（96px）當初只算了
            // 導覽列那一層，沒算到追蹤列，2026-09-25 使用者實測抓到這個落差才補上。
            class: `${size} font-bold text-(--text-ink-main) mt-8 mb-2.5 scroll-mt-32`,
          },
          kids(node),
        ),
      )
    }

    case 'footnoteReference':
      return renderFootnoteRef(node)

    // 定義不在原地印：內容收進文末的「註釋」清單，以及各自引用處的邊注／展開框
    case 'footnoteDefinition':
      return []

    case 'strong':
      return [h('strong', { class: 'font-bold text-(--text-ink-main)' }, kids(node))]

    case 'emphasis':
      return [h('em', { class: 'italic' }, kids(node))]

    case 'delete':
      return [h('del', { class: 'line-through opacity-70' }, kids(node))]

    case 'inlineCode':
      return [
        h(
          'code',
          {
            class:
              'font-mono text-[13px] [overflow-wrap:anywhere] bg-(--bg-folder) text-(--text-ink-main) rounded-[2px] px-1.5 py-0.5',
          },
          node.value ?? '',
        ),
      ]

    case 'code':
      // 區塊程式碼先不做語法高亮:那要再載一個 highlighter，而且
      // 目前沒有任何一篇文章證明需要它。等真的有需求再加（見 lang 欄位已經帶進來了）
      return [
        h(
          'pre',
          {
            class:
              'font-mono text-[12.5px] leading-6 bg-(--bg-folder) border border-(--border-shelf) rounded-[5px] p-3.5 overflow-x-auto my-4',
          },
          [h('code', { 'data-lang': node.lang ?? undefined }, node.value ?? '')],
        ),
      ]

    case 'link': {
      // 網址先過白名單（http／https／mailto、站內路徑、錨點，見 safeLink.ts）。
      // 不在白名單裡（javascript:、data: …）就只留連結文字，不產生任何 href
      const link = safeLink(node.url)
      if (!link) return kids(node)
      const cls =
        'text-(--text-accent) underline underline-offset-2 hover:opacity-80 transition-opacity duration-100 ease-out'
      // 站內連結用 RouterLink 而不是 <a>:這是走 AST 而不是 v-html 的主要理由之一。
      // v-html 塞出來的 <a href="/articles/x"> 會整頁重載，SPA 的狀態全部重來
      //
      // 連結文字裡的註腳引用：編號跟註釋接在連結後面（見 withDeferral）。
      // RouterLink 的 slot 是晚一點才執行的，而暫存區只在這個呼叫期間有效，所以子節點先 render 好再傳進去
      return withDeferral('link', () => {
        const inner = kids(node)
        return link.internal
          ? h(RouterLink, { to: link.href, class: cls }, () => inner)
          : h(
              'a',
              { href: link.href, target: '_blank', rel: 'noopener noreferrer', class: cls },
              inner,
            )
      })
    }

    case 'image': {
      // 圖片網址跟連結用同一套白名單；mailto 不是圖片，一併擋掉。不合格就只留替代文字
      const img = safeLink(node.url)
      if (!img || img.href.startsWith('mailto:')) return node.alt ? [h('span', node.alt)] : []
      return [
        h('img', {
          src: img.href,
          alt: node.alt ?? '',
          class: 'max-w-full rounded-[5px] border border-(--border-shelf) my-4',
          loading: 'lazy',
        }),
      ]
    }

    case 'list':
      // 註釋裡的清單用 <span>（display:block／list-item）加 role 畫，原因見 paragraph 的註解。
      // <span> 沒有 start 屬性，改用 counter-reset 讓有序清單從指定的數字開始
      if (noteDepth > 0) {
        return [
          h(
            'span',
            {
              role: 'list',
              style:
                node.ordered && node.start != null && node.start !== 1
                  ? { counterReset: `list-item ${node.start - 1}` }
                  : undefined,
              class: `block ${node.ordered ? 'list-decimal' : 'list-disc'} pl-5 my-1.5 marker:text-(--text-accent)`,
            },
            kids(node),
          ),
        ]
      }
      return [
        h(
          node.ordered ? 'ol' : 'ul',
          {
            start: node.ordered && node.start !== 1 ? (node.start ?? undefined) : undefined,
            class: `${node.ordered ? 'list-decimal' : 'list-disc'} pl-5 my-3 space-y-1.5 marker:text-(--text-accent)`,
          },
          kids(node),
        ),
      ]

    case 'listItem': {
      // GFM 的任務清單:checked 不是 null 就代表這是 [ ] / [x]。
      // 用 disabled 的 checkbox 而不是文字符號，螢幕閱讀器才讀得出勾選狀態
      const box =
        node.checked === null || node.checked === undefined
          ? []
          : [
              h('input', {
                type: 'checkbox',
                checked: node.checked,
                disabled: true,
                class: 'mr-2 accent-(--text-accent)',
              }),
            ]
      if (noteDepth > 0) {
        return [h('span', { role: 'listitem', class: 'list-item' }, [...box, ...kids(node)])]
      }
      return [
        h('li', { class: 'text-base leading-[1.6] text-(--text-ink-body)' }, [
          ...box,
          ...kids(node),
        ]),
      ]
    }

    case 'blockquote':
      return [
        h(
          'blockquote',
          {
            class:
              'border-l-[3px] border-(--text-accent) pl-4 my-4 text-(--text-ink-body) opacity-90',
          },
          kids(node),
        ),
      ]

    case 'thematicBreak':
      return [h('hr', { class: 'border-0 border-t border-(--border-shelf) my-8' })]

    case 'break':
      return [h('br')]

    // --- GFM 表格 ---
    case 'table': {
      const [head, ...body] = node.children ?? []
      return [
        h('div', { class: 'overflow-x-auto my-4' }, [
          h('table', { class: 'w-full border-collapse text-[13.5px]' }, [
            head ? h('thead', {}, renderRow(head, node.align, true)) : null,
            h(
              'tbody',
              {},
              body.map((r) => renderRow(r, node.align, false)),
            ),
          ]),
        ]),
      ]
    }

    default:
      // 認不得就把 children 攤出來，內容不會消失
      return kids(node)
  }
}

/**
 * 註釋內容。第一段接在編號後面同一行，之後的段落另起一行。
 * 段落、標題、清單在註釋裡都是 <span>（見 render 的 noteDepth 分支）；
 * 程式碼區塊、引用區塊、表格這類少見的區塊仍照一般方式 render（目前沒有改成 <span>）。
 */
function noteBody(definition: MdNode): VNode[] {
  noteDepth++
  try {
    return (definition.children ?? []).flatMap((block, i) =>
      block.type === 'paragraph'
        ? [h('span', { class: i > 0 ? 'block mt-1.5' : undefined }, kids(block))]
        : render(block),
    )
  } finally {
    noteDepth--
  }
}

function toggleNote(key: string) {
  const next = new Set(openNotes.value)
  if (!next.delete(key)) next.add(key)
  openNotes.value = next
}

function closeNote(key: string) {
  if (!openNotes.value.has(key)) return
  const next = new Set(openNotes.value)
  next.delete(key)
  openNotes.value = next
}

/**
 * 內文裡的編號 + 它的註釋。
 *
 * 一次引用產生兩個東西：上標的編號按鈕（連同前一個字包在 nowrap 的 span 裡，見下面 return），
 * 以及緊跟在 span 後面的註釋元素。
 * 寬螢幕：第一次引用的註釋是右邊的邊注（絕對定位，top 由 layoutSidenotes 對齊引用那一行）；
 *        同一則註釋的後續引用不再顯示（右邊只放一份）。
 *        標亮邊注：hover／聚焦只在「邊注緊鄰在編號後面」時有效（下面的 [:has(>sup:hover)+&]），
 *        也就是第一次引用；後續引用的 hover／聚焦不會標亮邊注。標題裡的引用，邊注接在標題後面、
 *        不緊鄰編號，也沒有 hover 標亮。點編號固定標亮（pinnedNumber，依註釋編號比對）對每一處引用都有效。
 * 窄螢幕：註釋預設隱藏，點編號（或 Enter／Space）在編號後面原地展開，Esc 收起並把焦點還給編號。
 * 註釋元素放在編號旁邊而不是文末，所以兩種模式都不需要另外算位置就能退化成「在那一行附近」。
 * 連結、標題裡的引用例外：註釋元素移到該連結／標題後面，連結裡的編號也一起移出（見 withDeferral）。
 */
function renderFootnoteRef(node: MdNode, lead = ''): VNode[] {
  const info = liveFootnote(node)
  // 註釋內容裡的巢狀引用、或找不到定義的引用（remark-gfm 正常不會產生）：留成原本的文字，不吞掉
  if (!info) return [h('span', `[^${node.label ?? node.identifier ?? ''}]`)]

  const n = info.number
  const k = (refSeen.get(n) ?? 0) + 1
  refSeen.set(n, k)
  const key = `${n}-${k}`
  const refId = `${uid}-fnref-${key}`
  const noteId = `${uid}-fnnote-${key}`
  const firstNoteId = `${uid}-fnnote-${n}-1`

  const side = sideMode.value
  const isFirst = k === 1
  const open = openNotes.value.has(key)
  const lit = pinnedNumber.value === n

  // 編號是行內的小上標數字，不是徽章：不加底、不加框，也不撐高行高；
  // 「開著」的狀態用粗體加底線表示（hover 只加底線，兩者看得出差別）
  const active = side ? lit : open
  const markerClass = [
    'relative inline px-[1px] py-0 rounded-[2px] leading-none tabular-nums cursor-pointer scroll-mt-36 transition-colors duration-100 ease-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)',
    // 加大點擊範圍到約 44px，手指點得到；上標的數字本身只有十來 px 高
    'after:content-[""] after:absolute after:-inset-x-3.5 after:-inset-y-4',
    active
      ? 'font-bold text-(--text-accent) underline decoration-2 underline-offset-2'
      : 'font-medium text-(--text-ink-main) underline-offset-2 hover:text-(--text-accent) hover:underline',
  ].join(' ')

  const showAsSidenote = side && isFirst
  const noteVisible = showAsSidenote || (!side && open)
  const noteClass = showAsSidenote
    ? [
        // 欄寬與間距的來由見 SIDE_QUERY 的註解；1240px 以上目錄移到左欄，邊注欄就多給一點
        'absolute block w-[232px] left-[calc(100%+28px)] min-[1240px]:w-[248px] min-[1240px]:left-[calc(100%+32px)]',
        'pl-3 border-l-2 text-sm leading-[1.5] text-left',
        lit
          ? 'border-(--text-ink-main) text-(--text-ink-main)'
          : 'border-(--border-shelf) text-(--text-ink-muted) [:has(>sup:hover)+&]:border-(--text-ink-main) [:has(>sup:hover)+&]:text-(--text-ink-main) [:has(>sup:focus-within)+&]:border-(--text-ink-main) [:has(>sup:focus-within)+&]:text-(--text-ink-main)',
      ].join(' ')
    : 'block my-2 px-4 py-3 border border-(--border-shelf) border-l-2 border-l-(--text-ink-main) rounded-r-[6px] bg-(--bg-folder) text-sm leading-[1.5] text-(--text-ink-body) text-left'

  // 前一個字（lead）跟編號包進同一個 nowrap 的 span：中文任兩字之間都能斷行，
  // 編號是不能再拆的行內方塊，會被單獨推到下一行開頭、跟前一個字分開。試過在編號前放 U+2060
  // （WORD JOINER），Chromium 對這種行內方塊不認，所以只能用 nowrap 把兩者綁在一起。
  // 註釋元素（note）留在這個 span 外面：它是區塊或絕對定位，不能繼承 nowrap。
  const marker = h('span', { class: 'whitespace-nowrap' }, [
    lead,
    h('sup', {}, [
      h(
        'button',
        {
          type: 'button',
          id: refId,
          class: markerClass,
          'aria-label': `註 ${n}`,
          'data-fn-number': n,
          // 寬螢幕註釋一直看得到，用 describedby 對上；窄螢幕是展開／收起，用 expanded + controls
          ...(side
            ? { 'aria-describedby': firstNoteId }
            : { 'aria-expanded': String(open), 'aria-controls': noteId }),
          onClick: () => {
            if (side) pinnedNumber.value = lit ? null : n
            else toggleNote(key)
          },
          onKeydown: (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !side && open) {
              e.preventDefault()
              closeNote(key)
            }
          },
        },
        String(n),
      ),
    ]),
  ])
  const note = h(
    'span',
    {
      id: noteId,
      class: noteVisible ? noteClass : 'hidden',
      hidden: noteVisible ? undefined : true,
      'data-fn-side': showAsSidenote ? '' : undefined,
      'data-fn-marker': showAsSidenote ? refId : undefined,
      onKeydown: (e: KeyboardEvent) => {
        // 展開框裡的連結也能按 Esc 收起，焦點回到編號，鍵盤使用者不會掉到頁首
        if (e.key === 'Escape' && !side && open) {
          e.preventDefault()
          e.stopPropagation()
          closeNote(key)
          document.getElementById(refId)?.focus()
        }
      },
    },
    [
      h(
        'span',
        { class: 'inline-block min-w-[18px] mr-2 font-bold text-(--text-ink-main)' },
        String(n),
      ),
      ...noteBody(info.definition),
    ],
  )

  // 在連結或標題裡面：註釋元素（連結的話還有編號）先放進暫存區，由外層接在自己後面（見 withDeferral）
  if (deferral) {
    deferral.notes.push(note)
    if (deferral.kind === 'link') {
      deferral.markers.push(marker)
      return []
    }
    return [marker]
  }
  return [marker, note]
}

/** 文末的「註釋」清單：每一則註釋的正規形式，不依賴邊注或展開框，任何螢幕寬度、版面計算失敗時都在。 */
function renderEndNotes(): VNode[] {
  const list = footnotes.value.list
  if (!list.length) return []
  const titleId = `${uid}-fn-title`
  return [
    h(
      'section',
      { class: 'mt-12 border-t border-(--border-shelf) pt-4', 'aria-labelledby': titleId },
      [
        h(
          'h3',
          { id: titleId, class: 'text-base font-bold text-(--text-ink-main) mb-2.5' },
          '註釋',
        ),
        h(
          'ol',
          {
            class:
              'list-decimal pl-6 space-y-1.5 text-sm leading-[1.5] text-(--text-ink-body) marker:text-(--text-accent)',
          },
          list.map((info) =>
            h('li', { id: `${uid}-fn-${info.number}`, class: 'pl-1 scroll-mt-32' }, [
              ...noteBody(info.definition),
              ...backLinks(info),
            ]),
          ),
        ),
      ],
    ),
  ]
}

/** 回到內文引用處的連結。被引用多次就每次一個；孤兒定義（沒有引用）沒有地方可回，不給。 */
function backLinks(info: FootnoteInfo): VNode[] {
  const links: VNode[] = []
  for (let k = 1; k <= info.refCount; k++) {
    links.push(
      h(
        'a',
        {
          href: `#${uid}-fnref-${info.number}-${k}`,
          'aria-label': info.refCount > 1 ? `回到內文第 ${k} 處引用` : '回到內文引用',
          class:
            'ml-2 inline-block px-1 text-(--text-ink-muted) hover:text-(--text-accent) transition-colors duration-100 ease-out whitespace-nowrap',
        },
        // U+FE0E 要求文字樣式，不然部分系統把 ↩ 畫成彩色 emoji
        info.refCount > 1 ? `↩︎ ${k}` : '↩︎',
      ),
    )
  }
  return links
}

// --- 邊注排版 ---
// 邊注是絕對定位的，top 要靠量出來的引用位置決定；註釋太密時後面的往下推，永遠不重疊。
// 量的時機：掛載、寬窄模式／固定標亮／展開狀態改變、視窗縮放、容器尺寸變動（圖片載入、換行改變）、字型載入完成。
// 任何一步沒跑到也不會壞：沒有 top 的邊注會停在它被寫出來的那一行附近（絕對定位的預設位置），
// 文末清單不受影響。
function layoutSidenotes() {
  const root = rootEl.value
  if (!root) return
  const notes = Array.from(root.querySelectorAll<HTMLElement>('[data-fn-side]'))
  if (!sideMode.value) {
    notes.forEach((note) => (note.style.top = ''))
    return
  }
  const base = root.getBoundingClientRect().top
  const placed: HTMLElement[] = []
  const tops: number[] = []
  const heights: number[] = []
  for (const note of notes) {
    const marker = document.getElementById(note.dataset.fnMarker ?? '')
    if (!marker) continue
    // -3px：讓邊注第一行的文字跟編號所在的那一行對齊（編號是上標，比行的中線高一點）
    tops.push(marker.getBoundingClientRect().top - base - 3)
    heights.push(note.offsetHeight)
    placed.push(note)
  }
  stackSidenotes(tops, heights).forEach((top, i) => (placed[i]!.style.top = `${top}px`))
}

let layoutFrame = 0
function scheduleLayout() {
  if (layoutFrame) return
  const raf =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (fn: () => void) => setTimeout(fn, 0)
  layoutFrame = raf(() => {
    layoutFrame = 0
    layoutSidenotes()
  }) as unknown as number
}

let media: MediaQueryList | null = null
let resizeObserver: ResizeObserver | null = null
const onMediaChange = () => {
  sideMode.value = !!media?.matches
}

// 這個元件自己的狀態（寬窄模式、固定標亮、展開的註釋）改變後重排。
// 這些狀態是在函式型子元件 Rendered 裡讀的，重繪的是 Rendered，不是這個元件，
// 所以 onUpdated 不會觸發；要靠 watch。flush: 'post' 等 DOM 更新完才量。
watch(
  [sideMode, pinnedNumber, openNotes],
  () => {
    if (props.sidenotes) scheduleLayout()
  },
  { flush: 'post' },
)

onMounted(() => {
  // 沒開邊注（例如編輯頁預覽）就沒有東西要排，不掛任何監聽
  if (!props.sidenotes) return
  if (typeof window.matchMedia === 'function') {
    media = window.matchMedia(SIDE_QUERY)
    sideMode.value = media.matches
    media.addEventListener('change', onMediaChange)
  }
  window.addEventListener('resize', scheduleLayout)
  window.addEventListener('load', scheduleLayout)
  if (typeof ResizeObserver === 'function' && rootEl.value) {
    resizeObserver = new ResizeObserver(scheduleLayout)
    resizeObserver.observe(rootEl.value)
  }
  void document.fonts?.ready.then(scheduleLayout)
  scheduleLayout()
})
onBeforeUnmount(() => {
  media?.removeEventListener('change', onMediaChange)
  window.removeEventListener('resize', scheduleLayout)
  window.removeEventListener('load', scheduleLayout)
  resizeObserver?.disconnect()
  if (layoutFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(layoutFrame)
})

/** 見 template 下方註解:參考必須穩定，不能每次 render 都造一個新的。 */
const Rendered = () => {
  headingCursor = 0
  refSeen = new Map()
  noteDepth = 0
  deferral = null
  return render(tree.value)
}

defineExpose({ headings })

function renderRow(row: MdNode, align: MdNode['align'], isHead: boolean): VNode {
  const cells = (row.children ?? []).map((cell, i) => {
    const a = align?.[i]
    return h(
      isHead ? 'th' : 'td',
      {
        class: [
          'border border-(--border-shelf) px-3 py-2',
          isHead ? 'bg-(--bg-folder) font-bold text-(--text-ink-main)' : 'text-(--text-ink-body)',
          a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left',
        ],
      },
      render(cell),
    )
  })
  return h('tr', {}, cells)
}
</script>

<script lang="ts">
// 走訪的進入點做成一個具名的函式型元件並保持同一個參考。
// 寫成 <component :is="() => render(tree)" /> 的話每次 render 都會產生一個
// 新的函式，Vue 會當成「換了一個元件」而整棵重新掛載，狀態與捲動位置都會掉。
export default {}
</script>

<template>
  <div ref="rootEl" class="markdown-body relative">
    <component :is="Rendered" />
  </div>
</template>
