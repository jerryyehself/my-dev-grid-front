<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { articles as articleList } from '@/data/articles'
import BaseButton from '@/components/BaseButton.vue'

const router = useRouter()
const articles = ref(articleList)

const viewMode = ref<'timeline' | 'folder'>('timeline')
const currentTag = ref('')

const allTags = computed(() => {
  const tagsSet = new Set<string>()
  articles.value.forEach((article) => {
    article.tags.forEach((t) => tagsSet.add(t))
  })
  return Array.from(tagsSet)
})

// 時間軸：依 article.date（如 "2026.07.02"）換算月份分組
const monthLabel = (date: string) => {
  const [year, month] = date.split('.')
  return `${year}年${Number(month)}月`
}

const timelineGroups = computed(() => {
  const groups: { month: string; articles: typeof articleList }[] = []
  for (const article of articles.value) {
    const month = monthLabel(article.date)
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
  return articles.value.filter((article) => article.tags.includes(currentTag.value))
})

const goToArticle = (id: string) => {
  router.push({ name: 'article-detail', params: { id } })
}
</script>

<template>
  <div class="w-full">
    <div class="flex items-center justify-end mb-6">
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
            <span class="text-(--text-ink-muted)">{{ article.date }}</span>
            <span class="text-(--text-accent) font-bold">// {{ article.tags[0] }}</span>
          </div>
          <h3
            class="text-base font-bold text-(--text-ink-main) mb-1.5 group-hover:text-(--text-accent) transition-colors"
          >
            {{ article.title }}
          </h3>
          <p class="text-(--text-ink-body) text-sm leading-relaxed text-justify max-w-[620px]">
            {{ article.summary }}
          </p>
        </article>
      </template>
    </div>

    <!-- 分類夾：依標籤切換，鬆散紙疊 -->
    <div v-else>
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

      <div class="border border-(--border-shelf) bg-(--bg-paper-light) rounded-b rounded-tr-md p-6 sm:p-8">
        <article
          v-for="(article, index) in folderArticles"
          :key="article.id"
          class="bg-(--bg-paper-light) border border-(--border-shelf) rounded-lg p-5 cursor-pointer hover:border-(--text-accent)/40 transition-colors"
          :style="{
            marginTop: index === 0 ? '0' : '-10px',
            transform: `rotate(${index % 2 === 0 ? -0.8 : 1.1}deg)`,
            boxShadow: index === 0 ? '0 6px 18px rgba(0,0,0,0.06)' : '0 10px 22px rgba(0,0,0,0.09)',
            position: 'relative',
            zIndex: index + 1,
          }"
          @click="goToArticle(article.id)"
        >
          <div class="flex items-center gap-3 mb-2 font-mono text-[10px] uppercase tracking-wider">
            <span class="text-(--text-ink-muted)">{{ article.date }}</span>
            <span class="text-(--text-accent) font-bold">// {{ article.tags.join(' / ') }}</span>
          </div>
          <h3 class="text-[15px] font-bold text-(--text-ink-main) mb-1.5">{{ article.title }}</h3>
          <p class="text-(--text-ink-body) text-[13.5px] leading-relaxed text-justify max-w-[700px]">
            {{ article.summary }}
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
  </div>
</template>
