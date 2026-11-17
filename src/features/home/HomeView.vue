<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchGraphOrDemo, type GraphDto } from '@/api/graph'
import HomeNewEntries from './HomeNewEntries.vue'
import HomeRouteCard from './HomeRouteCard.vue'
import KnowledgeGraphPanel from './KnowledgeGraphPanel.vue'
import { buildHomeRoutes, canSwitchRoute, nextRouteIndex, type HomeRoute } from './homeRoute'

// 首頁（C 版，路線當主角）。第一眼：主題句＋路線卡＋最新收錄；第二：知識網路圖（路線在圖上亮起），
// 同一屏內看得到。圖譜資料在這裡取一次，路線卡跟圖共用同一份。
const loading = ref(true)
const loadError = ref<string | null>(null)
const dto = shallowRef<GraphDto | null>(null)
const routes = shallowRef<HomeRoute[]>([])
const routeIndex = ref(0)

const route = computed(() => routes.value[routeIndex.value] ?? null)
const canSwitch = computed(() => canSwitchRoute(routes.value.length))

onMounted(async () => {
  // fetchGraphOrDemo() 正常打真的 API；載入失敗時才退回存好的資料快照，並回報 loadError
  const { dto: data, loadError: error } = await fetchGraphOrDemo()
  loadError.value = error
  dto.value = data
  routes.value = buildHomeRoutes(data)
  loading.value = false
})

function switchRoute() {
  routeIndex.value = nextRouteIndex(routeIndex.value, routes.value.length)
}

const MORE_LINK =
  'inline-flex items-center min-h-11 text-[13px] tracking-[0.05em] text-(--text-ink-muted) hover:text-(--text-accent)'
</script>

<template>
  <main class="flex flex-col gap-4 sm:gap-5">
    <!-- 主題句就是 H1（沒有 kicker、沒有副標）。標題用 --font-serif，跟其他頁的 H1 同一套 -->
    <h1
      class="font-serif !font-black text-(--text-ink-main) text-[28px] sm:text-[34px] leading-tight"
    >
      一位圖資背景後端工程師的工作心智模式
    </h1>

    <!-- 載入中先佔住卡片的位置，載入完成時版面才不會跳 -->
    <div
      v-if="loading"
      aria-hidden="true"
      class="w-full min-h-[132px] rounded-xl border border-(--border-shelf) bg-(--bg-folder)"
    ></div>
    <HomeRouteCard v-else :route="route" :can-switch="canSwitch" @switch="switchRoute" />

    <HomeNewEntries />

    <KnowledgeGraphPanel
      :dto="dto"
      :loading="loading"
      :load-error="loadError"
      :route="route?.path ?? null"
    />

    <nav class="flex flex-wrap gap-x-6">
      <RouterLink to="/projects" :class="MORE_LINK">全部實作 →</RouterLink>
      <RouterLink to="/articles" :class="MORE_LINK">全部文章 →</RouterLink>
    </nav>
  </main>
</template>
