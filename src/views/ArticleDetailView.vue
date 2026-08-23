<template>
  <div v-if="article" class="max-w-[980px] mx-auto">
    <BackToArticlesLink class="mb-7 inline-flex" />

    <div class="border-b border-(--border-shelf) pb-6 mb-8">
      <div class="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.24em] text-(--text-accent) font-bold mb-3">
        <span>// {{ article.tags.join(' / ') }}</span>
        <span class="text-(--text-ink-muted) font-normal opacity-60">{{ article.date }}</span>
      </div>

      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-(--text-ink-main) leading-tight">
        {{ article.title }}
      </h1>

      <p class="max-w-2xl text-base leading-8 text-(--text-ink-body) mt-4">
        {{ article.intro }}
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-10 items-start">
      <div>
        <section class="space-y-7">
          <article v-for="section in article.sections" :key="section.heading" class="space-y-2.5">
            <h3 class="text-base font-bold text-(--text-ink-main) flex items-center gap-2">
              <span class="text-(--text-accent)">//</span>
              <span>{{ section.heading }}</span>
            </h3>
            <p class="text-[15px] leading-8 text-(--text-ink-body) text-justify">
              {{ section.body }}
            </p>
          </article>
        </section>

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
      <div v-if="article.relatedProjects?.length" class="lg:sticky lg:top-24">
        <div class="text-[10px] font-mono uppercase tracking-[0.24em] text-(--text-ink-muted) mb-2.5">
          Related Projects
        </div>
        <div class="flex flex-col gap-2">
          <span
            v-for="project in article.relatedProjects"
            :key="project"
            class="inline-block rounded-full border border-(--border-shelf) px-3 py-1.5 text-sm text-(--text-ink-body) w-fit"
          >
            {{ project }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="rounded border border-(--border-shelf) bg-(--bg-paper-light) p-8 text-sm text-(--text-ink-body)">
    找不到這篇文章。
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { articles, getArticleById } from '@/data/articles'
import BackToArticlesLink from '@/components/BackToArticlesLink.vue'

const route = useRoute()
const article = computed(() => getArticleById(route.params.id as string))

const currentIndex = computed(() => {
  if (!article.value) return -1
  return articles.findIndex((item) => item.id === article.value?.id)
})

const previousArticle = computed(() => {
  const index = currentIndex.value
  if (index <= 0) return null
  return articles[index - 1]
})

const nextArticle = computed(() => {
  const index = currentIndex.value
  if (index === -1 || index >= articles.length - 1) return null
  return articles[index + 1]
})
</script>
