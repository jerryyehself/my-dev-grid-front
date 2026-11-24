<script setup lang="ts">
// 手機（窄於 640px）的心智圖：同一份資料改畫成大綱樹，不是把桌機圖縮小（網站規則：
// 圖形類的視覺在窄螢幕另做一個版本）。照線框：
// - 預設連分枝都收合，只露出中心與分枝；390 寬全部展開要 900px 高，會把文章推得太遠。
// - 每列至少 44px 高才好點。
// - 點詞在原地展開出處；有 res_id 的詞右邊有 ↗ 連到圖譜。
// - 橫向關係開著時，詞底下多一行小字說明連到哪個詞（文字不受另一端收合影響）。
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ArticleMindmapUnitList from './ArticleMindmapUnitList.vue'
import type { ArticleMindmap, MindmapLink, MindmapNode } from './articleMindmapTypes'
import { branchesOf, centerOf, chipLabel, linkPhrase } from './mindmapTree'
import { MINDMAP_GRAPH_ROUTE, unitLinksOf, type MindmapHeading } from './mindmapUnits'

const props = defineProps<{
  mindmap: ArticleMindmap
  headings: readonly MindmapHeading[]
  /** 展開了次要節點的分枝（跟桌機圖共用） */
  expanded: ReadonlySet<string>
  showLinks: boolean
}>()

const emit = defineEmits<{ toggleSecondaries: [branchId: string] }>()

const center = computed(() => centerOf(props.mindmap))
const branches = computed(() =>
  branchesOf(props.mindmap).filter(
    (b) => b.node.strength === 'primary' || props.expanded.has(props.mindmap.center),
  ),
)

/** 打開的分枝（只在手機用，預設全部收合） */
const openBranches = ref(new Set<string>())
/** 展開出處的詞，一次一個 */
const openUnits = ref<string | null>(null)

