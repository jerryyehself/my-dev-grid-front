<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import AuthNotice from '@/components/AuthNotice.vue'
import { SITE_NAME, documentTitle, pageTitleOverride } from '@/siteMeta'

const route = useRoute()

/* 💡 配置驅動 UI：
   透過計算屬性捕捉當前路由 meta 的設定值，若該路由沒設定則顯示預設字串。
*/
// 沒設定 meta 的路由（例如登入回呼）的退路。原本是改名前的「DEV_LOG／IN.DevLog／Continuous Learning
// & Artifact Registry」，換成現在的站名；副標沒有就留空，不硬塞一句
const pageTag = computed(() => (route.meta.tag as string) || '')
const pageTitle = computed(
  () => pageTitleOverride.value || (route.meta.title as string) || SITE_NAME,
)
const pageSubtitle = computed(() => (route.meta.subtitle as string) || '')
const contentWidth = computed(() => route.meta.contentWidth as string | undefined)
const hideHeader = computed(() => Boolean(route.meta.hideHeader))
const fullBleed = computed(() => Boolean(route.meta.fullBleed))

// 換頁就清掉上一頁載入後才設的標題，見 siteMeta.ts
watch(
  () => route.fullPath,
  () => {
    pageTitleOverride.value = null
  },
)

// 瀏覽器分頁標題跟著頁面標題走。之前整站都是 Vite 範本留下的「Vite App」。
watchEffect(() => {
  document.title = documentTitle(route.name, pageTitleOverride.value || route.meta.title)
})
</script>

<template>
  <MainLayout :content-width="contentWidth" :hide-header="hideHeader" :full-bleed="fullBleed">
    <template #tag>
      <span>
        {{ pageTag }}
      </span>
    </template>

    <template #title>
      {{ pageTitle }}
    </template>

    <!-- 沒有副標的頁面整個 slot 不傳，MainLayout 的 v-if="$slots.description" 才不會留一個空段落。
         內容本身看得出用途的頁面（文章、專案清單）不放副標（D-83） -->
    <template v-if="pageSubtitle" #description>
      {{ pageSubtitle }}
    </template>

    <template #content>
      <RouterView />
    </template>
  </MainLayout>

  <!-- 登入／登出結果的提示，見 AuthNotice.vue -->
  <AuthNotice />
</template>

<style>
/* 全站層級的基礎環境 Reset，確保背景是乾淨的純色底，把點點的控制權完全交給 MainLayout 的 header */
html,
body {
  margin: 0;
  padding: 0;
  /* 用 token，不用 Tailwind 的 slate：頁面捲到底反彈時露出的底色才會跟著主題換 */
  background-color: var(--bg-paper-light);
}
</style>
