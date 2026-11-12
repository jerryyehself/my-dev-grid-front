<script setup lang="ts">
import { ref } from 'vue'
import ProjectsFilterGroup from './ProjectsFilterGroup.vue'
import type { ProjectsFilterGroupData } from './useProjectsFilter'
import { useScrollFade } from './useScrollFade'

// 左欄內原地展開的篩選面板（不是浮層）。高度上限 360px，超過在面板內部捲，
// 上下緣有淡出提示還有內容。
// 矮視窗時上限還要再縮：左欄整體的高度上限是 --projects-list-max-h（ProjectsListPanel 提供），
// 扣掉表頭 52px 與列表至少要留的 160px（共 212px）之後剩多少，篩選面板就最多多高，
// 這樣篩選展開時結果列表仍然看得到、點得到；視窗夠高時還是 360px，行為不變。
// 變數沒有提供時（單獨渲染）退回 572px，等於 360px 上限。
defineProps<{ groups: ProjectsFilterGroupData[]; hasSelection: boolean }>()
const emit = defineEmits<{ toggleTag: [label: string]; clear: [] }>()

const scroller = ref<HTMLElement>()
const { atTop, atBottom } = useScrollFade(scroller)
</script>

<template>
  <div class="max-h-[min(360px,calc(var(--projects-list-max-h,572px)-212px))] flex-none border-b border-(--border-shelf)">
    <div
      ref="scroller"
      class="projects-filter-scroll max-h-[inherit] overflow-y-auto px-4 pt-1 pb-4"
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
