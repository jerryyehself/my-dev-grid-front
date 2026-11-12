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
  { value: 'type', label: '依類別' },
  { value: 'overlay', label: '依建立時間' },
] as const
const TYPES = ['documentation', 'technique', 'implementation'] as const
const NODE_VAR: Record<GraphNodeType, string> = {
  documentation: '--node-doc',
  technique: '--node-tech',
  implementation: '--node-impl',
}
// 選中時的實心底：--cat-fill-* 是專門給白字用的分類色（兩個主題同值、白字 ≥ 4.5:1，見
// variables.css）。原本用 --node-* 底配 --bg-paper-light 字，深色主題變成深字配青綠底，對比不足。
const FILL_VAR: Record<GraphNodeType, string> = {
  documentation: '--cat-fill-doc',
  technique: '--cat-fill-tech',
  implementation: '--cat-fill-impl',
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
        <!-- 全站統一的「幾選一」切換（D-66）。下面的「突顯類別」不換：它可以多選，顏色是分類色，有語意 -->
        <BaseSegmented v-model="colorMode" :options="COLOR_MODES" label="節點顏色" />
      </div>

      <div class="flex flex-col gap-1.5">
        <!-- 突顯類別（原「顯示層」，2026-10-02 使用者改名）：選了的類別維持清楚、其他變淡，可多選。
             沒選任何一個＝全部一樣清楚，所以沒選的鈕用一般樣式（透明底、正文字色、類別色點），
             不是原本那種淡色底淡字——看起來像「全部關掉」，深色主題對比也不夠（讀者審查）。
             選中＝該類別的實心色底白字。 -->
        <span class="text-[13px] tracking-[0.05em] text-(--text-ink-muted)">突顯類別</span>
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="突顯類別">
          <button
            v-for="type in TYPES"
            :key="type"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border px-3 min-h-8 text-[13px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
            :class="
              props.typeFilter[type]
                ? 'text-white border-transparent'
                : 'bg-transparent text-(--text-ink-main) border-[color-mix(in_srgb,var(--text-ink-main)_35%,transparent)] hover:border-[color-mix(in_srgb,var(--text-ink-main)_65%,transparent)]'
            "
            :style="props.typeFilter[type] ? { background: `var(${FILL_VAR[type]})` } : {}"
            :aria-pressed="props.typeFilter[type]"
            @click="emit('toggleType', type)"
          >
            <span
              aria-hidden="true"
              class="w-2 h-2 rounded-full"
              :style="{ background: props.typeFilter[type] ? '#fff' : `var(${NODE_VAR[type]})` }"
            ></span>
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
