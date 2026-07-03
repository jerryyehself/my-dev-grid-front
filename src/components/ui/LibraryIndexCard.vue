<template>
  <div
    class="library-index-card w-full p-5 border border-(--border-shelf) rounded-md bg-(--bg-paper-light)/30 relative overflow-hidden group transition-all duration-300 hover:border-(--text-accent) hover:shadow-xs font-mono text-[11px] leading-relaxed text-(--text-ink-body)"
  >
    <div
      class="absolute inset-0 bg-[linear-gradient(to_bottom,var(--border-shelf)_1px,transparent_1px)] bg-[size:100%_1.5rem] opacity-[0.02] pointer-events-none"
    ></div>

    <div class="relative z-10 space-y-2.5">
      <div
        class="flex items-center justify-between text-[10px] text-(--text-ink-muted) select-none border-b border-dashed border-(--border-shelf)/40 pb-1.5"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-(--text-accent) font-bold">[REF_ID]</span>
          <span class="text-(--text-ink-main) font-bold">{{ indexRef }}</span>
        </div>
        <div class="tracking-wider text-right">
          {{ callNumber }}
        </div>
      </div>

      <div class="flex items-start gap-3 pt-0.5">
        <span class="w-12 text-[10px] text-(--text-accent) font-black select-none shrink-0"
          >[TITLE]</span
        >
        <h3 class="text-xs font-bold text-(--text-ink-main) tracking-wide font-sans">
          {{ title }}
          <span v-if="date" class="text-[10px] font-mono font-normal text-(--text-ink-muted) ml-1"
            >({{ date }})</span
          >
        </h3>
      </div>

      <div class="flex items-start gap-3 border-t border-dashed border-(--border-shelf)/30 pt-2.5">
        <span class="w-12 text-[10px] text-(--text-ink-muted) select-none shrink-0">[SCOPE]</span>
        <div class="text-xs font-sans text-(--text-ink-body) leading-relaxed text-justify pr-2">
          <slot />
        </div>
      </div>

      <div
        v-if="tags && tags.length"
        class="flex items-start gap-3 border-t border-dashed border-(--border-shelf)/30 pt-2.5"
      >
        <span class="w-12 text-[10px] text-(--text-ink-muted) select-none shrink-0">[SUBJECT]</span>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-(--text-accent)">
          <span v-for="tag in tags" :key="tag" class="hover:underline cursor-default">
            $x {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <div
      class="absolute bottom-0 left-0 right-0 h-[2px] bg-(--border-shelf)/30 group-hover:bg-(--text-accent)/50 transition-all duration-300"
    ></div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  title: string // 專案名稱 (e.g., 工程履約管理系統)
  indexRef: string // 系統編號索引 (e.g., SYS_01)
  callNumber: string // 模擬圖書館索書號分类 (e.g., 005.13 / CONTRACT)
  date?: string // 建檔活躍年份 (e.g., 2026)
  tags?: string[] // 技術標籤群 (e.g., ['Laravel 9', 'MySQL'])
}>()
</script>
