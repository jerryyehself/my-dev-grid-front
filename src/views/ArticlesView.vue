<template>
  <div class="w-full">
    <div class="flex mb-[-1px] relative z-10">
      <div class="flex flex-wrap gap-x-1 items-end">
        <BaseButton variant="tab" :active="!currentTag" @click="currentTag = ''">
          All_Essays
        </BaseButton>

        <BaseButton
          v-for="tag in allTags"
          :key="tag"
          variant="tab"
          :active="currentTag === tag"
          @click="currentTag = currentTag === tag ? '' : tag"
        >
          {{ tag }}
        </BaseButton>
      </div>
    </div>

    <div
      class="border border-(--border-shelf) bg-(--bg-paper-light) rounded-b shadow-[0_4px_24px_rgba(27,25,24,0.01)] overflow-hidden"
    >
      <div v-if="filteredArticles.length > 0" class="divide-y divide-(--text-ink-main)/10">
        <article
          v-for="article in filteredArticles"
          :key="article.id"
          class="group bg-transparent p-6 rounded-none hover:bg-(--text-ink-main)/[0.02] transition-colors duration-150 ease-out cursor-pointer"
          @click="router.push({ name: 'article-detail', params: { id: article.id } })"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-[10px] font-mono tracking-wider text-(--text-ink-body)/50"
              >2026-07-09</span
            >
            <span class="text-[10px] text-(--text-accent) font-mono uppercase font-semibold"
              >// INTERNALS</span
            >
          </div>

          <h3
            class="text-base font-bold text-(--text-ink-main) mb-2 group-hover:text-(--text-accent) transition-colors duration-150 ease-out"
          >
            {{ article.title }}
          </h3>

          <p class="text-(--text-ink-body) text-[0.9375rem] leading-relaxed mb-4 text-justify">
            {{ article.summary }}
          </p>

          <div class="flex items-center gap-2 text-xs font-mono text-(--text-ink-body)/50">
            <span>INDEX: #{{ article.id }}</span>
            <span class="text-(--text-ink-main)/20">•</span>
            <span
              >STATUS:
              <code
                class="text-(--text-ink-main) bg-(--bg-folder) px-1.5 py-0.5 rounded border border-(--text-ink-main)/5"
                >STABLE</code
              ></span
            >
          </div>
        </article>
      </div>

      <div
        v-if="filteredArticles.length === 0"
        class="py-24 text-center text-[11px] font-mono text-(--text-ink-body)/40 tracking-widest"
      >
        // NO_DOCUMENTS_FOUND
      </div>

      <div
        v-if="filteredArticles.length > 0"
        class="flex items-center justify-center gap-1.5 py-6 border-t border-(--text-ink-main)/5 bg-(--text-ink-main)/[0.01]"
      >
        <BaseButton variant="page" disabled>&lt;&lt; PREV</BaseButton>
        <BaseButton variant="page" active>01</BaseButton>
        <BaseButton variant="page">02</BaseButton>
        <BaseButton variant="page">03</BaseButton>
        <BaseButton variant="page">NEXT &gt;&gt;</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { articles as articleList } from '@/data/articles'
import BaseButton from '@/components/BaseButton.vue'

const router = useRouter()
const articles = ref(articleList)

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
