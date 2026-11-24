<script setup lang="ts">
// 文章內頁的心智圖（站主定案：C 左右對稱、最多 2 層、次要節點預設收合、橫向關係開關預設關、
// 點詞看出處並跳到段落、有 res_id 的詞連到圖譜、手機改大綱樹、延遲載入）。
// 放在前言之後、第一個二級標題之前（由 ArticleDetailView 透過 MarkdownBody 的插槽放進去）。
//
// 這篇沒有心智圖、資料載入失敗或不合格式：整塊不畫，連標題都沒有。
// 寬度 ≥640px 畫 SVG 圖；更窄改成大綱樹（ArticleMindmapOutline）。兩份用 CSS 二選一，
// 隱藏的那份不進無障礙樹；展開狀態與橫向關係開關兩邊共用。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BaseSwitch from '@/components/BaseSwitch.vue'
import ArticleMindmapDiagram from './ArticleMindmapDiagram.vue'
import ArticleMindmapOutline from './ArticleMindmapOutline.vue'
import ArticleMindmapUnitList from './ArticleMindmapUnitList.vue'
import { loadArticleMindmap } from './articleMindmapSource'
import type { ArticleMindmap, MindmapNode } from './articleMindmapTypes'
import { DETAIL_METRICS, layoutMindmap, type PositionedLabel } from './mindmapLayout'
import { branchesOf, buildDetailSpec, centerOf, linkLineLabel } from './mindmapTree'
import { measureLabelWidth } from './measureLabel'
import { MINDMAP_GRAPH_ROUTE, unitLinksOf, type MindmapHeading } from './mindmapUnits'
import { useMindmapFonts } from './useMindmapFonts'

const props = defineProps<{
  articleId: number
  /** 這篇文章的標題（extractHeadings），出處要對上段落的錨點 */
  headings: readonly MindmapHeading[]
}>()

/** 框寬 640（正文欄寬），扣掉左右框線 */
const CANVAS_WIDTH = 638
/** 彈出框寬 */
const POPOVER_WIDTH = 240

const mindmap = shallowRef<ArticleMindmap | null>(null)
const fontsVersion = useMindmapFonts()

watch(
  () => props.articleId,
  async (id) => {
    mindmap.value = null
    const data = await loadArticleMindmap(id)
    // 等資料時已經換到別篇，就不寫回
    if (id === props.articleId) mindmap.value = data
  },
  { immediate: true },
)

/** 展開了次要節點的分枝；含中心 id 代表「全部展開」（本身是次要的分枝也露出） */
const expanded = ref<ReadonlySet<string>>(new Set())
const showLinks = ref(false)
const selectedId = ref<string | null>(null)

const nodeById = computed(() => new Map((mindmap.value?.nodes ?? []).map((n) => [n.id, n])))
const branchList = computed(() => (mindmap.value ? branchesOf(mindmap.value) : []))
const expandable = computed(() => branchList.value.filter((b) => b.secondaries.length > 0).map((b) => b.node.id))
const hasSecondaries = computed(() => (mindmap.value?.nodes ?? []).some((n) => n.strength === 'secondary'))
const allExpanded = computed(() => expandable.value.every((id) => expanded.value.has(id)) && expanded.value.size > 0)

function toggleAll() {
  if (!mindmap.value) return
  expanded.value = allExpanded.value ? new Set() : new Set([...expandable.value, mindmap.value.center])
}

function toggleBranch(branchId: string) {
  const next = new Set(expanded.value)
  if (next.has(branchId)) next.delete(branchId)
  else next.add(branchId)
  next.delete(mindmap.value?.center ?? '')
  expanded.value = next
}

const detail = computed(() => {
  void fontsVersion.value
  if (!mindmap.value) return null
  const { spec, hiddenLinkCount } = buildDetailSpec(mindmap.value, expanded.value, linkLineLabel, showLinks.value)
  return { layout: layoutMindmap(spec, DETAIL_METRICS, measureLabelWidth, CANVAS_WIDTH), hiddenLinkCount }
})

