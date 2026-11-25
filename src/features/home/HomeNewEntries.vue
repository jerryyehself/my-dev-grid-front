<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchArticles } from '@/api/articles'
import { fetchProjects } from '@/api/projects'
import { isFirstPageOfLoad } from '@/router/navigationCount'
import { latestEntries, type NewEntry } from './homeNewEntries'

// 首頁「最新收錄」列：最新的幾筆文章與實作，每筆都是進條目頁的入口。不印日期，只用「新」標記。
// 這一列是入口不是內容：兩個 API 都沒有資料（或載入失敗）時整列不顯示，不佔第一屏。
// 這裡刻意不用 fetchXxxOrDemo：載入失敗時退回的示範資料不是真的「新收錄」，不能拿來當入口。
const entries = ref<NewEntry[]>([])
// 進場只在「首頁是整頁載入的第一個頁面」時播（直接開首頁、重新整理、外部連結進首頁）；
// 站內從別頁換到首頁只有換頁轉場，不再播這個，也不會跟換頁疊成兩個動作；已經在首頁再點首頁連結不會重新掛載，也不播。
// 要在掛載當下判斷：卡片是 API 回來才出現，那時可能已經又換過頁。
// 動畫只作用在已經渲染好的卡片上（見下面的 style），卡片的內容與位置不等動畫，沒有 JS 或減少動態時也完整
const firstPageOfLoad = isFirstPageOfLoad()
const playEntrance = ref(false)

onMounted(async () => {
  const [articles, projects] = await Promise.all([
    fetchArticles().catch(() => []),
    fetchProjects().catch(() => []),
  ])
  entries.value = latestEntries(articles, projects)
  if (entries.value.length && firstPageOfLoad) playEntrance.value = true
})

// 最多三張錯開（index 0、1、2），第四張起跟第三張一起出現
const STAGGER_MAX_INDEX = 2

function to(e: NewEntry) {
  return e.kind === 'article'
    ? { name: 'article-detail', params: { id: e.id } }
    : { path: '/projects', query: { implementation: e.id } }
}
</script>

<template>
  <section v-if="entries.length" aria-label="最新收錄" class="w-full flex items-center gap-3 mb-1 sm:mb-2">
    <h2 class="m-0 shrink-0 text-(length:--type-label-size) tracking-(--type-label-tracking) leading-(--type-label-leading) font-normal text-(--text-ink-muted)">
      最新收錄
    </h2>
    <ul class="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible py-0.5 min-w-0" :class="{ 'home-entrance': playEntrance }">
      <li
        v-for="(e, i) in entries"
        :key="`${e.kind}-${e.id}`"
        class="shrink-0"
        :style="{ '--stagger-index': Math.min(i, STAGGER_MAX_INDEX) }"
      >
        <RouterLink
          :to="to(e)"
          :title="e.title"
          class="inline-flex items-center gap-2 min-h-11 max-w-[62vw] md:max-w-full px-3 rounded-md border border-(--border-shelf) bg-(--bg-paper-light) text-(length:--type-body-size) text-(--text-ink-main) whitespace-nowrap hover:border-(--text-accent) transition-colors duration-hover-out hover:duration-hover-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--text-accent)"
        >
          <span class="shrink-0 text-(length:--type-label-size) leading-(--type-ui-leading) text-(--text-ink-muted)">{{
            e.kind === 'article' ? '文章' : '實作'
          }}</span>
          <span class="min-w-0 truncate font-normal">{{ e.kind === 'article' ? `〈${e.title}〉` : e.title }}</span>
          <span
            class="shrink-0 min-w-6 text-center rounded bg-(--text-ink-main) px-[5px] text-(length:--type-label-size) leading-(--type-label-leading) font-semibold text-(--bg-paper-light)"
            >新</span
          >
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
/* 首頁唯一的進場時刻：卡片從下方 24px 升上來並淡入，320ms、ease-enter，每張錯開 80ms（token 見 main.css）。
   只動 transform 與 opacity。放在 no-preference 裡：減少動態時不套任何動畫（也沒有 delay 造成的空白期）。
   backwards：延遲期間先停在起點，不會閃一下完整的卡片再消失。 */
@media (prefers-reduced-motion: no-preference) {
  .home-entrance > li {
    animation: home-entrance var(--transition-duration-entrance) var(--ease-enter) backwards;
    animation-delay: calc(var(--stagger-index) * var(--transition-delay-stagger));
  }
}
@keyframes home-entrance {
  from {
    opacity: 0;
    transform: translateY(var(--motion-entrance-rise));
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
