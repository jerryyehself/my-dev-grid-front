<template>
  <BaseLoadingBlock v-if="!ready && !loadError" height="320px">載入中…</BaseLoadingBlock>
  <BaseLoadingBlock v-else-if="loadError || !article" height="320px" tone="error">
    找不到這篇文章。
  </BaseLoadingBlock>

  <div v-else class="w-full">
    <div class="flex items-center justify-between gap-4 mb-7">
      <BackToArticlesLink class="inline-flex" />
      <!-- 編輯頁的入口。D-56 落地後 /articles/:id/edit 是 requiresAuth 路由，
           未登入點進去會被導去登入頁——連結本身不因登入狀態隱藏，見 ArticlesView.vue
           同一類連結的說明。 -->
      <router-link
        :to="{ name: 'article-editor', params: { id: article.id } }"
        class="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.24em] uppercase text-(--text-ink-muted) hover:text-(--text-accent) transition-colors duration-100 ease-out"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        編輯
      </router-link>
    </div>

    <div class="border-b border-(--border-shelf) pb-6 mb-8">
      <div class="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.24em] text-(--text-accent) font-bold mb-3">
        <span v-if="tags.length">// {{ tags.join(' / ') }}</span>
        <span class="text-(--text-ink-muted) font-normal opacity-60">{{ displayDate(article) }}</span>
      </div>

      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-(--text-ink-main) leading-tight">
        {{ article.title }}
      </h1>

      <p v-if="intro" class="max-w-2xl text-base leading-8 text-(--text-ink-body) mt-4">
        {{ intro }}
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-10 items-start">
      <div>
        <MarkdownBody :source="article.body ?? ''" />

        <div v-if="previousArticle || nextArticle" class="flex flex-col sm:flex-row gap-3 border-t border-(--border-shelf) pt-6 mt-8">
          <router-link
            v-if="previousArticle"
            :to="{ name: 'article-detail', params: { id: previousArticle.id } }"
            class="flex-1 rounded-md border border-(--border-shelf) bg-(--bg-paper-light) px-4 py-3 transition-colors hover:border-(--text-accent)/40"
          >
            <div class="text-[10px] font-mono uppercase tracking-[0.24em] text-(--text-ink-muted)">
              &lt;&lt; PREV
            </div>
            <div class="mt-1.5 text-sm font-semibold text-(--text-ink-main)">
              {{ previousArticle.title }}
            </div>
          </router-link>

          <router-link
            v-if="nextArticle"
            :to="{ name: 'article-detail', params: { id: nextArticle.id } }"
            class="flex-1 rounded-md border border-(--border-shelf) bg-(--bg-paper-light) px-4 py-3 text-right transition-colors hover:border-(--text-accent)/40"
          >
            <div class="text-[10px] font-mono uppercase tracking-[0.24em] text-(--text-ink-muted)">
              NEXT &gt;&gt;
            </div>
            <div class="mt-1.5 text-sm font-semibold text-(--text-ink-main)">
              {{ nextArticle.title }}
            </div>
          </router-link>
        </div>
      </div>

      <!-- 邊注欄：跟正文分開卻仍在視野內，不打斷閱讀主線 -->
      <div class="lg:sticky lg:top-24 flex flex-col gap-8">
        <div v-if="headings.length">
          <div class="text-[10px] font-mono uppercase tracking-[0.24em] text-(--text-ink-muted) mb-2.5">
            本文結構
          </div>
          <!-- slug 從 extractHeadings 來，跟 MarkdownBody 渲染標題時用的是同一份，
               所以目錄的 href 一定對得上內文的 id。兩邊各自算 slug 會漂移，
               而漂移的症狀是「點了沒反應」，不會有任何錯誤訊息 -->
          <ol class="flex flex-col gap-2 border-l border-(--border-shelf) pl-3.5">
            <li v-for="heading in headings" :key="heading.slug">
              <a
                :href="`#${heading.slug}`"
                class="text-sm text-(--text-ink-body) hover:text-(--text-accent) transition-colors leading-snug"
                :class="heading.depth >= 3 ? 'pl-3 text-[13px] opacity-80' : ''"
              >
                {{ heading.text }}
              </a>
            </li>
          </ol>
        </div>

        <div v-if="article.implementations.length">
          <div class="text-[10px] font-mono uppercase tracking-[0.24em] text-(--text-ink-muted) mb-2.5">
            Related Projects
          </div>
          <div class="flex flex-col gap-2">
            <span
              v-for="project in article.implementations"
              :key="project.id"
              class="inline-block rounded-full border border-(--border-shelf) px-3 py-1.5 text-sm text-(--text-ink-body) w-fit"
            >
              {{ project.title }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 文章詳情頁。D-56 落地後第一次真的接上 /api/documentations——之前這裡讀的是
// src/data/articles.ts 的假資料，訪客看到的內容跟後台編輯器完全斷開。
//
// 上一篇/下一篇：改用真的文章清單算相鄰位置，只在「已發布」的子集合裡找——
// 草稿不該出現在瀏覽動線裡，即使草稿本身（透過編輯頁的「預覽」連結）還是
// 可以直接用 id 開啟：這裡不擋草稿本身的讀取，只是不讓它出現在 prev/next。
// tags／Related Projects：後端沒有自由標籤欄位（D-40），改用真的圖譜關聯
// （techniques→標籤、implementations→Related Projects）。
// margins（邊註）：後端沒有對應欄位（技術債，見 management-debt-ledger.md），
// 這裡直接不顯示，不假裝有資料可以讀。
import { computed, ref, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { fetchArticle, fetchArticles, type ArticleDto } from '@/api/articles'
import { excerptOf } from '@/components/markdown/excerpt'
import BackToArticlesLink from '@/components/BackToArticlesLink.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import MarkdownBody from '@/components/markdown/MarkdownBody.vue'
import { extractHeadings } from '@/components/markdown/headings'

const route = useRoute()
const articleId = computed(() => Number(route.params.id))

const article = ref<ArticleDto | null>(null)
const publishedList = ref<ArticleDto[]>([])
const ready = ref(false)
const loadError = ref(false)

async function load() {
  ready.value = false
  loadError.value = false
  article.value = null
  try {
    const [a, all] = await Promise.all([fetchArticle(articleId.value), fetchArticles()])
    article.value = a
    publishedList.value = all.filter((item) => item.status === 1)
    ready.value = true
  } catch {
    loadError.value = true
  }
}
watch(articleId, load, { immediate: true })

function displayDate(a: ArticleDto): string {
  const raw = a.creation_date ?? a.created_at
  return raw ? raw.slice(0, 10) : '—'
}

const tags = computed(() => {
  if (!article.value) return []
  return [...article.value.techniques, ...article.value.implementations].map((t) => t.title)
})

const intro = computed(() => (article.value ? excerptOf(article.value.body ?? '') : ''))

/** 本文結構側欄。跟 MarkdownBody 內部用的是同一個 extractHeadings，slug 不會分岔。 */
const headings = computed(() => (article.value ? extractHeadings(article.value.body ?? '') : []))

// route.meta 的 tag/title 只是掛載前的靜態佔位，這裡掛載後改寫成真正的文章標題，
// 讓捲動追蹤列（MainLayout）顯示的內容跟頁面上真正的文章標題一致，不是寫死的「Article Detail」
watchEffect(() => {
  if (article.value) {
    route.meta.tag = 'ARTICLES'
    route.meta.title = article.value.title
  }
})

const currentIndex = computed(() => {
  if (!article.value) return -1
  return publishedList.value.findIndex((item) => item.id === article.value?.id)
})

const previousArticle = computed(() => {
  const index = currentIndex.value
  if (index <= 0) return null
  return publishedList.value[index - 1]
})

const nextArticle = computed(() => {
  const index = currentIndex.value
  if (index === -1 || index >= publishedList.value.length - 1) return null
  return publishedList.value[index + 1]
})
</script>