const title = computed(() => (mindmap.value ? `文章心智圖：${centerOf(mindmap.value).label}` : ''))
const branchLabels = computed(() => new Map(branchList.value.map((b) => [b.node.id, b.node.label])))

/** 可以點開的詞：有出處（對得上內文段落）或連得到圖譜 */
const clickable = computed(() => {
  const ids = new Set<string>()
  for (const n of mindmap.value?.nodes ?? []) {
    if (n.res_id !== null || unitLinksOf(n, props.headings).length > 0) ids.add(n.id)
  }
  return ids
})

const hasGraphLinks = computed(() => (mindmap.value?.nodes ?? []).some((n) => n.res_id !== null))
const hasTypedLinks = computed(() => (mindmap.value?.links ?? []).some((l) => l.type !== null))
const hasUntypedLinks = computed(() => (mindmap.value?.links ?? []).some((l) => l.type === null))

// --- 桌機：點詞出現的彈出框 ---
const canvasEl = ref<HTMLElement | null>(null)
const popoverEl = ref<HTMLElement | null>(null)
const popoverPos = ref({ left: 0, top: 0 })
const selectedNode = computed<MindmapNode | null>(() =>
  selectedId.value ? (nodeById.value.get(selectedId.value) ?? null) : null,
)
const selectedUnits = computed(() => (selectedNode.value ? unitLinksOf(selectedNode.value, props.headings) : []))

async function selectNode(label: PositionedLabel) {
  if (selectedId.value === label.id) {
    closePopover(true)
    return
  }
  selectedId.value = label.id
  const canvas = canvasEl.value
  const layout = detail.value?.layout
  if (canvas && layout) {
    const svg = canvas.querySelector('svg')
    const scale = svg && svg.clientWidth > 0 ? svg.clientWidth / layout.viewBox[2] : 1
    const offsetX = svg ? svg.getBoundingClientRect().left - canvas.getBoundingClientRect().left : 0
    const left = offsetX + (label.x1 - layout.viewBox[0]) * scale
    const maxLeft = Math.max(0, canvas.clientWidth - POPOVER_WIDTH - 6)
    popoverPos.value = {
      left: Math.min(Math.max(6, left), maxLeft),
      top: (label.y - layout.viewBox[1]) * scale + 8,
    }
  }
  await nextTick()
  // 焦點移進彈出框，下一個 Tab 就是裡面的段落連結；Esc 再回到原本的詞
  popoverEl.value?.focus()
}

function closePopover(restoreFocus: boolean) {
  const id = selectedId.value
  selectedId.value = null
  if (restoreFocus && id) {
    void nextTick(() => {
      canvasEl.value?.querySelector<SVGGElement>(`[data-node-id="${CSS.escape(id)}"][role="button"]`)?.focus()
    })
  }
}

function onPopoverKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    closePopover(true)
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!selectedId.value) return
  const target = event.target as Element | null
  // 點在彈出框裡、或點另一個詞（那邊自己會換）不關
  if (target && (popoverEl.value?.contains(target) || target.closest?.('[data-node-id][role="button"]'))) return
  closePopover(false)
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

// 換了展開狀態或開關，詞的位置會變，彈出框不再指著它
watch([expanded, showLinks], () => {
  selectedId.value = null
})

const TOOLBAR_BUTTON_CLASS =
  'inline-flex items-center h-7 px-2.5 rounded-[4px] border border-[color-mix(in_srgb,var(--text-ink-main)_35%,transparent)] bg-transparent text-(length:--type-label-size) leading-5 text-(--text-ink-body) cursor-pointer hover:border-[color-mix(in_srgb,var(--text-ink-main)_65%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)'
</script>

