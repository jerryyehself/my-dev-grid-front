<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchArticles } from '@/api/articles'
import { fetchProjects } from '@/api/projects'
import { latestEntries, type NewEntry } from './homeNewEntries'

// 首頁「最新收錄」列：最新的幾筆文章與實作，每筆都是進條目頁的入口。不印日期，只用「新」標記。
// 這一列是入口不是內容：兩個 API 都沒有資料（或載入失敗）時整列不顯示，不佔第一屏。
// 這裡刻意不用 fetchXxxOrDemo：載入失敗時退回的示範資料不是真的「新收錄」，不能拿來當入口。
const entries = ref<NewEntry[]>([])

onMounted(async () => {
  const [articles, projects] = await Promise.all([
    fetchArticles().catch(() => []),
    fetchProjects().catch(() => []),
  ])
  entries.value = latestEntries(articles, projects)
})

function to(e: NewEntry) {
  return e.kind === 'article'
    ? { name: 'article-detail', params: { id: e.id } }
    : { path: '/projects', query: { implementation: e.id } }
}
</script>

<template>
  <section v-if="entries.length" aria-label="最新收錄" class="w-full flex items-center gap-3">
    <h2 class="m-0 shrink-0 text-[13px] tracking-[0.05em] font-bold text-(--text-ink-muted)">
      最新收錄
    </h2>
    <ul class="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible py-0.5 min-w-0">
      <li v-for="e in entries" :key="`${e.kind}-${e.id}`" class="shrink-0">
        <RouterLink
          :to="to(e)"
          :title="e.title"
          class="inline-flex items-center gap-2 min-h-11 max-w-[62vw] md:max-w-full px-3 rounded-lg border border-(--border-shelf) bg-(--bg-paper-light) text-[15px] text-(--text-ink-main) whitespace-nowrap hover:border-(--text-accent) transition-colors"
        >
          <span class="shrink-0 text-[13px] text-(--text-ink-muted)">{{
            e.kind === 'article' ? '文章' : '實作'
          }}</span>
          <span class="min-w-0 truncate font-semibold">{{ e.kind === 'article' ? `〈${e.title}〉` : e.title }}</span>
          <span
            class="shrink-0 rounded bg-(--text-ink-main) px-1.5 py-px text-[12px] leading-snug text-(--bg-paper-light)"
            >新</span
          >
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
