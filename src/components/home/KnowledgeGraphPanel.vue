<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import LoadFailedNotice from '@/components/LoadFailedNotice.vue'
import BaseSegmented from '@/components/BaseSegmented.vue'
import BaseSwitch from '@/components/BaseSwitch.vue'
import GraphLegendDots from '@/components/GraphLegendDots.vue'
import KnowledgeGraphCanvas from '@/components/graph/KnowledgeGraphCanvas.vue'
import { TYPE_LABEL as typeLabel } from '@/components/graph/graphTypes'
import { RouterLink } from 'vue-router'
import { fetchGraphOrDemo, type GraphDto, type GraphNodeType } from '@/api/graph'

// 首頁「近期知識網路」：真實 GET /api/graph 資料。畫布本身是共用元件
// KnowledgeGraphCanvas.vue（D-87，跟 /graph 頁共用），這裡只管標題、統計、控制列與說明。
// 三層疊圖排版的沿革見 components/graph/layeredLayout.ts。

const sectionRef = ref<HTMLElement>()
// 進場動畫：整個 panel 捲入可視範圍才淡入＋輕微上移，而不是頁面一載入就播放——
// 這個 panel 常常在首頁往下捲一段才看得到，載入當下播放使用者根本看不到，
// 等真正捲到才播放才有意義。只播一次，看過一次之後就不用每次捲進捲出都重播。
const entered = ref(false)
let entranceObserver: IntersectionObserver | undefined

const loading = ref(true)
const loadError = ref<string | null>(null)
const dto = shallowRef<GraphDto | null>(null)
const stats = reactive({ doc: 0, tech: 0, impl: 0, edges: 0, indirect: 0 })

// 顯示層篩選：點某一層的按鈕讓那層維持正常清晰度，其餘層淡化（不是完全隱藏）——
// 不選任何一層時視為「全部一樣清楚」，是預設狀態（淡化邏輯在畫布元件裡）。
const typeFilter = reactive<Record<GraphNodeType, boolean>>({
  documentation: false,
  technique: false,
  implementation: false,
})
function toggleTypeFilter(type: GraphNodeType) {
  typeFilter[type] = !typeFilter[type]
}

const colorMode = ref<'type' | 'overlay'>('type')
const COLOR_MODES = [
  { value: 'type', label: '依類型' },
  { value: 'overlay', label: '依建立時間' },
] as const

// 間接關聯（推算出來的虛線）預設不顯示，免得畫面太雜；使用者自己打開才畫（2026-09-30 使用者決定）
const showIndirect = ref(false)

async function boot() {
  // fetchGraphOrDemo() 正常打真的 API；載入失敗時才退回存好的資料快照，
  // 並且回報 loadError，畫面上要顯示錯誤訊息。
  const { dto: data, loadError: error } = await fetchGraphOrDemo()
  loadError.value = error
  stats.doc = data.nodes.filter((n) => n.type === 'documentation').length
  stats.tech = data.nodes.filter((n) => n.type === 'technique').length
  stats.impl = data.nodes.filter((n) => n.type === 'implementation').length
  stats.edges = data.edges.length
  dto.value = data
  loading.value = false
}

onMounted(() => {
  boot()
  if (sectionRef.value) {
    entranceObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          entered.value = true
          entranceObserver?.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    entranceObserver.observe(sectionRef.value)
  }
})
onUnmounted(() => {
  entranceObserver?.disconnect()
})
</script>

