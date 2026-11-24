<script setup lang="ts">
// 文章內頁的心智圖（站主定案：C 左右對稱、最多 2 層、次要節點預設收合、橫向關係開關預設關、
// 點詞看出處並跳到段落、手機改大綱樹、延遲載入）。
// 有 res_id 的詞連到圖譜原本也定了，但目前不畫（見 mindmapUnits.ts）。
// 放在前言之後、第一個二級標題之前（由 ArticleDetailView 透過 MarkdownBody 的插槽放進去）。
//
// 這篇沒有心智圖、資料載入失敗或不合格式：整塊不畫，連標題都沒有。
// 能懸停、指標精準的裝置（桌機）畫 SVG 圖，不管視窗多窄（窄的時候圖等比縮小）；觸控裝置改成大綱樹
// （ArticleMindmapOutline）。看裝置不看寬度，條件見 useFinePointer.ts。展開狀態與橫向關係開關兩邊共用。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import BaseSwitch from '@/components/BaseSwitch.vue'
import ArticleMindmapDiagram from './ArticleMindmapDiagram.vue'
import ArticleMindmapOutline from './ArticleMindmapOutline.vue'
import ArticleMindmapUnitList from './ArticleMindmapUnitList.vue'
import { loadArticleMindmap } from './articleMindmapSource'
import type { ArticleMindmap, MindmapNode } from './articleMindmapTypes'
import { DETAIL_METRICS, layoutMindmap, type PositionedLabel } from './mindmapLayout'
import { branchesOf, buildDetailSpec, centerOf, linkLineLabel } from './mindmapTree'
import { measureLabelWidth } from './measureLabel'
import { unitLinksOf, type MindmapHeading } from './mindmapUnits'
import { useMindmapFonts } from './useMindmapFonts'
import { useFinePointer } from './useFinePointer'

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
/** true 畫 SVG 圖、false 畫大綱樹 */
const finePointer = useFinePointer()

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

/**
 * 工具列的「次要概念」開關：開＝全部分枝的次要都展開（含本身是次要的分枝），關＝全部收合。
 * 圖裡每個分枝的「＋N 次要」可以單獨展開；全部都展開了，開關也就顯示成開。
 */
const showSecondaries = computed({
  get: () => allExpanded.value,
  set: (on: boolean) => {
    expanded.value = on && mindmap.value ? new Set([...expandable.value, mindmap.value.center]) : new Set()
  },
})

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

/** 可以點開的詞：有出處（對得上內文段落） */
const clickable = computed(() => {
  const ids = new Set<string>()
  for (const n of mindmap.value?.nodes ?? []) {
    if (unitLinksOf(n, props.headings).length > 0) ids.add(n.id)
  }
  return ids
})

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
      <!-- 兩個開關都只是顯示或隱藏圖的某一部分，所以用同一種控制項（站主 2026-11-25），預設都關 -->
      <div
        v-if="hasSecondaries || mindmap.links.length > 0"
        :class="[
          'flex flex-wrap items-center gap-x-4 gap-y-1 px-2.5 border-b border-(--border-shelf)',
          finePointer ? 'min-h-10' : 'min-h-11 py-1.5',
        ]"
      >
        <BaseSwitch v-if="hasSecondaries" v-model="showSecondaries" label="次要概念" />
        <BaseSwitch v-if="mindmap.links.length > 0" v-model="showLinks" label="橫向關係" />
      </div>

      <!-- 桌機：SVG 圖 -->
      <div v-if="finePointer" ref="canvasEl" class="relative">
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
        </div>
      </div>

      <!-- 觸控裝置：大綱樹 -->
      <ArticleMindmapOutline
        v-else
        :mindmap="mindmap"
        :headings="headings"
        :expanded="expanded"
        :show-links="showLinks"
        @toggle-secondaries="toggleBranch"
      />

      <!-- 說明列只在橫向關係打開時才有內容（線的畫法），沒有內容就整列不畫 -->
      <div
        v-if="showLinks && (hasTypedLinks || hasUntypedLinks || (finePointer && detail.hiddenLinkCount > 0))"
        class="flex flex-wrap items-center gap-x-4 gap-y-0.5 min-h-12 px-3 py-1.5 border-t border-(--border-shelf) text-xs leading-[18px] text-(--text-ink-muted)"
      >
        <span v-if="hasTypedLinks" class="inline-flex items-center gap-1">
          <svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke-width="1.5" class="stroke-(--text-accent)" /></svg>
          {{ finePointer ? '有類型的橫向關係' : '有類型' }}
        </span>
        <span v-if="hasUntypedLinks" class="inline-flex items-center gap-1">
          <svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke-width="1.5" stroke-dasharray="5 4" class="stroke-(--accent-secondary)" /></svg>
          只是常一起出現
        </span>
        <!-- 大綱樹的關係是文字，不受另一端收合影響，只有圖才有「連到收合的節點」 -->
        <span v-if="finePointer && detail.hiddenLinkCount > 0">另有 {{ detail.hiddenLinkCount }} 條連到收合的節點</span>
      </div>
    </div>
  </section>
</template>
