<script setup lang="ts">
// 文章清單。D-56 落地後第一次真的接上 /api/documentations——之前這裡讀的是
// src/data/articles.ts 的假資料，跟後台編輯器（已經真的能存）完全斷開：
// 編輯器新增的文章，訪客在這裡從來看不到。
//
// tags：後端沒有自由文字標籤欄位（D-40），這裡改用真的圖譜關聯
// （techniques／implementations 的 title）當篩選依據。
// summary：D-57，不是獨立欄位，取 body 第一段（見 excerptOf）。
// 只列 status===1（已發布）——草稿不該出現在訪客看得到的清單。
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { fetchArticlesOrDemo, type ArticleDto } from '@/api/articles'
import { excerptOf } from '@/components/markdown/excerpt'
import BaseButton from '@/components/BaseButton.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'

const router = useRouter()

const ready = ref(false)
const loadError = ref(false)
const isDemoData = ref(false)
const articles = ref<ArticleDto[]>([])

async function load() {
  ready.value = false
  loadError.value = false
  try {
    // fetchArticlesOrDemo()：正常打真的 API，連不上（本機沒開後端）才退回填充內容，
    // 見 api/articles.ts 的說明——跟 Home 頁專案/知識網路小工具同一套 fallback 慣例。
    const { articles: all, isDemo } = await fetchArticlesOrDemo()
    isDemoData.value = isDemo
    // 後端 index() 依 title 排序（DocumentationController），不是日期——
    // 時間軸要照日期分組，這裡一定要自己重排，不能假設 API 順序就是時間序。
    articles.value = all
      .filter((a) => a.status === 1)
      .sort((a, b) => displayDate(b).localeCompare(displayDate(a)))
    ready.value = true
  } catch {
    loadError.value = true
  }
}
load()

function tagsOf(a: ArticleDto): string[] {
  return [...a.techniques, ...a.implementations].map((t) => t.title)
}

function summaryOf(a: ArticleDto): string {
  return excerptOf(a.body ?? '')
}

function displayDate(a: ArticleDto): string {
  const raw = a.creation_date ?? a.created_at
  return raw ? raw.slice(0, 10) : '—'
}

const viewMode = ref<'timeline' | 'folder'>('timeline')
const currentTag = ref('')

const allTags = computed(() => {
  const tagsSet = new Set<string>()
  articles.value.forEach((article) => {
    tagsOf(article).forEach((t) => tagsSet.add(t))
  })
  return Array.from(tagsSet)
})

// 時間軸：依 displayDate（YYYY-MM-DD）換算月份分組
const monthLabel = (date: string) => {
  const [year, month] = date.split('-')
  return `${year}年${Number(month)}月`
}

const timelineGroups = computed(() => {
  const groups: { month: string; articles: ArticleDto[] }[] = []
  for (const article of articles.value) {
    const month = monthLabel(displayDate(article))
    const last = groups[groups.length - 1]
    if (last && last.month === month) {
      last.articles.push(article)
    } else {
      groups.push({ month, articles: [article] })
    }
  }
  return groups
})

// 分類夾：依標籤過濾，卡片用鬆散堆疊呈現
const folderArticles = computed(() => {
  if (!currentTag.value) return articles.value
  return articles.value.filter((article) => tagsOf(article).includes(currentTag.value))
})

const goToArticle = (id: number) => {
  router.push({ name: 'article-detail', params: { id } })
}
</script>

