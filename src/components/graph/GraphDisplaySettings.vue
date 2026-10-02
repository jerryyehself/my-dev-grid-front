<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'
import BaseSegmented from '@/components/BaseSegmented.vue'
import BaseSwitch from '@/components/BaseSwitch.vue'
import type { GraphNodeType } from '@/api/graph'
import { TYPE_LABEL } from './graphTypes'

// 圖譜的「顯示設定」（D-87）：首頁原本在畫布上方疊了四列（節點顏色、顯示層＋間接關聯開關、
// 開關說明、圖例），收進畫布左上角的一顆按鈕，點開才出現，圖例另外留一列在畫布上方。
// 不是對話框：面板浮在畫布上、不擋頁面其他地方，改了設定馬上在後面的圖上看得到。
// Esc 收起並把焦點還給按鈕。
const open = defineModel<boolean>('open', { required: true })
const colorMode = defineModel<'type' | 'overlay'>('colorMode', { required: true })
const showIndirect = defineModel<boolean>('showIndirect', { required: true })
const props = defineProps<{
  typeFilter: Record<GraphNodeType, boolean>
  indirectCount: number
}>()
const emit = defineEmits<{ toggleType: [type: GraphNodeType] }>()

const COLOR_MODES = [
  { value: 'type', label: '依類型' },
  { value: 'overlay', label: '依建立時間' },
] as const
const TYPES = ['documentation', 'technique', 'implementation'] as const
const NODE_VAR: Record<GraphNodeType, string> = {
  documentation: '--node-doc',
  technique: '--node-tech',
  implementation: '--node-impl',
}

const panelId = useId()
const noteId = useId()
const toggleBtn = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()

watch(open, async (v) => {
  if (!v) return
  await nextTick()
  panel.value?.querySelector<HTMLElement>('button')?.focus()
})

function close() {
  open.value = false
  toggleBtn.value?.focus()
}
defineExpose({ close })

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
}
</script>

<template>
  <div class="absolute z-30 left-3 top-3 max-w-[calc(100%-1.5rem)]" @keydown="onKeydown">
    <button
      ref="toggleBtn"
      type="button"
      class="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg border border-(--border-shelf) bg-(--bg-paper-light) text-[13px] text-(--text-ink-main) cursor-pointer shadow-[0_4px_14px_color-mix(in_srgb,var(--bg-nav-footer)_12%,transparent)] hover:bg-(--bg-folder) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="open = !open"
    >
      <!-- 滑桿圖示：常見的「調整顯示」符號 -->
      <svg aria-hidden="true" viewBox="0 0 20 20" class="w-4 h-4" fill="none">
        <path
          d="M3 6h9M15 6h2M3 14h3M9 14h8"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
        <circle cx="13.5" cy="6" r="1.8" stroke="currentColor" stroke-width="1.6" />
        <circle cx="7.5" cy="14" r="1.8" stroke="currentColor" stroke-width="1.6" />
      </svg>
      顯示設定
    </button>

    <div
      v-show="open"
      :id="panelId"
      ref="panel"
      role="group"
      aria-label="顯示設定"
      class="mt-2 w-[min(340px,calc(100vw-4rem))] rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) px-4 py-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--bg-nav-footer)_18%,transparent)] flex flex-col gap-3"
    >
      <div class="flex flex-col gap-1.5">
        <span class="text-[13px] tracking-[0.05em] text-(--text-ink-muted)">節點顏色</span>
        <!-- 全站統一的「幾選一」切換（D-66）。下面的「顯示層」不換：它可以多選，顏色是分類色，有語意 -->
        <BaseSegmented v-model="colorMode" :options="COLOR_MODES" label="節點顏色" />
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-[13px] tracking-[0.05em] text-(--text-ink-muted)">顯示層</span>
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="顯示層">
          <button
            v-for="type in TYPES"
            :key="type"
            type="button"
            class="rounded-full border px-3 min-h-8 text-[13px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
            :class="
              props.typeFilter[type]
                ? 'text-(--bg-paper-light) border-transparent'
                : 'bg-(--bg-folder) text-(--text-ink-muted) border-(--border-shelf)'
            "
            :style="props.typeFilter[type] ? { background: `var(${NODE_VAR[type]})` } : {}"
            :aria-pressed="props.typeFilter[type]"
            @click="emit('toggleType', type)"
          >
            {{ TYPE_LABEL[type] }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <BaseSwitch v-model="showIndirect" label="間接關聯" :aria-describedby="noteId" />
        <!-- 開關的說明：關著的時候說開了會多什麼，開著的時候當虛線的圖例（2026-09-30 模擬讀者審查） -->
        <p :id="noteId" class="text-[13px] leading-relaxed text-(--text-ink-muted)">
          <template v-if="showIndirect">
            共
            {{ indirectCount }}
            條：兩個同類節點連到相同的節點，就用虛線連起來，共同的越多線越明顯。這是推算出來的，不是直接關係。
          </template>
          <template v-else
            >打開後，用虛線標出連到相同節點的同類節點（推算出來的，不是直接關係）。</template
          >
        </p>
      </div>
    </div>
  </div>
</template>
