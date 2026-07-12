<template>
  <div class="w-full">
    <div class="flex mb-[-1px] relative z-10">
      <div class="flex flex-wrap gap-x-1 items-end">
        <button
          @click="currentTag = ''"
          :class="[
            !currentTag
              ? 'text-[var(--text-ink-main)] border-[var(--text-ink-main)]/10 border-b-transparent font-semibold pt-2.5 pb-2'
              : 'bg-[var(--text-ink-main)]/[0.04] text-[var(--text-ink-body)]/60 border-transparent hover:text-[var(--text-ink-main)] pt-2 pb-2 hover:bg-[var(--text-ink-main)]/[0.08]',
          ]"
          style="background-color: !currentTag ? 'var(--bg-paper-light)' : ''"
          class="transition-colors duration-150 font-mono uppercase tracking-wider text-[10px] px-4 rounded-t border cursor-pointer flex items-center h-[34px]"
        >
          All_Essays
        </button>

        <button
          v-for="tag in allTags"
          :key="tag"
          @click="currentTag = currentTag === tag ? '' : tag"
          :class="[
            currentTag === tag
              ? 'text-[var(--text-ink-main)] border-[var(--text-ink-main)]/10 border-b-transparent font-semibold pt-2.5 pb-2'
              : 'bg-[var(--text-ink-main)]/[0.04] text-[var(--text-ink-body)]/60 border-transparent hover:text-[var(--text-ink-main)] pt-2 pb-2 hover:bg-[var(--text-ink-main)]/[0.08]',
          ]"
          style="background-color: currentTag === tag ? 'var(--bg-paper-light)' : ''"
          class="transition-colors duration-150 font-mono uppercase tracking-wider text-[10px] px-4 rounded-t border cursor-pointer flex items-center h-[34px]"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div
      class="border rounded-b shadow-[0_4px_24px_rgba(27,25,24,0.01)] overflow-hidden"
      style="background-color: var(--bg-paper-light); border-color: rgba(var(--text-ink-main), 0.1)"
    >
      <div v-if="filteredArticles.length > 0" class="divide-y divide-[var(--text-ink-main)]/10">
        <article
          v-for="article in filteredArticles"
          :key="article.id"
          class="group bg-transparent p-6 rounded-none hover:bg-[var(--text-ink-main)]/[0.02] transition-colors duration-150 ease-out cursor-pointer"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-[10px] font-mono tracking-wider text-[var(--text-ink-body)]/50"
              >2026-07-09</span
            >
            <span
              class="text-[10px] text-amber-800 dark:text-amber-600 font-mono uppercase font-semibold"
              >// INTERNALS</span
            >
          </div>

          <h3
            class="text-base font-bold text-[var(--text-ink-main)] mb-2 group-hover:text-amber-800 dark:group-hover:text-amber-600 transition-colors duration-150 ease-out"
          >
            {{ article.title }}
          </h3>

          <p class="text-[var(--text-ink-body)] text-[0.9375rem] leading-relaxed mb-4 text-justify">
            {{ article.description }}
          </p>

          <div class="flex items-center gap-2 text-xs font-mono text-[var(--text-ink-body)]/50">
            <span>INDEX: #{{ article.id }}</span>
            <span class="text-[var(--text-ink-main)]/20">•</span>
            <span
              >STATUS:
              <code
                class="text-[var(--text-ink-main)] bg-[var(--bg-folder)] px-1.5 py-0.5 rounded border border-[var(--text-ink-main)]/5"
                >STABLE</code
              ></span
            >
          </div>
        </article>
      </div>

      <div
        v-if="filteredArticles.length === 0"
        class="py-24 text-center text-[11px] font-mono text-[var(--text-ink-body)]/40 tracking-widest"
      >
        // NO_DOCUMENTS_FOUND
      </div>

      <div
        v-if="filteredArticles.length > 0"
        class="flex items-center justify-center gap-1.5 py-6 border-t border-[var(--text-ink-main)]/5 bg-[var(--text-ink-main)]/[0.01]"
      >
        <button
          class="px-2.5 py-1.5 text-[11px] font-mono text-[var(--text-ink-body)]/30 cursor-not-allowed"
          disabled
        >
          &lt;&lt; PREV
        </button>

        <button
          class="px-2.5 py-1 text-[11px] font-mono font-bold rounded-xs text-[var(--bg-paper-light)]"
          style="background-color: var(--text-ink-main)"
        >
          01
        </button>

        <button
          class="px-2.5 py-1 text-[11px] font-mono text-[var(--text-ink-body)]/60 hover:bg-[var(--text-ink-main)]/[0.04] rounded-xs transition-colors"
        >
          02
        </button>

        <button
          class="px-2.5 py-1 text-[11px] font-mono text-[var(--text-ink-body)]/60 hover:bg-[var(--text-ink-main)]/[0.04] rounded-xs transition-colors"
        >
          03
        </button>

        <button
          class="px-2.5 py-1.5 text-[11px] font-mono text-[var(--text-ink-body)]/60 hover:bg-[var(--text-ink-main)]/[0.04] rounded-xs transition-colors"
        >
          NEXT &gt;&gt;
        </button>
      </div>
    </div>
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
