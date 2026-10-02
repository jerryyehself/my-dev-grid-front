<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'

// 圖譜的操作說明面板（D-87）：鍵盤快捷鍵＋滑鼠／觸控手勢。浮在畫布上，不擋整頁（非強制對話框），
// Esc 或「關閉」收起，焦點交回畫布（由父元件處理，見 KnowledgeGraphCanvas 的 closeHelp）。
const props = defineProps<{ open: boolean; isMac: boolean }>()
defineEmits<{ close: [] }>()

const closeBtn = ref<HTMLButtonElement>()
const body = ref<HTMLElement>()

// 內容區捲得動、而且還沒捲到底時，底部浮一段漸層，提示下面還有內容（D-87 第三輪：手機上
// 內容剛好切在一列中間，看不出還能往下捲）。
const moreBelow = ref(false)
function updateMoreBelow() {
  const el = body.value
  moreBelow.value = !!el && el.scrollTop + el.clientHeight < el.scrollHeight - 2
}
let resizeObserver: ResizeObserver | undefined
watch(
  () => props.open,
  async (open) => {
    resizeObserver?.disconnect()
    if (!open) return
    await nextTick()
    closeBtn.value?.focus()
    updateMoreBelow()
    if (body.value) {
      resizeObserver = new ResizeObserver(updateMoreBelow)
      resizeObserver.observe(body.value)
    }
  },
)
onUnmounted(() => resizeObserver?.disconnect())

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
  <!-- 版面（D-87 第二輪：桌機深色截圖裡最後一行被切掉）：
       - 窄畫布（< 640px）：左右貼齊畫布、坐在底邊橫排按鈕的上方，高度跟著內容（只剩觸控一段時
         不會撐成一大片空白），最高到畫布頂端，放不下時內容區自己捲動。
       - 寬畫布：放在控制按鈕左邊，鍵盤一欄、滑鼠＋觸控一欄，460px 高的畫布裡不用捲就看得完；
         高度上限是畫布高度扣掉上下邊距，真的放不下時內容區捲動。 -->
  <div
    v-if="open"
    role="dialog"
    aria-modal="false"
    aria-labelledby="kg-help-title"
    class="absolute z-30 inset-x-3 bottom-[4.25rem] max-h-[calc(100%-5rem)] @min-[640px]:inset-x-auto @min-[640px]:right-16 @min-[640px]:bottom-3 @min-[640px]:w-[540px] @min-[640px]:max-h-[calc(100%-1.5rem)] flex flex-col rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) shadow-[0_12px_32px_color-mix(in_srgb,var(--bg-nav-footer)_18%,transparent)] text-(--text-ink-body)"
  >
    <div class="shrink-0 flex items-center justify-between gap-2 pl-4 pr-1.5 pt-1.5">
      <h3 id="kg-help-title" class="text-[15px] font-bold text-(--text-ink-main)">操作說明</h3>
      <button
        ref="closeBtn"
        type="button"
        class="w-11 h-11 flex items-center justify-center rounded-lg text-(--text-ink-muted) hover:text-(--text-ink-body) text-lg leading-none cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--text-accent)"
        aria-label="關閉操作說明"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>

    <!-- 內容區：放不下時自己捲動（tabindex 讓鍵盤使用者也捲得到）。只有觸控、沒有滑鼠的裝置
         （hover: none 且 pointer: coarse）只顯示「觸控」一段——鍵盤、滑鼠的說明對它沒用；
         有滑鼠或觸控板的裝置照常三段都顯示 -->
    <div class="relative min-h-0 flex flex-col">
      <div
        ref="body"
        tabindex="0"
        @scroll.passive="updateMoreBelow"
        class="min-h-0 overflow-y-auto px-4 pb-3.5 pt-1 grid gap-3 @min-[640px]:grid-cols-2 @min-[640px]:gap-x-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--text-accent) rounded-b-xl"
      >
        <section class="@min-[640px]:row-span-2 [@media(hover:none)_and_(pointer:coarse)]:hidden">
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

        <section class="[@media(hover:none)_and_(pointer:coarse)]:hidden">
          <h4 class="text-[13px] text-(--text-ink-muted) mb-1">滑鼠</h4>
          <ul class="text-[14px] flex flex-col gap-0.5">
            <li>按住 {{ isMac ? '⌘' : 'Ctrl' }} 再滾動滾輪：縮放</li>
            <li>拖曳空白處：移動畫面</li>
            <li>拖曳節點：調整位置</li>
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
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-xl bg-linear-to-t from-(--bg-paper-light) to-transparent transition-opacity duration-150"
        :class="moreBelow ? 'opacity-100' : 'opacity-0'"
      ></div>
    </div>
  </div>
</template>
