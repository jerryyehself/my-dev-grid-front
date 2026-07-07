<template>
  <!-- 🏛️ 篩選區：實心重音壓陣，完全融入 #F8F6F2 紙張底色 -->
  <div class="flex flex-col sm:flex-row sm:items-center gap-y-3 gap-x-6 text-xs mb-10">
    <span
      class="font-mono text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-widest"
    >
      Filter Archive //
    </span>

    <div class="flex flex-wrap gap-1 bg-stone-200/50 dark:bg-stone-800/50 p-1 rounded-lg max-w-max">
      <button
        @click="currentTag = ''"
        :class="[
          !currentTag
            ? 'bg-stone-900 text-white font-bold shadow-sm'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200',
        ]"
        class="transition-all font-mono uppercase tracking-wider text-[11px] px-3 py-1.5 rounded-md"
      >
        All_Essays
      </button>

      <button
        v-for="tag in allTags"
        :key="tag"
        @click="currentTag = currentTag === tag ? '' : tag"
        :class="[
          currentTag === tag
            ? 'bg-stone-900 text-white font-bold shadow-sm'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200',
        ]"
        class="transition-all font-mono uppercase tracking-wider text-[11px] px-3 py-1.5 rounded-md"
      >
        {{ tag }}
      </button>
    </div>
  </div>

  <!-- 📖 緊湊且完美融入紙張底色的「文獻卡片清單」 -->
  <div class="space-y-3">
    <article
      v-for="article in filteredArticles"
      :key="article.id"
      class="group bg-stone-100/40 dark:bg-stone-900/20 hover:bg-[#F2EFE9] dark:hover:bg-stone-900/60 p-5 rounded-lg border border-stone-200/40 dark:border-stone-800/40 hover:border-stone-300/80 dark:hover:border-stone-700/80 shadow-[0_1px_4px_rgba(0,0,0,0.01)] transition-all duration-200"
    >
      <div class="grid grid-cols-1 md:grid-cols-4 gap-y-2 gap-x-6">
        <!-- 📅 左側：時間與標籤 -->
        <div class="space-y-1 md:pt-0.5">
          <time
            class="font-mono text-[12px] font-medium text-stone-400 dark:text-stone-500 block tracking-wider group-hover:text-stone-800 dark:group-hover:text-stone-200 transition-colors"
          >
            {{ article.date }}
          </time>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="tag in article.tags"
              :key="tag"
              class="font-mono text-[9px] text-stone-500 bg-stone-200/60 dark:bg-stone-800/60 px-1.5 py-0.5 rounded uppercase tracking-wide"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- 📄 右側：主體內容 -->
        <div class="md:col-span-3 space-y-2.5">
          <!-- 標題 -->
          <h3
            class="text-sm font-semibold tracking-tight text-stone-800 dark:text-stone-200 group-hover:text-(--text-accent) transition-colors duration-150"
          >
            <router-link :to="`/articles/${article.id}`" class="block">
              {{ article.title }}
            </router-link>
          </h3>

          <!-- 內文簡介 -->
          <p class="text-xs text-stone-600 dark:text-stone-400 leading-relaxed text-justify m-0">
            {{ article.summary }}
          </p>

          <!-- 🔗 引用標籤（關聯專案） -->
          <div
            v-if="article.relatedProjects && article.relatedProjects.length"
            class="pt-1 flex items-center gap-1.5"
          >
            <span class="font-mono text-[10px] text-stone-400 dark:text-stone-500">Ref_</span>
            <span
              v-for="projId in article.relatedProjects"
              :key="projId"
              class="font-mono text-[9px] text-stone-600 dark:text-stone-400 bg-stone-200/40 dark:bg-stone-800/40 px-1.5 py-0.5 rounded border border-stone-200/20 shadow-2xs"
            >
              {{ projId }}
            </span>
          </div>
        </div>
      </div>
    </article>
  </div>

  <!-- 🕳️ 空狀態 -->
  <div
    v-if="filteredArticles.length === 0"
    class="py-12 text-center text-xs font-mono text-stone-400"
  >
    NO_DOCUMENTS_FOUND
  </div>

  <!-- 📖 乾乾淨淨、回歸直覺的一般分頁按鈕 -->
  <div v-if="filteredArticles.length > 0" class="flex items-center justify-center gap-2 pt-8 mt-6">
    <button
      class="px-3 py-1.5 text-xs font-medium rounded border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-not-allowed"
      disabled
    >
      上一頁
    </button>

    <button class="px-3 py-1.5 text-xs font-semibold rounded bg-stone-900 text-white shadow-sm">
      1
    </button>

    <button
      class="px-3 py-1.5 text-xs font-medium rounded border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
    >
      2
    </button>

    <button
      class="px-3 py-1.5 text-xs font-medium rounded border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
    >
      3
    </button>

    <button
      class="px-3 py-1.5 text-xs font-medium rounded border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
    >
      下一頁
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Article {
  id: string
  title: string
  summary: string
  date: string
  tags: string[]
  relatedProjects?: string[]
}

const articles = ref<Article[]>([
  {
    id: 'vue3-large-architecture',
    title: 'Vue3 大型專案架構優化：從元件臃腫到極致純粹 View 的思維演進',
    summary:
      '本文探討在面臨中大型前端專案時，如何透過大一統 Layout 控制與事件驅動機制，將業務邏輯完全封閉在單一 View 中。拒絕過度封裝所帶來的通訊成本與黑盒子效能損耗。',
    date: '2026.07.02',
    tags: ['Vue3', 'Arch'],
    relatedProjects: ['my-dev-grid'],
  },
  {
    id: 'tailwind-v4-fluid-design',
    title: 'Tailwind v4 動態光學流體排版與 CSS 變數主題系統實踐',
    summary:
      '深入探討新版 Tailwind v4 的架構特徵，如何利用純粹的 CSS 原生變數調配出具有「紙質物理收藏感」與「精裝書印刷感」的暗黑與明亮雙主題，並完美避開文字飄移感。',
    date: '2026.06.18',
    tags: ['Tailwind', 'CSS'],
    relatedProjects: ['portfolio-v4'],
  },
  {
    id: 'event-driven-dom-scrolling',
    title: '為什麼在富文本與關係圖譜中，集中式事件驅動優於元件化封裝？',
    summary:
      '解析跨層級、非父子關係 DOM 尋找與閃爍滾動的底層邏輯。結合 Vue 的 emit 監聽器與原生 DOM 副作用，達成如學術論文腳註（Footnotes）般的流暢檢索跳轉體驗。',
    date: '2026.05.24',
    tags: ['Vue3', 'DOM'],
    relatedProjects: ['my-dev-grid'],
  },
  {
    id: 'swiss-style-typography',
    title: '瑞士國際主義排版在數位索引介面中的光學微幾何特徵應用',
    summary:
      '當我們拋棄粗暴的粗線與 Alert Box 俗套，如何透過右端句點壓陣、微亮藍色絲織書籤 Tag 等手法，在畫面上精準分配視覺預算，打造冷冽、克制且高階的軟體工程師數位美學。',
    date: '2026.04.12',
    tags: ['Design', 'Type'],
  },
])

const currentTag = ref('')

const allTags = computed(() => {
  const tagsSet = new Set<string>()
  articles.value.forEach((article) => {
    article.tags.forEach((t) => tagsSet.add(t))
  })
  return Array.from(tagsSet)
})

const filteredArticles = computed(() => {
  if (!currentTag.value) return articles.value
  return articles.value.filter((article) => article.tags.includes(currentTag.value))
})
</script>