<template>
  <section
    ref="sectionRef"
    class="w-full transition-[opacity,transform] duration-700 ease-out"
    :class="entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
  >
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 class="text-[15px] tracking-[0.08em] font-bold text-(--text-accent)">
        近期知識網路
      </h2>
    </div>

    <p v-if="!loading" class="text-sm text-(--text-ink-body) mb-3">
      <b class="text-(--text-ink-main) tabular-nums">{{ stats.doc }}</b> 份文件、<b
        class="text-(--text-ink-main) tabular-nums"
        >{{ stats.tech }}</b
      >
      項技術、<b class="text-(--text-ink-main) tabular-nums">{{ stats.impl }}</b> 個實作，由
      <b class="text-(--text-ink-main) tabular-nums">{{ stats.edges }}</b> 條直接關係串成的知識網路。
    </p>

    <LoadFailedNotice v-if="!loading && loadError" :message="loadError" class="mb-2" />

    <div v-if="!loading" class="flex items-center gap-2 mb-2.5">
      <span class="text-[13px] tracking-[0.05em] text-(--text-ink-muted)">節點顏色</span>
      <!-- 全站統一的「幾選一」切換（D-66）。下面的「顯示層」不換：它可以多選，顏色是分類色，有語意 -->
      <BaseSegmented v-model="colorMode" :options="COLOR_MODES" label="節點顏色" />
    </div>

    <div v-if="!loading" class="flex items-center gap-2 mb-2.5">
      <span class="text-[13px] tracking-[0.05em] text-(--text-ink-muted)">顯示層</span>
      <button
        v-for="type in (['documentation', 'technique', 'implementation'] as const)"
        :key="type"
        type="button"
        class="rounded-full border px-3 py-1 text-[13px] cursor-pointer"
        :class="typeFilter[type] ? 'text-(--bg-paper-light) border-transparent' : 'bg-(--bg-folder) text-(--text-ink-muted) border-(--border-shelf)'"
        :style="typeFilter[type] ? { background: `var(--node-${type === 'documentation' ? 'doc' : type === 'technique' ? 'tech' : 'impl'})` } : {}"
        :aria-pressed="typeFilter[type]"
        @click="toggleTypeFilter(type)"
      >
        {{ typeLabel[type] }}
      </button>
      <!-- 間接關聯預設不畫（見 showIndirect）。放在「顯示層」同一列：都是「畫面上要顯示什麼」 -->
      <span aria-hidden="true" class="mx-1 h-5 border-l border-(--border-shelf)"></span>
      <BaseSwitch v-model="showIndirect" label="間接關聯" aria-describedby="kg-indirect-note" />
    </div>

    <!-- 開關的說明：關著的時候說開了會多什麼，開著的時候當虛線的圖例。兩種節點顏色模式都顯示，
         所以不放進下面只在「依類別」出現的圖例列。模擬讀者審查（2026-09-30）：開關旁邊沒有說明，
         讀者不知道開了會看到什麼；原本唯一的說明在圖下面的清單裡，句子又太長 -->
    <p
      v-if="!loading"
      id="kg-indirect-note"
      class="flex flex-wrap items-center gap-x-1.5 text-[13px] text-(--text-ink-muted) mb-2.5"
    >
      <span
        aria-hidden="true"
        class="w-5 h-0 border-t-2 border-dashed"
        :class="showIndirect ? 'border-(--accent-secondary)' : 'border-(--text-ink-muted)/50'"
      ></span>
      <template v-if="showIndirect">
        間接關聯（{{ stats.indirect }} 條）：兩個同類節點連到相同的節點，就用虛線連起來，共同的越多線越明顯。這是推算出來的，不是直接關係。
      </template>
      <template v-else>打開「間接關聯」，會用虛線標出連到相同節點的同類節點（推算出來的，不是直接關係）。</template>
    </p>

    <div v-if="!loading && colorMode === 'type'" class="flex flex-wrap items-center gap-4 text-[13px] text-(--text-ink-muted) mb-3">
      <GraphLegendDots />
      <span class="flex items-center gap-1.5"
        ><span class="w-4 h-0 border-t border-(--edge-real)"></span>直接關係</span
      >
      <!-- 「滑到節點上」在觸控裝置沒有意義，只在能 hover 的裝置顯示 -->
      <span class="ml-auto"
        ><span class="hidden [@media(hover:hover)]:inline">滑到節點上看相連的節點・</span>點節點看內容・點連線看是什麼關係</span
      >
    </div>
    <div v-else-if="!loading" class="flex flex-wrap items-center gap-2.5 text-[11.5px] font-mono text-(--text-ink-muted) mb-3">
      <span>較舊</span>
      <span
        class="w-[120px] h-2 rounded"
        style="background: linear-gradient(to right, #440154, #414487, #2a788e, #22a884, #7ad151, #fde725)"
      ></span>
      <span>較新</span>
      <span class="flex items-center gap-1.5 ml-2"
        ><span class="w-2 h-2 rounded-full" :style="{ background: 'var(--overlay-nodata)' }"></span
        >尚無建立時間資料（技術／文件）</span
      >
    </div>

    <BaseLoadingBlock v-if="loading" height="460px">圖譜載入中…</BaseLoadingBlock>

    <KnowledgeGraphCanvas
      v-if="!loading && dto"
      :data="dto"
      :color-mode="colorMode"
      :type-filter="typeFilter"
      :show-indirect="showIndirect"
      @indirect-count="stats.indirect = $event"
    />

    <!-- 給訪客的讀法說明。原本這裡是開發筆記（色階出處、欄位缺口、佈局演算法），2026-09-30 使用者
         決定改成對應的說明；技術細節留在程式碼註解跟 issue #24 -->
    <ul class="mt-3 flex flex-col gap-1 text-[14px] leading-relaxed text-(--text-ink-muted)">
      <li><b class="text-(--text-ink-body)">顏色</b>：文件、技術、實作三大類。切到「依建立時間」改用時間色階；目前只有專案有建立時間，其他節點顯示灰色。</li>
      <li><b class="text-(--text-ink-body)">大小</b>：關係越多的節點越大。</li>
      <li><b class="text-(--text-ink-body)">線</b>：實線是直接關係，也就是目錄裡記下來的。虛線是間接關聯，預設不顯示，見上面的開關說明。</li>
      <li><b class="text-(--text-ink-body)">圓框</b>：三大類各自的範圍，重疊的地方就是彼此相關的節點。</li>
      <li>點節點看詳細資料。想拖曳節點、查兩點之間的路徑，到<RouterLink to="/graph" class="text-(--text-accent) hover:underline">圖譜頁</RouterLink>。</li>
    </ul>
  </section>
</template>