<template>
  <section v-if="mindmap && detail" class="mb-(--article-paragraph-gap)" aria-labelledby="article-mindmap-heading">
    <!-- h3：內文的段落標題都是 h3（MarkdownBody），用 h2 會讓整篇的段落在標題清單裡變成這一節底下的子節。
         字樣照線框：15px 襯線粗體、行高 24、下距 10 -->
    <h3
      id="article-mindmap-heading"
      class="mt-0 mb-2.5 block font-serif font-bold text-[15px] leading-6 tracking-normal text-(--text-ink-main)"
    >
      文章心智圖
    </h3>
    <div class="relative rounded-[6px] border border-(--border-shelf) bg-(--canvas-bg)">
      <div
        class="flex flex-wrap items-center justify-between sm:justify-start gap-2 min-h-11 sm:min-h-10 px-2.5 py-1.5 sm:py-0 border-b border-(--border-shelf)"
      >
        <button
          v-if="hasSecondaries"
          type="button"
          :class="TOOLBAR_BUTTON_CLASS"
          @click="toggleAll"
        >
          {{ allExpanded ? '收合次要' : '展開次要' }}
        </button>
        <BaseSwitch v-if="mindmap.links.length > 0" v-model="showLinks" label="橫向關係" />
      </div>

      <!-- 桌機：SVG 圖 -->
      <div ref="canvasEl" class="relative hidden sm:block">
        <ArticleMindmapDiagram
          :layout="detail.layout"
          :title="title"
          surface="canvas"
          interactive
          :clickable="clickable"
          :selected-id="selectedId"
          :expanded="expanded"
          :branch-labels="branchLabels"
          class="mx-auto"
          @select-node="selectNode"
          @toggle-branch="toggleBranch"
        />
        <div
          v-if="selectedNode"
          ref="popoverEl"
          role="dialog"
          :aria-label="selectedNode.label"
          tabindex="-1"
          class="absolute z-10 rounded-[6px] border border-(--edge-real) bg-(--bg-page) px-2.5 py-2 text-(length:--type-label-size) leading-5 text-(--text-ink-body) outline-none"
          :style="{ left: `${popoverPos.left}px`, top: `${popoverPos.top}px`, width: `${POPOVER_WIDTH}px` }"
          @keydown="onPopoverKeydown"
        >
          <div class="text-sm font-bold text-(--text-ink-main)">{{ selectedNode.label }}</div>
          <ArticleMindmapUnitList v-if="selectedUnits.length > 0" :units="selectedUnits" @navigate="closePopover(false)" />
          <RouterLink
            v-if="selectedNode.res_id !== null"
            :to="MINDMAP_GRAPH_ROUTE"
            class="block mt-1 pt-1 border-t border-(--border-shelf) font-semibold text-(--text-accent) hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--text-accent)"
          >
            ↗ 前往圖譜
          </RouterLink>
        </div>
      </div>

      <!-- 手機：大綱樹 -->
      <ArticleMindmapOutline
        class="sm:hidden"
        :mindmap="mindmap"
        :headings="headings"
        :expanded="expanded"
        :show-links="showLinks"
        @toggle-secondaries="toggleBranch"
      />

      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-0.5 min-h-12 px-3 py-1.5 border-t border-(--border-shelf) text-xs leading-[18px] text-(--text-ink-muted)"
      >
        <span>點詞跳到文章段落</span>
        <span v-if="hasGraphLinks"><span class="font-bold text-(--text-accent)" aria-hidden="true">↗</span> 連到圖譜</span>
        <template v-if="showLinks">
          <span v-if="hasTypedLinks" class="inline-flex items-center gap-1">
            <svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke-width="1.5" class="stroke-(--text-accent)" /></svg>
            <span class="sm:hidden">有類型</span><span class="hidden sm:inline">有類型的橫向關係</span>
          </span>
          <span v-if="hasUntypedLinks" class="inline-flex items-center gap-1">
            <svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke-width="1.5" stroke-dasharray="5 4" class="stroke-(--accent-secondary)" /></svg>
            只是常一起出現
          </span>
          <span v-if="detail.hiddenLinkCount > 0" class="hidden sm:inline">另有 {{ detail.hiddenLinkCount }} 條連到收合的節點</span>
        </template>
      </div>
    </div>
  </section>
</template>
