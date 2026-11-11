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
      <!-- 說明與「清除篩選」放在最後：清除鈕如果在面板上方、選了才出現，會把整個面板往下推，
           滑鼠底下的標籤跟著換掉 -->
      <div class="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p class="m-0 text-left text-[13px] leading-5 tracking-[0.06em] text-(--text-ink-muted)">
          小圓框裡是專案數。選一個技術會包含它的所有版本，例如選 Vue 也會找到用 Vue 3 的專案。
        </p>
        <button
          v-if="hasSelection"
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
