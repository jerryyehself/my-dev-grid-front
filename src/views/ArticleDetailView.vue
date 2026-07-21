<template>
  <div v-if="article" class="space-y-8">
    <header class="space-y-4 border-b border-stone-200 pb-6">
      <div class="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.24em] text-stone-500">
        <span>{{ article.date }}</span>
        <span>•</span>
        <span>{{ article.tags.join(' / ') }}</span>
      </div>

      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">
        {{ article.title }}
      </h2>

      <p class="max-w-3xl text-base leading-8 text-stone-600">
        {{ article.intro }}
      </p>
    </header>

    <section class="space-y-6">
      <article v-for="(section, index) in article.sections" :key="section.heading" class="space-y-3">
        <div class="flex items-center gap-3">
          <span class="text-[11px] font-mono uppercase tracking-[0.24em] text-stone-400">
            0{{ index + 1 }}
          </span>
          <h3 class="text-lg font-semibold text-stone-900">
            {{ section.heading }}
          </h3>
        </div>
        <p class="text-[15px] leading-8 text-stone-600">
          {{ section.body }}
        </p>
      </article>
    </section>

    <section v-if="article.relatedProjects?.length" class="border-t border-stone-200 pt-6">
      <h3 class="text-sm font-mono uppercase tracking-[0.24em] text-stone-500">
        Related Projects
      </h3>
      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="project in article.relatedProjects"
          :key="project"
          class="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-700"
        >
          {{ project }}
        </span>
      </div>
    </section>

    <section class="border-t border-stone-200 pt-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <router-link
          v-if="previousArticle"
          :to="{ name: 'article-detail', params: { id: previousArticle.id } }"
          class="w-full rounded border border-stone-200 px-4 py-3 text-left transition-colors hover:border-stone-400 hover:bg-stone-50 sm:w-[calc(50%-0.375rem)]"
        >
          <div class="text-[10px] font-mono uppercase tracking-[0.24em] text-stone-400">
            ← Previous
          </div>
          <div class="mt-1 text-sm font-medium text-stone-800">
            {{ previousArticle.title }}
          </div>
        </router-link>

        <router-link
          v-if="nextArticle"
          :to="{ name: 'article-detail', params: { id: nextArticle.id } }"
          class="w-full rounded border border-stone-200 px-4 py-3 text-right transition-colors hover:border-stone-400 hover:bg-stone-50 sm:w-[calc(50%-0.375rem)] sm:ml-auto"
        >
          <div class="text-[10px] font-mono uppercase tracking-[0.24em] text-stone-400">
            Next →
          </div>
          <div class="mt-1 text-sm font-medium text-stone-800">
            {{ nextArticle.title }}
          </div>
        </router-link>
      </div>
    </section>
  </div>

  <div v-else class="rounded border border-stone-200 bg-stone-50 p-8 text-sm text-stone-600">
    找不到這篇文章。
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { articles, getArticleById } from '@/data/articles'

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
