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
import { computed, h, type VNode } from 'vue'
import { RouterLink } from 'vue-router'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

const props = defineProps<{ source: string }>()

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
  lang?: string | null
  align?: (('left' | 'right' | 'center') | null)[]
  children?: MdNode[]
}

const processor = unified().use(remarkParse).use(remarkGfm)

const tree = computed(() => processor.parse(props.source) as unknown as MdNode)

/** 站內連結走 RouterLink，站外開新分頁並補 rel。判斷依據是「有沒有協定」。 */
function isInternal(url: string): boolean {
  return url.startsWith('/') || url.startsWith('#')
}

function kids(node: MdNode): VNode[] {
  return (node.children ?? []).flatMap(render)
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
      return kids(node)

    case 'text':
      return [h('span', node.value ?? '')]

    case 'paragraph':
      return [h('p', { class: 'text-[15px] leading-8 text-(--text-ink-body) text-justify' }, kids(node))]

    case 'heading': {
      // 沿用文章頁既有的 h3 樣式:accent 色的 // 前綴加粗體標題。
      // 深度越深字越小，但都維持同一個形狀，不另外發明第二套標題語彙。
      const size = node.depth === 2 ? 'text-base' : node.depth === 3 ? 'text-[15px]' : 'text-sm'
      return [
        h('h3', { class: `${size} font-bold text-(--text-ink-main) flex items-center gap-2 mt-8 mb-2.5` }, [
          h('span', { class: 'text-(--text-accent)' }, '//'),
          h('span', {}, kids(node)),
        ]),
      ]
    }

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
          { class: 'font-mono text-[13px] bg-(--bg-folder) text-(--text-ink-main) rounded-[2px] px-1.5 py-0.5' },
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
      const url = node.url ?? ''
      const cls = 'text-(--text-accent) underline underline-offset-2 hover:opacity-80 transition-opacity duration-100 ease-out'
      // 站內連結用 RouterLink 而不是 <a>:這是走 AST 而不是 v-html 的主要理由之一。
      // v-html 塞出來的 <a href="/articles/x"> 會整頁重載，SPA 的狀態全部重來
      return isInternal(url)
        ? [h(RouterLink, { to: url, class: cls }, () => kids(node))]
        : [h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: cls }, kids(node))]
    }

    case 'image':
      return [
        h('img', {
          src: node.url,
          alt: node.alt ?? '',
          class: 'max-w-full rounded-[5px] border border-(--border-shelf) my-4',
          loading: 'lazy',
        }),
      ]

    case 'list':
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
          : [h('input', { type: 'checkbox', checked: node.checked, disabled: true, class: 'mr-2 accent-(--text-accent)' })]
      return [h('li', { class: 'text-[15px] leading-7 text-(--text-ink-body)' }, [...box, ...kids(node)])]
    }

    case 'blockquote':
      return [
        h(
          'blockquote',
          { class: 'border-l-[3px] border-(--text-accent) pl-4 my-4 text-(--text-ink-body) opacity-90' },
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
            h('tbody', {}, body.map((r) => renderRow(r, node.align, false))),
          ]),
        ]),
      ]
    }

    default:
      // 認不得就把 children 攤出來，內容不會消失
      return kids(node)
  }
}

/** 見 template 下方註解:參考必須穩定，不能每次 render 都造一個新的。 */
const Rendered = () => render(tree.value)

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
  <div class="markdown-body">
    <component :is="Rendered" />
  </div>
</template>
