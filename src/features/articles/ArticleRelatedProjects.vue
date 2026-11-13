<template>
  <div>
    <div class="text-[11px] font-mono uppercase tracking-[0.24em] text-(--text-ink-muted) mb-2.5">
      Related Projects
    </div>
    <div class="flex flex-col gap-2">
      <span
        v-for="project in projects"
        :key="project.id"
        class="inline-block rounded-full border border-(--border-shelf) px-3 py-1.5 text-sm text-(--text-ink-body) w-fit"
      >
        {{ project.title }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
// 文章內頁的「相關專案」。ArticleDetailView 會畫兩份（≥1240px 放在左欄目錄下面、
// 較窄時放在正文後面），用 CSS 切換顯示——為了讓 DOM 順序跟畫面順序一致，原因見那邊的版面註解。
import type { ArticleRelationDto } from '@/api/articles'

defineProps<{
  projects: ArticleRelationDto[]
}>()
</script>
