<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseTag from '@/components/BaseTag.vue'
import { fetchProjectsOrDemo, type Project } from '@/api/projects'
import { articles as articleList } from '@/data/articles'

// 首頁「近況板」：左欄「近期專案」用真實 fetchProjectsOrDemo() 資料（跟 KnowledgeGraphPanel
// 同一套「正常打 API、連不上才退回存好的快照＋顯示 DEMO_DATA」誠實 fallback），右欄「近期文章」
// 用網站本來就有的真實文章清單（src/data/articles.ts，不是為了這個元件另外編的）。
//
// 這裡刻意沒有照搬 Claude Design 稿（artifact 4492caf5）「其他孵化中」欄位的擱置中／待評估／
// 觀察中點子清單——那份清單是設計稿作者在畫布裡直接記下的個人待辦（GCP Cloud Run 部署、PARA
// 可行性評估等），my-dev-grid 後端完全沒有對應的欄位或資料表可以誠實地餵出這些內容，
// Documentation.status 雖然存在，但資料庫裡全部固定是 1、從沒被賦過別的值，套上去顯示會是
// 「看起來像真資料、其實沒有語意」的假象，所以不採用。範圍收斂成「後端真的查得到的東西」：
// 專案維護狀態（Implementation.maintain_status）。
//
// 「近況」tag 用 tiered accent/muted 處理（BaseTag 既有的 tone prop，不是另外發明新樣式）：
// 進行中(Active) 用 accent 高亮，已封存(Archived) 用 muted 收斂——呼應 [visual] 2026-09-02
// 對這份稿子的設計覆核意見（idea-stage tag 不要全部套同一種樣式）。目前資料庫兩個真實專案都是
// Active，muted 那一層還沒有真實資料能展示到，但邏輯本身兩種狀態都處理了，不是只做了一半。
const projects = ref<Project[]>([])
const projectsLoading = ref(true)
const isDemoData = ref(false)

const tagTone = (statusType: Project['statusType']): 'accent' | 'muted' | 'neutral' => {
  if (statusType === 'active') return 'accent'
  if (statusType === 'archived') return 'muted'
  return 'neutral'
}

onMounted(async () => {
  const { projects: list, isDemo } = await fetchProjectsOrDemo()
  projects.value = list
  isDemoData.value = isDemo
  projectsLoading.value = false
})

// 文章依日期新到舊排序（來源陣列本來就是新到舊，這裡不假設順序，直接照 "YYYY.MM.DD" 字串排序）；
// 首頁只帶前 4 筆當「近期動態」，其餘留給 /articles 頁。
const recentArticles = computed(() =>
  [...articleList].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 4),
)
</script>

<template>
  <section class="w-full">
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 class="font-mono text-[11px] tracking-[0.2em] uppercase font-bold text-(--text-accent)">近況板</h2>
    </div>
    <p class="text-sm text-(--text-ink-body) mb-4">目前維護中的專案，以及最近發布的文章。</p>

    <div class="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-6 items-start">
      <!-- 左欄：近期專案（真實 maintain_status，tiered accent/muted tag） -->
      <div>
        <h3
          class="flex items-center gap-1.5 font-mono text-[12px] font-extrabold tracking-[0.05em] uppercase text-(--text-ink-muted) mb-2.5"
        >
          <span class="text-(--text-accent)">//</span>
          <span>近期專案</span>
        </h3>

        <div v-if="projectsLoading" class="h-[140px] flex items-center justify-center rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) text-[11px] font-mono text-(--text-ink-body)/40 tracking-widest">
          // LOADING_PROJECTS...
        </div>

        <div v-else class="rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) overflow-hidden">
          <RouterLink
            v-for="p in projects"
            :key="p.id"
            to="/projects"
            class="flex items-center justify-between gap-3 px-[18px] py-3.5 border-b border-(--border-shelf) last:border-b-0 hover:bg-(--bg-folder) transition-colors"
          >
            <div class="min-w-0">
              <div class="text-[14px] font-semibold text-(--text-ink-main) truncate">{{ p.title }}</div>
              <div v-if="p.tags.length" class="text-[11.5px] text-(--text-ink-muted) truncate">
                {{ p.tags.slice(0, 4).join(' · ') }}
              </div>
            </div>
            <BaseTag v-if="p.status" :tone="tagTone(p.statusType)" class="shrink-0">{{ p.status }}</BaseTag>
          </RouterLink>
          <p v-if="!projects.length" class="px-[18px] py-4 text-[12.5px] text-(--text-ink-muted)">
            目前沒有可顯示的專案。
          </p>
        </div>

        <p v-if="!projectsLoading && isDemoData" class="text-[11px] font-mono text-(--text-accent) tracking-widest mt-2">
          // DEMO_DATA（連不上後端，顯示的是存好的資料快照，不是即時資料）
        </p>

        <RouterLink to="/projects" class="inline-block mt-2.5 font-mono text-[11px] tracking-[0.15em] uppercase text-(--text-ink-muted) hover:text-(--text-accent)">
          所有專案 →
        </RouterLink>
      </div>

      <!-- 右欄：近期文章（真實 src/data/articles.ts，不是佔位內容） -->
      <div>
        <h3
          class="flex items-center gap-1.5 font-mono text-[12px] font-extrabold tracking-[0.05em] uppercase text-(--text-ink-muted) mb-2.5"
        >
          <span class="text-(--text-accent)">//</span>
          <span>近期文章</span>
        </h3>

        <div class="rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) overflow-hidden">
          <RouterLink
            v-for="a in recentArticles"
            :key="a.id"
            :to="{ name: 'article-detail', params: { id: a.id } }"
            class="block px-[18px] py-3 border-b border-(--border-shelf) last:border-b-0 hover:bg-(--bg-folder) transition-colors"
          >
            <div class="flex items-center gap-2 mb-1 font-mono text-[10px]">
              <span class="font-bold text-(--text-accent)">// ARTICLE</span>
              <span class="text-(--text-ink-muted) tabular-nums">{{ a.date }}</span>
            </div>
            <div class="text-[12.5px] leading-snug text-(--text-ink-body)">{{ a.title }}</div>
          </RouterLink>
        </div>

        <RouterLink to="/articles" class="inline-block mt-2.5 font-mono text-[11px] tracking-[0.15em] uppercase text-(--text-ink-muted) hover:text-(--text-accent)">
          所有文章 →
        </RouterLink>
      </div>
    </div>

    <p class="mt-4 text-[12px] leading-relaxed text-(--text-ink-muted) border border-dashed border-(--border-shelf) rounded-xl px-4 py-3">
      <b class="text-(--text-ink-body)">這版範圍比原設計稿窄：</b>Claude Design 稿（<a
        href="https://claude.ai/code/artifact/4492caf5-9224-4786-a3b7-b40f48a284b1"
        target="_blank"
        rel="noopener"
        class="text-(--text-accent) hover:underline"
        >近期焦點</a
      >）原本還有一欄「其他孵化中」的點子清單（擱置中／待評估／觀察中），但那是設計稿作者當時記下的個人待辦，<code>my-dev-grid</code>
      後端沒有任何欄位能誠實地餵出這種「想法孵化階段」資料，所以這版先不做這欄，只留下真的查得到的兩件事：專案維護狀態、已發布文章。
    </p>
  </section>
</template>