<template>
  <div class="w-full">
    <div class="flex items-center justify-between gap-4 mb-6">
      <!-- 管理頁入口。D-56 落地後 /articles/manage 本身已經是 requiresAuth 路由，
           未登入點進去會被導去登入頁——這裡刻意不因為登入狀態隱藏連結本身,
           見到「管理」但點進去先被要求登入,是常見且合理的模式,不是假訊號。 -->
      <router-link
        :to="{ name: 'article-manage' }"
        class="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.24em] uppercase text-(--text-ink-muted) hover:text-(--text-accent) transition-colors duration-100 ease-out"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        管理
      </router-link>
      <div class="inline-flex rounded-full border border-(--border-shelf) p-0.5 gap-0.5">
        <button
          type="button"
          class="px-4 py-1.5 rounded-full font-mono text-[11px] tracking-wider font-bold transition-colors cursor-pointer"
          :class="
            viewMode === 'timeline'
              ? 'bg-(--bg-folder) text-(--text-accent)'
              : 'text-(--text-ink-muted) hover:text-(--text-ink-main)'
          "
          @click="viewMode = 'timeline'"
        >
          時間軸
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-full font-mono text-[11px] tracking-wider font-bold transition-colors cursor-pointer"
          :class="
            viewMode === 'folder'
              ? 'bg-(--bg-folder) text-(--text-accent)'
              : 'text-(--text-ink-muted) hover:text-(--text-ink-main)'
          "
          @click="viewMode = 'folder'"
        >
          分類夾
        </button>
      </div>
    </div>

    <BaseLoadingBlock v-if="!ready && !loadError" height="240px">載入中…</BaseLoadingBlock>
    <BaseLoadingBlock v-else-if="loadError" height="240px" tone="error">
      文章清單載入失敗，重新整理再試一次。
    </BaseLoadingBlock>

    <template v-else>
    <p v-if="isDemoData" class="text-[11px] font-mono text-(--text-accent) tracking-widest mb-4">
      // DEMO_DATA（連不上後端，顯示的是填充內容，不是真的文章）
    </p>
    <!-- 時間軸：依日期線性掃視 -->
    <div v-if="viewMode === 'timeline'" class="relative pl-7">
      <div class="absolute left-[5px] top-1.5 bottom-1.5 w-0.5 bg-(--border-shelf)"></div>

      <template v-for="group in timelineGroups" :key="group.month">
        <div class="relative my-6 first:mt-0">
          <div
            class="absolute -left-7 top-0.5 w-3 h-3 rounded-full bg-(--text-accent) ring-[3px] ring-(--bg-paper-light)"
          ></div>
          <div class="font-mono text-xs tracking-wider font-bold text-(--text-accent)">
            {{ group.month }}
          </div>
        </div>

        <article
          v-for="article in group.articles"
          :key="article.id"
          class="relative pb-6 cursor-pointer group"
          @click="goToArticle(article.id)"
        >
          <div
            class="absolute -left-[24.5px] top-[7px] w-[7px] h-[7px] rounded-full bg-(--text-ink-muted)"
          ></div>
          <div class="flex items-center gap-3 mb-2 font-mono text-[10px] uppercase tracking-wider">
            <span class="text-(--text-ink-muted)">{{ displayDate(article) }}</span>
            <span v-if="tagsOf(article).length" class="text-(--text-accent) font-bold">// {{ tagsOf(article)[0] }}</span>
          </div>
          <h3
            class="text-base font-bold text-(--text-ink-main) mb-1.5 group-hover:text-(--text-accent) transition-colors"
          >
            {{ article.title }}
          </h3>
          <p class="text-(--text-ink-body) text-sm leading-relaxed text-left sm:text-justify max-w-[620px]">
            {{ summaryOf(article) }}
          </p>
        </article>
      </template>
    </div>

    <!-- 分類夾：依標籤切換
         手機寬度放不下全部標籤時改成橫向捲動、不換行，避免頁籤換成兩行後
         啟用中的頁籤跟下面卡片的邊框接不起來（換行後只有最後一行貼得到卡片） -->
    <div v-else>
      <div
        class="flex mb-[-1px] relative z-10 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div class="flex flex-nowrap gap-x-1 items-end">
          <BaseButton variant="tab" class="shrink-0" :active="!currentTag" @click="currentTag = ''">
            All_Essays
          </BaseButton>

          <BaseButton
            v-for="tag in allTags"
            :key="tag"
            variant="tab"
            class="shrink-0"
            :active="currentTag === tag"
            @click="currentTag = currentTag === tag ? '' : tag"
          >
            {{ tag }}
          </BaseButton>
        </div>
      </div>

      <!-- 原本每張卡片各自旋轉角度、疊出鬆散紙堆的效果拿掉了：這種扭動除了「看起來像一疊
           紙」之外不代表任何資訊，在文章條數一多的清單裡只會讓版面更亂，不是加分——跟
           `.claude/skills/visual-design-language` 記錄的判斷一致（無法自我證成的裝飾元素
           該拿掉，不是想辦法合理化它留下）。改用跟首頁近況板、時間軸同一套
           「線條分隔、不用陰影堆疊」的清單樣式（divide-y 取代逐格 border+shadow+旋轉），
           hover 用背景色變化取代邊框變色，跟全站清單的互動語言一致。 -->
      <div class="border border-(--border-shelf) bg-(--bg-paper-light) rounded-b rounded-tr-md divide-y divide-(--border-shelf)">
        <article
          v-for="article in folderArticles"
          :key="article.id"
          class="p-5 sm:p-6 cursor-pointer hover:bg-(--bg-folder) transition-colors"
          @click="goToArticle(article.id)"
        >
          <div class="flex items-center gap-3 mb-2 font-mono text-[10px] uppercase tracking-wider">
            <span class="text-(--text-ink-muted)">{{ displayDate(article) }}</span>
            <span v-if="tagsOf(article).length" class="text-(--text-accent) font-bold">// {{ tagsOf(article).join(' / ') }}</span>
          </div>
          <h3 class="text-[15px] font-bold text-(--text-ink-main) mb-1.5">{{ article.title }}</h3>
          <p class="text-(--text-ink-body) text-[13.5px] leading-relaxed text-left sm:text-justify max-w-[700px]">
            {{ summaryOf(article) }}
          </p>
        </article>

        <div
          v-if="folderArticles.length === 0"
          class="py-16 text-center text-[11px] font-mono text-(--text-ink-body)/40 tracking-widest"
        >
          // NO_DOCUMENTS_FOUND
        </div>
      </div>
    </div>
    </template>
  </div>
</template>
