<script setup lang="ts">
import { ref } from 'vue'
import ProjectsFilterGroup from './ProjectsFilterGroup.vue'
import type { ProjectsFilterGroup as FilterGroupData } from './useProjectsFilter'
import { useScrollFade } from './useScrollFade'

// 左欄內原地展開的篩選面板（不是浮層）。高度上限 360px，超過在面板內部捲，
// 上下緣有淡出提示還有內容。
defineProps<{ groups: FilterGroupData[]; hasSelection: boolean }>()
const emit = defineEmits<{ toggleTag: [label: string]; clear: [] }>()

const scroller = ref<HTMLElement>()
const { atTop, atBottom } = useScrollFade(scroller)
</script>

<template>
  <div class="max-h-[360px] flex-none border-b border-(--border-shelf)">
    <div
      ref="scroller"
      class="projects-filter-scroll max-h-[360px] overflow-y-auto px-4 pt-1 pb-4"
      :class="{ 'is-fade-top': !atTop, 'is-fade-bottom': !atBottom }"
    >
      <div class="flex flex-col gap-6">
        <ProjectsFilterGroup v-for="group in groups" :key="group.label" :group="group" @toggle="emit('toggleTag', $event)" />
      </div>
      <!-- 「清除篩選」放在最後：清除鈕如果在面板上方、選了才出現，會把整個面板往下推，
           滑鼠底下的標籤跟著換掉。不放說明句：圓框數字與版本包含規則靠畫面本身表達 -->
      <div v-if="hasSelection" class="mt-6 flex justify-end">
        <button
          type="button"
          class="cursor-pointer border-b border-(--text-accent) pb-0.5 text-[13px] leading-5 font-semibold tracking-[0.06em] text-(--text-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
          @click="emit('clear')"
        >
          清除篩選 ×
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projects-filter-scroll {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--text-ink-muted) 45%, transparent) transparent;
}
.projects-filter-scroll.is-fade-top {
  -webkit-mask-image: linear-gradient(transparent, #000 24px);
  mask-image: linear-gradient(transparent, #000 24px);
}
.projects-filter-scroll.is-fade-bottom {
  -webkit-mask-image: linear-gradient(#000 calc(100% - 24px), transparent);
  mask-image: linear-gradient(#000 calc(100% - 24px), transparent);
}
.projects-filter-scroll.is-fade-top.is-fade-bottom {
  -webkit-mask-image: linear-gradient(transparent, #000 24px, #000 calc(100% - 24px), transparent);
  mask-image: linear-gradient(transparent, #000 24px, #000 calc(100% - 24px), transparent);
}
</style>
