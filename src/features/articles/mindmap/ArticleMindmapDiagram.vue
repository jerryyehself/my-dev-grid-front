<script setup lang="ts">
// 把 mindmapLayout 排好的座標畫成 SVG。清單懸停與內頁共用：懸停版只是圖（role="img"），
// 內頁版的詞可以點（看出處、連圖譜）、「＋N 次要」可以展開。
//
// 樣式照線框：線條與底線用 --edge-real、中心底線用 --text-accent；字外圍描一圈跟底色同色的邊
// （paint-order: stroke），線從字後面穿過時字還是讀得到。底色由 surface 決定：
// 懸停提示框是 --bg-folder，內頁框是 --canvas-bg。
import { computed } from 'vue'
import { CHIP_PREFIX } from './mindmapTree'
import type { MindmapLayout, PositionedLabel } from './mindmapLayout'

const props = withDefaults(
  defineProps<{
    layout: MindmapLayout
    /** 整張圖的名稱（螢幕報讀器） */
    title: string
    surface: 'folder' | 'canvas'
    /** 詞可以點。false 時整張圖是 role="img" */
    interactive?: boolean
    /** 可以點開的詞（有出處或連得到圖譜） */
    clickable?: ReadonlySet<string>
    /** 目前點開的詞 */
    selectedId?: string | null
    /** 展開中的分枝（決定「＋N 次要」鈕的 aria-expanded） */
    expanded?: ReadonlySet<string>
    /** 收合鈕的無障礙名稱要帶分枝名，避免每個都只唸「＋2 次要」 */
    branchLabels?: ReadonlyMap<string, string>
  }>(),
  {
    interactive: false,
    clickable: () => new Set<string>(),
    selectedId: null,
    expanded: () => new Set<string>(),
    branchLabels: () => new Map<string, string>(),
  },
)

const emit = defineEmits<{ selectNode: [label: PositionedLabel]; toggleBranch: [branchId: string] }>()

const viewBox = computed(() => props.layout.viewBox.join(' '))
const haloClass = computed(() => (props.surface === 'folder' ? 'stroke-(--bg-folder)' : 'stroke-(--canvas-bg)'))

/** 字的位置：底線上方，字級越大離越遠（線框：16px 離 12、15／14px 離 11、13px 離 10） */
function textY(label: PositionedLabel): number {
  return label.y - Math.round(label.fontSize * 0.75)
}

function isChip(label: PositionedLabel): boolean {
  return label.kind === 'chip'
}

function branchOfChip(label: PositionedLabel): string {
  return label.id.slice(CHIP_PREFIX.length)
}

function isButton(label: PositionedLabel): boolean {
  return props.interactive && (isChip(label) || props.clickable.has(label.id))
}

function textClass(label: PositionedLabel): string[] {
  const selected = props.selectedId === label.id
  const base = ['[paint-order:stroke]', 'stroke-4', '[stroke-linejoin:round]', haloClass.value]
  if (selected) return [...base, 'fill-(--text-accent)', 'font-bold']
  switch (label.kind) {
    case 'center':
      return [...base, 'fill-(--text-ink-main)', 'font-serif', 'font-bold']
    case 'branch':
      return [...base, 'fill-(--text-ink-main)', 'font-bold']
    case 'primary':
      return [...base, 'fill-(--text-ink-body)', 'font-medium']
    case 'secondary':
      return [...base, 'fill-(--text-ink-muted)', 'font-normal']
    case 'chip':
      return [...base, 'fill-(--text-accent)', 'font-semibold']
  }
}

function underlineClass(label: PositionedLabel): string {
  if (props.selectedId === label.id || label.kind === 'center' || label.kind === 'chip') return 'stroke-(--text-accent)'
  return 'stroke-(--edge-real)'
}

function underlineWidth(label: PositionedLabel): number {
  if (props.selectedId === label.id) return 2
  return { center: 2, branch: 1.4, primary: 1.25, secondary: 1, chip: 1 }[label.kind]
}

function ariaLabel(label: PositionedLabel): string {
  if (isChip(label)) return `${label.label}：${props.branchLabels.get(branchOfChip(label)) ?? ''}`
  return label.label
}

function activate(label: PositionedLabel) {
  if (isChip(label)) emit('toggleBranch', branchOfChip(label))
  else emit('selectNode', label)
}
</script>

<template>
  <svg
    :viewBox="viewBox"
    :width="layout.viewBox[2]"
    :height="layout.viewBox[3]"
    class="block max-w-full h-auto"
    :role="interactive ? 'group' : 'img'"
    :aria-label="title"
  >
    <path
      v-for="edge in layout.edges"
      :key="edge.id"
      :d="edge.d"
      class="fill-none stroke-(--edge-real)"
      stroke-width="1.25"
    />
    <path
      v-for="link in layout.crossLinks"
      :key="`${link.source}-${link.target}`"
      :d="link.d"
      :class="['fill-none', link.typed ? 'stroke-(--text-accent)' : 'stroke-(--accent-secondary)']"
      stroke-width="1.5"
      :stroke-dasharray="link.typed ? undefined : '5 4'"
      data-testid="mindmap-cross-link"
    />
    <text
      v-for="link in layout.crossLinks.filter((l) => l.label)"
      :key="`t-${link.source}-${link.target}`"
      :x="link.labelX"
      :y="link.labelY"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="12"
      :class="['fill-(--text-accent) font-semibold [paint-order:stroke] stroke-4', haloClass]"
    >{{ link.label }}</text>

    <template v-for="label in layout.labels" :key="label.id">
      <g
        v-if="isButton(label)"
        role="button"
        tabindex="0"
        class="group cursor-pointer outline-none"
        :aria-label="ariaLabel(label)"
        :aria-expanded="isChip(label) ? expanded.has(branchOfChip(label)) : selectedId === label.id"
        :aria-haspopup="isChip(label) ? undefined : 'dialog'"
        :data-node-id="label.id"
        @click="activate(label)"
        @keydown.enter.prevent="activate(label)"
        @keydown.space.prevent="activate(label)"
      >
        <!-- 點擊範圍與鍵盤焦點框：比字大一圈，只在鍵盤聚焦時描邊 -->
        <rect
          :x="label.x1 - 4"
          :y="label.y - label.fontSize * 1.4"
          :width="label.x2 - label.x1 + 8"
          :height="label.fontSize * 1.4 + 5"
          rx="3"
          class="fill-transparent stroke-(--text-accent) opacity-0 group-focus-visible:opacity-100"
          stroke-width="2"
        />
        <line
          :x1="label.x1"
          :x2="label.x2"
          :y1="label.y"
          :y2="label.y"
          :class="underlineClass(label)"
          :stroke-width="underlineWidth(label)"
        />
        <text
          :x="label.x"
          :y="textY(label)"
          :text-anchor="label.anchor"
          dominant-baseline="central"
          :font-size="label.fontSize"
          :class="textClass(label)"
        >{{ label.label }}</text>
      </g>
      <g v-else :data-node-id="label.id">
        <line
          :x1="label.x1"
          :x2="label.x2"
          :y1="label.y"
          :y2="label.y"
          :class="underlineClass(label)"
          :stroke-width="underlineWidth(label)"
        />
        <text
          :x="label.x"
          :y="textY(label)"
          :text-anchor="label.anchor"
          dominant-baseline="central"
          :font-size="label.fontSize"
          :class="textClass(label)"
        >{{ label.label }}</text>
      </g>
    </template>
  </svg>
</template>
