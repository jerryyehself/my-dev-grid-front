<script setup lang="ts">
// 開／關切換（role="switch"）。跟 BaseSegmented 的差別：那個是「幾選一」，這個是單一項目
// 顯示或不顯示。第一個用途是首頁知識網路的「間接關聯」虛線：預設關掉，免得畫面太雜
// （2026-09-30 使用者決定）。
// 開的顏色沿用 BaseSegmented 選中的 --bg-selected／--text-on-selected（淺色藏青、深色黃銅），
// 全站「目前是開／選中」只有這一種長相。
defineProps<{
  /** 開關旁邊的文字，也是螢幕報讀器唸的名稱 */
  label: string
}>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    class="group inline-flex items-center gap-2 min-h-8 cursor-pointer text-[13px] text-(--text-ink-muted) hover:text-(--text-ink-main) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent) rounded-[6px]"
    @click="model = !model"
  >
    <span
      aria-hidden="true"
      :class="[
        'relative inline-block w-8 h-[18px] rounded-full border transition-colors',
        model
          ? 'bg-(--bg-selected) border-(--bg-selected)'
          : 'bg-transparent border-[color-mix(in_srgb,var(--text-ink-main)_35%,transparent)] group-hover:border-[color-mix(in_srgb,var(--text-ink-main)_65%,transparent)]',
      ]"
    >
      <span
        :class="[
          'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-[left,background-color]',
          model ? 'left-[16px] bg-(--text-on-selected)' : 'left-[2px] bg-[color-mix(in_srgb,var(--text-ink-main)_45%,transparent)]',
        ]"
      ></span>
    </span>
    <slot>{{ label }}</slot>
  </button>
</template>
