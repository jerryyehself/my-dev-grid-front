<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseTag from '@/components/BaseTag.vue'
import { fetchProjectsOrDemo, type Project } from '@/api/projects'
import { fetchArticles, type ArticleDto } from '@/api/articles'

// 首頁「近況板」：左欄「近期專案」用真實 fetchProjectsOrDemo() 資料（跟 KnowledgeGraphPanel
// 同一套「正常打 API、連不上才退回存好的快照＋顯示「示範資料」提示」誠實 fallback），右欄「近期文章」
// 打真的 /api/documentations——**這裡原本讀 src/data/articles.ts，註解宣稱那是「網站本來就有
// 的真實文章清單」，但那份檔案其實是純假資料，後台編輯器新增的文章從來不會出現在這裡。**
// 2026-09-23 改成真的 API：只列 status===1（已發布），跟 ArticlesView.vue 同一個規則。
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

function articleDate(a: ArticleDto): string {
  const raw = a.creation_date ?? a.created_at
  return raw ? raw.slice(0, 10) : ''
}

const recentArticles = ref<ArticleDto[]>([])
const articlesLoading = ref(true)

// 後端 DocumentationController@index() 依 title 排序，不是日期——首頁只帶前 4 筆
// 當「近期動態」，一定要自己重排成日期新到舊，不能假設 API 回傳順序。
onMounted(async () => {
  const all = await fetchArticles().catch(() => [])
  recentArticles.value = all
    .filter((a) => a.status === 1)
    .sort((a, b) => articleDate(b).localeCompare(articleDate(a)))
    .slice(0, 4)
  articlesLoading.value = false
})
</script>

<template>
  <section class="w-full">
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 class="text-[15px] tracking-[0.08em] font-bold text-(--text-accent)">近況板</h2>
    </div>
    <p class="text-sm text-(--text-ink-body) mb-4">GitHub 上的公開專案，以及最近發布的文章。</p>

    <div class="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-6 items-start">
      <!-- 左欄：近期專案（真實 maintain_status，tiered accent/muted tag） -->
      <div>
        <h3
          class="flex items-center gap-1.5 text-[13px] font-bold tracking-[0.05em] text-(--text-ink-muted) mb-2.5"
        >
          <span>近期專案</span>
        </h3>

        <div v-if="projectsLoading" class="h-[140px] flex items-center justify-center rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) text-[11px] font-mono text-(--text-ink-body)/40 tracking-widest">
          專案載入中…
        </div>

        <!-- 固定高度＋內部捲動：清單一長「近況板」本身就會被撐得很長，跟 /projects
             行動版清單（同樣 max-h-80）用同一個高度慣例，讓全站「清單裝在固定高度
             盒子裡」的視覺語言一致，不是這裡另外發明一個數字 -->
        <div v-else class="max-h-80 overflow-y-auto overflow-x-hidden rounded-xl border border-(--border-shelf) bg-(--bg-paper-light)">
          <RouterLink
            v-for="p in projects"
            :key="p.id"
            :to="{ path: '/projects', query: { project: p.id } }"
            class="flex items-center justify-between gap-3 px-[18px] py-3.5 border-b border-(--border-shelf) last:border-b-0 hover:bg-(--bg-folder) transition-colors"
          >
            <div class="min-w-0">
              <div class="text-[14px] font-semibold text-(--text-ink-main) truncate">{{ p.title }}</div>
              <div v-if="p.tags.length" class="text-[12.5px] text-(--text-ink-muted) truncate">
                {{ p.tags.slice(0, 4).join(' · ') }}
              </div>
            </div>
            <BaseTag v-if="p.status" :tone="tagTone(p.statusType)" class="shrink-0">{{ p.status }}</BaseTag>
          </RouterLink>
          <p v-if="!projects.length" class="px-[18px] py-4 text-[14px] text-(--text-ink-muted)">
            目前沒有可顯示的專案。
          </p>
        </div>

        <p v-if="!projectsLoading && isDemoData" class="text-[14px] text-(--text-accent) mt-2">
          示範資料（連不上後端，顯示的是存好的資料快照，不是即時資料）
        </p>

        <RouterLink to="/projects" class="inline-block mt-2.5 text-[13px] tracking-[0.05em] text-(--text-ink-muted) hover:text-(--text-accent)">
          所有專案 →
        </RouterLink>
      </div>

      <!-- 右欄：近期文章（真的打 /api/documentations，只列已發布） -->
      <div>
        <h3
          class="flex items-center gap-1.5 text-[13px] font-bold tracking-[0.05em] text-(--text-ink-muted) mb-2.5"
        >
          <span>近期文章</span>
        </h3>

        <!-- 跟左欄近期專案用同一個 max-h-80，兩欄高度上限一致 -->
        <div class="max-h-80 overflow-y-auto overflow-x-hidden rounded-xl border border-(--border-shelf) bg-(--bg-paper-light)">
          <RouterLink
            v-for="a in recentArticles"
            :key="a.id"
            :to="{ name: 'article-detail', params: { id: a.id } }"
            class="block px-[18px] py-3 border-b border-(--border-shelf) last:border-b-0 hover:bg-(--bg-folder) transition-colors"
          >
            <div class="flex items-center gap-2 mb-1 font-mono text-[11px]">
              <span class="text-(--text-ink-muted) tabular-nums">{{ articleDate(a) }}</span>
            </div>
            <div class="text-[14px] leading-snug text-(--text-ink-body)">{{ a.title }}</div>
          </RouterLink>
          <p v-if="!articlesLoading && !recentArticles.length" class="px-[18px] py-4 text-[14px] text-(--text-ink-muted)">
            目前沒有已發布的文章。
          </p>
        </div>

        <RouterLink to="/articles" class="inline-block mt-2.5 text-[13px] tracking-[0.05em] text-(--text-ink-muted) hover:text-(--text-accent)">
          所有文章 →
        </RouterLink>
      </div>
    </div>

    <!-- 給訪客的讀法說明。原本這裡是開發筆記（比設計稿少了哪一欄、為什麼），2026-09-30 使用者
         決定改成對應的說明；那段取捨的紀錄在 design-artifacts.md「近期焦點」那一列 -->
    <p class="mt-4 text-[14px] leading-relaxed text-(--text-ink-muted)">
      專案右側的標籤是 repo 在 GitHub 上有沒有封存（Active／Archived）；文章只列已發布的。
    </p>
  </section>
</template>
