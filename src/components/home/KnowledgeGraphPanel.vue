<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import LoadFailedNotice from '@/components/LoadFailedNotice.vue'
import KnowledgeGraphCanvas from '@/components/graph/KnowledgeGraphCanvas.vue'
import { RouterLink } from 'vue-router'
import { fetchGraphOrDemo, type GraphDto } from '@/api/graph'

// 首頁「近期知識網路」：真實 GET /api/graph 資料。畫布本身是共用元件
// KnowledgeGraphCanvas.vue（D-87，跟 /graph 頁共用；顯示設定、圖例、縮放控制都在畫布元件裡），
// 這裡只管標題、統計與說明。
// 三層疊圖排版的沿革見 components/graph/layeredLayout.ts。

const sectionRef = ref<HTMLElement>()
// 進場動畫：整個 panel 捲入可視範圍才淡入＋輕微上移，而不是頁面一載入就播放——
// 這個 panel 常常在首頁往下捲一段才看得到，載入當下播放使用者根本看不到，
// 等真正捲到才播放才有意義。只播一次，看過一次之後就不用每次捲進捲出都重播。
const entered = ref(false)
let entranceObserver: IntersectionObserver | undefined

// 首頁維持三層疊圖（D-87）。下面「怎麼看這張圖」裡的圓框說明跟著這個值：哪天改成 'free'，
// 那句說明也會一起消失。
const GRAPH_LAYOUT: 'layered' | 'free' = 'layered'

const loading = ref(true)
const loadError = ref<string | null>(null)
const dto = shallowRef<GraphDto | null>(null)
const stats = reactive({ doc: 0, tech: 0, impl: 0, edges: 0 })

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
      <h2 class="text-[15px] tracking-[0.08em] font-bold text-(--text-accent)">近期知識網路</h2>
    </div>

    <p v-if="!loading" class="text-sm text-(--text-ink-body) mb-3">
      <b class="text-(--text-ink-main) tabular-nums">{{ stats.doc }}</b> 份文件、<b
        class="text-(--text-ink-main) tabular-nums"
        >{{ stats.tech }}</b
      >
      項技術、<b class="text-(--text-ink-main) tabular-nums">{{ stats.impl }}</b> 個實作，由
      <b class="text-(--text-ink-main) tabular-nums">{{ stats.edges }}</b>
      條直接關係串成的知識網路。
    </p>

    <LoadFailedNotice v-if="!loading && loadError" :message="loadError" class="mb-2" />

    <BaseLoadingBlock v-if="loading" height="460px">圖譜載入中…</BaseLoadingBlock>

    <!-- 節點顏色、顯示層、間接關聯原本在這裡疊了三列，D-87 收進畫布左上角的「顯示設定」 -->
    <KnowledgeGraphCanvas
      v-if="!loading && dto"
      :data="dto"
      :layout="GRAPH_LAYOUT"
      label="近期知識網路圖"
    />

    <!-- 給訪客的讀法說明。原本這裡是開發筆記（色階出處、欄位缺口、佈局演算法），2026-09-30 使用者
         決定改成對應的說明。D-87：拿掉「圓框：……重疊的地方就是彼此相關的節點」——節點落在重疊區
         是因為三個圓框錯開疊放，不是因為彼此相關，這句是錯的。2026-10-02 使用者選了候選 A，並要求
         預設收合：用原生 <details>，鍵盤（Enter／空白鍵）與螢幕報讀器都不用另外寫程式。 -->
    <details class="group mt-2">
      <summary
        class="inline-flex items-center gap-1.5 min-h-11 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-[14px] text-(--text-ink-muted) hover:text-(--text-ink-body) rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          class="w-3.5 h-3.5 transition-transform group-open:rotate-90"
          fill="none"
        >
          <path
            d="M7 4l6 6-6 6"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        怎麼看這張圖
      </summary>
      <p class="pb-1 text-[14px] leading-relaxed text-(--text-ink-muted)">
        節點越大，關係越多。點一個節點，它和相連的節點會一直亮著；想查兩個節點之間怎麼連起來，到<RouterLink
          to="/graph"
          class="text-(--text-accent) hover:underline"
          >圖譜頁</RouterLink
        >。
      </p>
      <!-- 只有三層疊圖才有圓框（2026-10-02 使用者核可的候選 C）。節點落在圓框重疊處是因為三個圓
           錯開疊放，不是因為彼此相關，所以要明講 -->
      <p
        v-if="GRAPH_LAYOUT === 'layered'"
        class="pb-1 text-[14px] leading-relaxed text-(--text-ink-muted)"
      >
        圓框：三大類各自的範圍，錯開疊放；落在重疊處不代表彼此有關。
      </p>
    </details>
  </section>
</template>
