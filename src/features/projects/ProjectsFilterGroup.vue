<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import type { ProjectsFilterGroup } from './useProjectsFilter'

// 篩選面板裡的一個技術分類（框架／語言／套件工具…）：一排晶片，每個晶片帶專案數。
// 標籤多的分類（套件工具有 25 個）全部攤開太長，改成搜尋框＋建議清單：
// 沒輸入時只列用得多（專案數 >= FEATURED_MIN_COUNT）和已選的，其餘靠搜尋；
// 輸入時建議清單和下方晶片都縮到符合的（G3 設計稿：兩者都做）。
// 搜尋框不用 BaseInput：這裡要 32px 高、16px 字，而且要帶 combobox 的 aria 屬性。
const SEARCH_MIN_TAGS = 13
const FEATURED_MIN_COUNT = 2
const MAX_SUGGESTIONS = 6

const props = defineProps<{ group: ProjectsFilterGroup }>()
const emit = defineEmits<{ toggle: [label: string] }>()

const searchable = computed(() => props.group.tags.length >= SEARCH_MIN_TAGS)
const query = ref('')
const needle = computed(() => query.value.trim().toLowerCase())

// 名稱開頭符合的排在前面（輸入 vu 先看到 vuetify，再看到名稱中間含 vu 的）；
// 其餘維持分類內原本的順序（用得多的在前）
const matches = computed(() => {
  if (!needle.value) return []
  const hit = props.group.tags.filter((t) => t.label.toLowerCase().includes(needle.value))
  const starts = hit.filter((t) => t.label.toLowerCase().startsWith(needle.value))
  return [...starts, ...hit.filter((t) => !starts.includes(t))]
})
const suggestions = computed(() => matches.value.slice(0, MAX_SUGGESTIONS))

const visibleTags = computed(() => {
  if (!searchable.value) return props.group.tags
  if (needle.value) return matches.value
  return props.group.tags.filter((t) => t.count >= FEATURED_MIN_COUNT || t.selected)
})
const hiddenCount = computed(() => (searchable.value && !needle.value ? props.group.tags.length - visibleTags.value.length : 0))

const listboxId = useId()
const optionId = (i: number) => `${listboxId}-${i}`
const activeIndex = ref(0)
watch(needle, () => {
  activeIndex.value = 0
})
const expanded = computed(() => suggestions.value.length > 0)

// 篩選面板高度有上限、在內部捲：輸入時建議清單可能在面板可見範圍的下面，捲到看得到為止
const listbox = ref<HTMLElement>()
watch(
  () => suggestions.value.length,
  async (n) => {
    if (!n) return
    await nextTick()
    listbox.value?.scrollIntoView({ block: 'nearest' })
  },
)

/** 把建議名稱切成「前／符合的字／後」，符合的字加粗 */
function highlight(label: string) {
  const i = label.toLowerCase().indexOf(needle.value)
  return { before: label.slice(0, i), hit: label.slice(i, i + needle.value.length), after: label.slice(i + needle.value.length) }
}

function pick(label: string) {
  emit('toggle', label)
  query.value = ''
}

function onKeydown(e: KeyboardEvent) {
  const n = suggestions.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % n
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + n) % n
  } else if (e.key === 'Enter' && n) {
    e.preventDefault()
    pick(suggestions.value[activeIndex.value]!.label)
  } else if (e.key === 'Escape' && query.value) {
    e.preventDefault()
    query.value = ''
  }
}
</script>