function toggleBranch(id: string) {
  const next = new Set(openBranches.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openBranches.value = next
}

function toggleUnits(id: string) {
  openUnits.value = openUnits.value === id ? null : id
}

const labelById = computed(() => new Map(props.mindmap.nodes.map((n) => [n.id, n.label])))

function relationsOf(node: MindmapNode): { key: string; link: MindmapLink; text: string }[] {
  return props.mindmap.links.flatMap((link, i) => {
    if (link.source === node.id) {
      return [{ key: `${i}`, link, text: linkPhrase(link, 'source', labelById.value.get(link.target) ?? '') }]
    }
    if (link.target === node.id) {
      return [{ key: `${i}`, link, text: linkPhrase(link, 'target', labelById.value.get(link.source) ?? '') }]
    }
    return []
  })
}

function countText(primaries: number, secondaries: number): string {
  return secondaries > 0 ? `${primaries} 個，次要 ${secondaries}` : `${primaries} 個`
}

const GRAPH_BUTTON_CLASS =
  'shrink-0 -my-2 -mr-2 w-11 h-11 inline-flex items-center justify-center text-(--text-accent) font-bold focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-(--text-accent) rounded-[6px]'
</script>

<template>
  <ul class="list-none m-0 py-1 px-0">
    <li class="flex items-center gap-2.5 min-h-11 px-3">
      <span class="font-serif font-bold text-[15px] text-(--text-ink-main)">{{ center.label }}</span>
      <span class="flex-1 text-(length:--type-label-size) text-(--text-ink-muted)">文章主題</span>
      <RouterLink
        v-if="center.res_id !== null"
        :to="MINDMAP_GRAPH_ROUTE"
        :class="GRAPH_BUTTON_CLASS"
        :aria-label="`在圖譜中看「${center.label}」`"
      >
        <span class="w-7 h-7 inline-flex items-center justify-center rounded-[4px] border border-[color-mix(in_srgb,var(--text-accent)_55%,transparent)]" aria-hidden="true">↗</span>
      </RouterLink>
    </li>
    <li v-for="branch in branches" :key="branch.node.id">
      <button
        type="button"
        class="w-full flex items-center gap-2.5 min-h-11 px-3 border-t border-(--border-shelf) text-left cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--text-accent)"
        :aria-expanded="openBranches.has(branch.node.id)"
        @click="toggleBranch(branch.node.id)"
      >
        <svg
          :class="['shrink-0 text-(--text-ink-muted)', openBranches.has(branch.node.id) ? 'rotate-90' : '']"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
        <span class="flex-1 font-bold text-sm text-(--text-ink-main)">{{ branch.node.label }}</span>
        <span class="text-(length:--type-label-size) text-(--text-ink-muted) tabular-nums">
          {{ countText(branch.primaries.length, branch.secondaries.length) }}
        </span>
      </button>
      <ul
        v-if="openBranches.has(branch.node.id)"
        class="list-none m-0 mb-1.5 ml-[18px] p-0 border-l border-(--edge-real)"
      >
        <li
          v-for="node in [...branch.primaries, ...(expanded.has(branch.node.id) ? branch.secondaries : [])]"
          :key="node.id"
          class="pl-3.5 pr-3"
        >
          <div class="flex items-center gap-2 min-h-11">
            <button
              v-if="unitLinksOf(node, headings).length > 0"
              type="button"
              :class="[
                'flex-1 text-left text-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent) rounded-[2px]',
                openUnits === node.id
                  ? 'text-(--text-accent) font-bold'
                  : node.strength === 'secondary'
                    ? 'text-(--text-ink-muted) font-normal'
                    : 'text-(--text-ink-body) font-medium',
              ]"
              :aria-expanded="openUnits === node.id"
              @click="toggleUnits(node.id)"
            >
              {{ node.label }}
            </button>
            <span
              v-else
              :class="[
                'flex-1 text-sm',
                node.strength === 'secondary' ? 'text-(--text-ink-muted) font-normal' : 'text-(--text-ink-body) font-medium',
              ]"
            >
              {{ node.label }}
            </span>
            <RouterLink
              v-if="node.res_id !== null"
              :to="MINDMAP_GRAPH_ROUTE"
              :class="GRAPH_BUTTON_CLASS"
              :aria-label="`在圖譜中看「${node.label}」`"
            >
              <span class="w-7 h-7 inline-flex items-center justify-center rounded-[4px] border border-[color-mix(in_srgb,var(--text-accent)_55%,transparent)]" aria-hidden="true">↗</span>
            </RouterLink>
          </div>
          <ArticleMindmapUnitList
            v-if="openUnits === node.id"
            :units="unitLinksOf(node, headings)"
            class="-mt-1.5 mb-1.5 px-2 py-1.5 rounded-[6px] border border-(--border-shelf) bg-(--bg-page) text-(length:--type-label-size)"
          />
          <template v-if="showLinks">
            <div
              v-for="rel in relationsOf(node)"
              :key="rel.key"
              class="flex items-center gap-2 -mt-1 mb-1.5 text-xs leading-[18px] text-(--text-ink-muted)"
            >
              <svg width="18" height="8" aria-hidden="true" class="shrink-0">
                <line
                  x1="0"
                  x2="18"
                  y1="4"
                  y2="4"
                  stroke-width="1.5"
                  :class="rel.link.type !== null ? 'stroke-(--text-accent)' : 'stroke-(--accent-secondary)'"
                  :stroke-dasharray="rel.link.type !== null ? undefined : '5 4'"
                />
              </svg>
              <span>{{ rel.text }}</span>
            </div>
          </template>
        </li>
        <li v-if="branch.secondaries.length > 0" class="pl-3.5 pr-3">
          <button
            type="button"
            class="min-h-11 text-(length:--type-label-size) font-semibold text-(--text-accent) underline underline-offset-[3px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
            :aria-expanded="expanded.has(branch.node.id)"
            :aria-label="`${chipLabel(branch.secondaries.length, expanded.has(branch.node.id))}：${branch.node.label}`"
            @click="emit('toggleSecondaries', branch.node.id)"
          >
            {{ chipLabel(branch.secondaries.length, expanded.has(branch.node.id)) }}
          </button>
        </li>
      </ul>
    </li>
  </ul>
</template>
