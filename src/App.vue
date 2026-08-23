<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const route = useRoute()

/* 💡 配置驅動 UI：
   透過計算屬性捕捉當前路由 meta 的設定值，若該路由沒設定則顯示預設字串。
*/
const pageTag = computed(() => (route.meta.tag as string) || 'DEV_LOG')
const pageTitle = computed(() => (route.meta.title as string) || 'Jerry.DevLog')
const pageSubtitle = computed(
  () => (route.meta.subtitle as string) || 'Continuous Learning & Artifact Registry',
)
const contentWidth = computed(() => route.meta.contentWidth as string | undefined)
</script>

<template>
  <MainLayout :content-width="contentWidth">
    <template #tag>
      <span>
        {{ pageTag }}
      </span>
    </template>

    <template #title>
      {{ pageTitle }}
    </template>

    <template #description>
      {{ pageSubtitle }}
    </template>

    <template #content>
      <RouterView />
    </template>
  </MainLayout>
</template>

<style>
/* 全站層級的基礎環境 Reset，確保背景是乾淨的純色底，把點點的控制權完全交給 MainLayout 的 header */
html,
body {
  margin: 0;
  padding: 0;
  background-color: var(--color-slate-50);
}
</style>