<template>
  <div>
    <div class="mb-2 text-[13px] leading-5 tracking-[0.06em] text-(--text-ink-muted)">{{ group.label }}</div>

    <template v-if="searchable">
      <input
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="expanded"
        :aria-controls="listboxId"
        :aria-activedescendant="expanded ? optionId(activeIndex) : undefined"
        :placeholder="`搜尋${group.label}`"
        :aria-label="`搜尋${group.label}`"
        class="mb-2 block h-8 w-full rounded-[6px] border border-(--border-shelf) bg-(--bg-paper-light) px-3 text-base leading-6 text-(--text-ink-main) placeholder:text-(--text-ink-muted) placeholder:opacity-70 focus:border-(--text-accent) focus:shadow-[0_0_0_3px_var(--focus-ring)] focus:outline-none"
        @keydown="onKeydown"
      />
      <!-- 建議清單放在流程裡，不做浮層：左欄很窄，浮層會被面板的 overflow 裁掉 -->
      <ul
        v-show="expanded"
        :id="listboxId"
        ref="listbox"
        role="listbox"
        :aria-label="`${group.label}建議`"
        class="m-0 mb-2 scroll-mb-6 list-none rounded-[6px] border border-(--border-shelf) bg-(--bg-paper-light) p-0 py-1"
      >
        <li
          v-for="(tag, i) in suggestions"
          :id="optionId(i)"
          :key="tag.label"
          role="option"
          :aria-selected="i === activeIndex"
          class="flex h-8 cursor-pointer items-center justify-between gap-2 px-3 text-base leading-6"
          :class="i === activeIndex ? 'bg-(--bg-folder) text-(--text-ink-main)' : 'text-(--text-ink-body)'"
          @mousedown.prevent
          @click="pick(tag.label)"
        >
          <span class="min-w-0 truncate">
            <span v-if="tag.selected" aria-hidden="true">✓ </span>{{ highlight(tag.label).before
            }}<mark class="bg-transparent font-semibold text-(--text-ink-main)">{{ highlight(tag.label).hit }}</mark
            >{{ highlight(tag.label).after }}<span v-if="tag.selected" class="sr-only">，已選</span>
          </span>
          <span class="shrink-0 text-[13px] leading-5 tracking-[0.06em] text-(--text-ink-muted)">{{ tag.count }}</span>
        </li>
      </ul>
      <p
        v-if="needle && !matches.length"
        role="status"
        class="m-0 mb-2 text-left text-[13px] leading-5 tracking-[0.06em] text-(--text-ink-muted)"
      >
        找不到符合「{{ query.trim() }}」的{{ group.label }}
      </p>
    </template>

    <div class="flex flex-wrap gap-x-2 gap-y-1">
      <!-- 專案數用獨立的小底色標記，不是名稱後面接一個數字：加上版本之後，
           「Vue 7」「Nuxt 1」會被讀成版本號（2026-09-30 模擬讀者審查） -->
      <button
        v-for="tag in visibleTags"
        :key="tag.label"
        type="button"
        :aria-pressed="tag.selected"
        :aria-label="`${tag.label}，${tag.count} 個專案`"
        class="inline-flex h-7 cursor-pointer items-center gap-2 rounded-full border py-0 pr-1 pl-3 text-[13px] leading-5 tracking-[0.04em] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
        :class="
          tag.selected
            ? 'border-(--bg-selected) bg-(--bg-selected) text-(--text-on-selected)'
            : 'border-(--border-shelf) text-(--text-ink-body) hover:border-[color-mix(in_srgb,var(--text-ink-main)_35%,transparent)]'
        "
        @click="emit('toggle', tag.label)"
      >
        {{ tag.label }}
        <span
          aria-hidden="true"
          class="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 tabular-nums"
          :class="
            tag.selected
              ? 'bg-[color-mix(in_srgb,var(--text-on-selected)_20%,transparent)] text-(--text-on-selected)'
              : 'bg-(--bg-paper-dark) text-(--text-ink-muted)'
          "
          >{{ tag.count }}</span
        >
      </button>
    </div>
    <p v-if="hiddenCount > 0" class="m-0 mt-2 text-left text-[13px] leading-5 tracking-[0.06em] text-(--text-ink-muted)">
      另 {{ hiddenCount }} 個，輸入搜尋
    </p>
  </div>
</template>
