<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { nodeColorVar } from '@/api/ontology'
import BaseInput from '@/components/BaseInput.vue'
import { fetchGraphPath, type GraphNodeType, type GraphPathDto } from '@/api/graph'
import { fetchGraphPocData, type GraphPocNode } from '@/data/graphPocData'

const emit = defineEmits<{
  // null：起訖點還沒都選好，或選好但查詢中/出錯，畫面上不該還顯示上一次查到的路徑。
  result: [path: GraphPathDto | null]
}>()

const nodes = ref<GraphPocNode[]>([])
const loadError = ref<string | null>(null)

const domainLabel: Record<GraphNodeType, string> = {
  documentation: 'Documentation',
  technique: 'Technique',
  implementation: 'Implementation',
}


// 起訖點各自獨立的打字搜尋狀態：query 是輸入框文字，selected 是已經選定的節點（非 null
// 時輸入框改顯示已選定的 pill，不是文字輸入格），open 控制下拉候選要不要展開。
const startQuery = ref('')
const endQuery = ref('')
const startSelected = ref<GraphPocNode | null>(null)
const endSelected = ref<GraphPocNode | null>(null)
const startOpen = ref(false)
const endOpen = ref(false)

function matches(query: string): GraphPocNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return nodes.value.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 8)
}
const startMatches = computed(() => matches(startQuery.value))
const endMatches = computed(() => matches(endQuery.value))

function selectStart(n: GraphPocNode) {
  startSelected.value = n
  startQuery.value = ''
  startOpen.value = false
}
function selectEnd(n: GraphPocNode) {
  endSelected.value = n
  endQuery.value = ''
  endOpen.value = false
}
function clearStart() {
  startSelected.value = null
}
function clearEnd() {
  endSelected.value = null
}
function swap() {
  ;[startSelected.value, endSelected.value] = [endSelected.value, startSelected.value]
}

const searching = ref(false)
const searchError = ref<string | null>(null)

// 起訖點都選好才查——單邊選好、另一邊還在打字的中間狀態不該打 API。
watch([startSelected, endSelected], async ([start, end]) => {
  if (!start || !end) {
    emit('result', null)
    searchError.value = null
    return
  }
  searching.value = true
  searchError.value = null
  try {
    const path = await fetchGraphPath(start.id, end.id)
    emit('result', path)
  } catch (e) {
    searchError.value = e instanceof Error ? e.message : '查詢路徑失敗'
    emit('result', null)
  } finally {
    searching.value = false
  }
})

onMounted(async () => {
  try {
    const { nodes: n } = await fetchGraphPocData()
    nodes.value = n
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '載入節點清單失敗'
  }
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-col gap-1">
      <div class="eyebrow font-mono text-[11px] uppercase tracking-[0.2em] font-bold text-(--text-accent)">路徑查詢</div>
      <p class="text-[13px] text-(--text-ink-body)">輸入起點與終點，找出兩者之間經過哪些節點與關係</p>
    </div>

    <div v-if="loadError" class="text-[12px] text-(--text-accent)">{{ loadError }}</div>

    <div class="flex items-start gap-3">
      <!-- 起點 -->
      <div class="relative flex-1">
        <label class="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-(--text-accent)">起點</label>
        <div
          v-if="startSelected"
          class="flex items-center gap-2 rounded-[10px] border border-(--border-shelf) bg-(--bg-paper-light) px-3 py-[9px]"
        >
          <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: `var(${nodeColorVar(startSelected.domainType)})` }" />
          <span class="text-[13px] font-medium text-(--text-ink-main)">{{ startSelected.label }}</span>
          <button
            type="button"
            class="ml-auto cursor-pointer text-[15px] text-(--text-accent) opacity-60 hover:opacity-100"
            aria-label="清除起點"
            @click="clearStart"
          >
            ×
          </button>
        </div>
        <div v-else class="relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--text-accent) opacity-60"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <BaseInput
            v-model="startQuery"
            placeholder="輸入節點名稱..."
            class="w-full !rounded-[10px] py-[9px] pl-9 pr-3 text-[13px]"
            @focus="startOpen = true"
            @blur="startOpen = false"
          />
        </div>
        <div
          v-if="startOpen && startMatches.length"
          class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[10px] border border-(--border-shelf) bg-(--bg-paper-light) shadow-lg"
        >
          <div
            v-for="n in startMatches"
            :key="n.id"
            class="flex cursor-pointer items-center gap-2 px-3 py-[9px] hover:bg-(--bg-folder)"
            @mousedown.prevent="selectStart(n)"
          >
            <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: `var(${nodeColorVar(n.domainType)})` }" />
            <span class="text-[13px] text-(--text-ink-main)">{{ n.label }}</span>
            <span class="ml-auto font-mono text-[10px] uppercase tracking-[0.05em] text-(--text-accent) opacity-70">{{
              domainLabel[n.domainType]
            }}</span>
          </div>
        </div>
      </div>

      <!-- 交換起訖點 -->
      <div class="flex h-[62px] items-center">
        <button
          type="button"
          class="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border border-(--border-shelf) bg-(--bg-paper-light)"
          aria-label="交換起訖點"
          @click="swap"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-(--text-ink-body)">
            <path d="M7 7h11l-3-3M17 17H6l3 3" />
          </svg>
        </button>
      </div>

      <!-- 終點 -->
      <div class="relative flex-1">
        <label class="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-(--text-accent)">終點</label>
        <div
          v-if="endSelected"
          class="flex items-center gap-2 rounded-[10px] border border-(--border-shelf) bg-(--bg-paper-light) px-3 py-[9px]"
        >
          <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: `var(${nodeColorVar(endSelected.domainType)})` }" />
          <span class="text-[13px] font-medium text-(--text-ink-main)">{{ endSelected.label }}</span>
          <button
            type="button"
            class="ml-auto cursor-pointer text-[15px] text-(--text-accent) opacity-60 hover:opacity-100"
            aria-label="清除終點"
            @click="clearEnd"
          >
            ×
          </button>
        </div>
        <div v-else class="relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--text-accent) opacity-60"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <BaseInput
            v-model="endQuery"
            placeholder="輸入節點名稱..."
            class="w-full !rounded-[10px] py-[9px] pl-9 pr-3 text-[13px]"
            @focus="endOpen = true"
            @blur="endOpen = false"
          />
        </div>
        <div
          v-if="endOpen && endMatches.length"
          class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[10px] border border-(--border-shelf) bg-(--bg-paper-light) shadow-lg"
        >
          <div
            v-for="n in endMatches"
            :key="n.id"
            class="flex cursor-pointer items-center gap-2 px-3 py-[9px] hover:bg-(--bg-folder)"
            @mousedown.prevent="selectEnd(n)"
          >
            <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: `var(${nodeColorVar(n.domainType)})` }" />
            <span class="text-[13px] text-(--text-ink-main)">{{ n.label }}</span>
            <span class="ml-auto font-mono text-[10px] uppercase tracking-[0.05em] text-(--text-accent) opacity-70">{{
              domainLabel[n.domainType]
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <p v-if="searching" class="font-mono text-[11px] tracking-widest text-(--text-ink-body) opacity-70">// 查詢路徑中...</p>
    <p v-else-if="searchError" class="text-[12px] text-(--text-accent)">{{ searchError }}</p>
  </div>
</template>
