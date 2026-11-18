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
  <main class="flex flex-col gap-3 sm:gap-4">
    <!-- 主題句就是 H1（沒有 kicker、沒有副標）。標題用 --font-serif，跟其他頁的 H1 同一套 -->
    <!-- 導覽列底到 H1：桌機 40（MainLayout 的 hideHeader 已留 32，這裡補 8）、手機 24（已留 24）；
         H1 到下一塊：桌機 40、手機 24。flex 的 gap 另外算，所以 mb 要扣掉 gap -->
    <h1
      class="font-serif !font-bold text-(--text-ink-main) text-(length:--type-display-size) leading-(--type-display-leading) sm:mt-2 mb-3 sm:mb-6"
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
