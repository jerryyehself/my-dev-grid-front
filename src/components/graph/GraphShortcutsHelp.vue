<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

// 圖譜的操作說明面板（D-87）：鍵盤快捷鍵＋滑鼠／觸控手勢。浮在畫布上，不擋整頁（非強制對話框），
// Esc 或「關閉」收起，焦點交回畫布（由父元件處理，見 KnowledgeGraphCanvas 的 closeHelp）。
const props = defineProps<{ open: boolean; isMac: boolean }>()
defineEmits<{ close: [] }>()

const closeBtn = ref<HTMLButtonElement>()
watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    closeBtn.value?.focus()
  },
)

const KEYS: { keys: string[]; text: string }[] = [
  { keys: ['+'], text: '放大' },
  { keys: ['−'], text: '縮小' },
  { keys: ['← ↑ → ↓'], text: '移動畫面（按住 Shift 移得更多）' },
  { keys: ['0'], text: '全部置中' },
  { keys: ['Esc'], text: '取消選取、關閉這份說明' },
  { keys: ['?'], text: '打開／關閉這份說明' },
]
</script>

<template>
  <div
    v-if="open"
    role="dialog"
    aria-modal="false"
    aria-labelledby="kg-help-title"
    class="absolute z-20 right-16 bottom-3 left-3 sm:left-auto sm:w-[360px] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) px-4 py-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--bg-nav-footer)_18%,transparent)] text-(--text-ink-body)"
  >
    <div class="flex items-start justify-between gap-2 mb-2">
      <h3 id="kg-help-title" class="text-[15px] font-bold text-(--text-ink-main) pt-1.5">
        操作說明
      </h3>
      <button
        ref="closeBtn"
        type="button"
        class="-mr-2 -mt-1 w-11 h-11 flex items-center justify-center rounded-lg text-(--text-ink-muted) hover:text-(--text-ink-body) text-lg leading-none cursor-pointer focus-visible:outline-2 focus-visible:outline-(--text-accent)"
        aria-label="關閉操作說明"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>

    <!-- 三段的順序：觸控裝置（pointer: coarse）把「觸控」排到最前面，其他裝置照鍵盤、滑鼠、觸控 -->
    <div class="flex flex-col gap-3">
      <section>
        <h4 class="text-[13px] text-(--text-ink-muted) mb-1">
          鍵盤（先點一下圖，或用 Tab 移到圖上）
        </h4>
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[14px]">
          <template v-for="row in KEYS" :key="row.text">
            <dt class="flex gap-1">
              <kbd
                v-for="k in row.keys"
                :key="k"
                class="min-w-6 whitespace-nowrap text-center font-mono text-[12px] rounded border border-(--border-shelf) bg-(--bg-folder) px-1 py-px"
                >{{ k }}</kbd
              >
            </dt>
            <dd>{{ row.text }}</dd>
          </template>
        </dl>
      </section>

      <section>
        <h4 class="text-[13px] text-(--text-ink-muted) mb-1">滑鼠</h4>
        <ul class="text-[14px] flex flex-col gap-0.5">
          <li>按住 {{ isMac ? '⌘' : 'Ctrl' }} 再滾動滾輪：縮放</li>
          <li>拖曳空白處：移動畫面；拖曳節點：調整位置</li>
          <li>點節點：固定亮起它的關係；點空白處或再點一次：取消</li>
        </ul>
      </section>

      <section class="[@media(pointer:coarse)]:order-first">
        <h4 class="text-[13px] text-(--text-ink-muted) mb-1">觸控</h4>
        <ul class="text-[14px] flex flex-col gap-0.5">
          <li>一指：捲動頁面、點選節點</li>
          <li>兩指：移動畫面、縮放</li>
        </ul>
      </section>
    </div>
  </div>
</template>
