<script setup lang="ts">
// 一個詞出現在文章哪幾段：段落標題連到內文的錨點（跟「本文結構」目錄同一份 slug），右邊是次數。
// 桌機的彈出框與手機大綱樹展開的框共用。連結本身就看得出能點，不另外寫「點一下跳過去」（多餘的說明）。
import type { MindmapUnitLink } from './mindmapUnits'

defineProps<{ units: MindmapUnitLink[] }>()
defineEmits<{ navigate: [] }>()
</script>

<template>
  <ul class="list-none m-0 p-0">
    <li v-for="unit in units" :key="unit.slug" class="flex justify-between gap-2 leading-[22px]">
      <a
        :href="`#${unit.slug}`"
        class="min-w-0 truncate text-(--text-ink-body) underline decoration-[color-mix(in_srgb,var(--text-ink-muted)_50%,transparent)] underline-offset-[3px] hover:text-(--text-accent) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--text-accent)"
        @click="$emit('navigate')"
      >
        {{ unit.text }}
      </a>
      <span class="shrink-0 whitespace-nowrap tabular-nums text-(--text-ink-muted)">{{ unit.count }} 次</span>
    </li>
  </ul>
</template>
