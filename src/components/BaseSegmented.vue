<script setup lang="ts" generic="T extends string">
// 「幾選一」切換鈕（D-66，2026-09-30 使用者定案）。文章列表的時間軸／分類夾、圖譜的節點顏色、
// About 的從兩頭看，原本是三種長相（膠囊淡底酒紅字、膠囊酒紅實心、方角藏青實心），統一成這一個。
// 選中＝--bg-selected 實心＋--text-on-selected：淺色主題藏青、深色主題黃銅——深色主題的頁面底色
// 本身就是藏青，藏青實心會融進背景。沒選中＝透明底＋淡框線。
// 設計稿：canvas 8nZmo6sneYNdSEgfGHXst8 的 ActiveStates.dc.html。
// 不管的：導覽列（藏青底上的黃銅字＋底線）、圖譜「顯示層」（分類色有語意、可多選）。
// 文章編輯頁、文章管理頁的切換原本照「文章編輯頁」設計稿做成膠囊淡底，2026-09-30 使用者決定一起統一。
withDefaults(
  defineProps<{
    options: readonly { value: T; label: string }[]
    /** 按鈕組的用途，給螢幕報讀器唸，例如「文章排列方式」 */
    label: string
    /** sm：工具列；md：內文裡的主要切換（44px 高，符合觸控目標） */
    size?: 'sm' | 'md'
    /** 撐滿容器寬度、每顆等寬（窄側欄裡用，例如編輯頁的草稿／已發布） */
    stretch?: boolean
  }>(),
  { size: 'sm', stretch: false },
)

const model = defineModel<T>({ required: true })
</script>

<template>
  <div :class="['flex gap-1.5', stretch ? 'w-full' : 'flex-wrap']" role="group" :aria-label="label">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :aria-pressed="model === opt.value"
      :class="[
        `font-['Courier_Prime',ui-monospace,monospace] font-bold rounded-[6px] border cursor-pointer transition-colors`,
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)',
        size === 'md' ? 'min-h-11 px-[18px] text-[15px]' : 'min-h-8 px-3 text-[13px]',
        stretch && 'flex-1',
        model === opt.value
          ? 'bg-(--bg-selected) border-(--bg-selected) text-(--text-on-selected)'
          : 'bg-transparent text-(--text-ink-main) border-[color-mix(in_srgb,var(--text-ink-main)_35%,transparent)] hover:border-[color-mix(in_srgb,var(--text-ink-main)_65%,transparent)]',
      ]"
      @click="model = opt.value"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
