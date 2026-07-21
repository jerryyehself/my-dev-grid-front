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
          @click="router.push({ name: 'article-detail', params: { id: article.id } })"
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
            {{ article.summary }}
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
import { useRouter } from 'vue-router'
import { articles as articleList } from '@/data/articles'

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
