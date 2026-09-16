<script setup lang="ts">
// 一個表單欄位的外殼:小標在左、提示在右、控制項在下。
// 抽出來是因為「小標與提示要對齊基線、間距要一致」這件事之前靠每個呼叫端
// 自己記得寫 items-baseline justify-between,少寫一次就歪掉而且不容易看出來。
import BaseEyebrow from './BaseEyebrow.vue'
import BaseHint from './BaseHint.vue'

withDefaults(
  defineProps<{
    label: string
    /** 右側的灰字說明,例如「清單頁顯示這一段 · 84 字」。 */
    hint?: string
    size?: 'default' | 'field'
  }>(),
  { hint: undefined, size: 'default' },
)
</script>

<template>
  <div class="flex flex-col gap-2 min-w-0">
    <div class="flex items-baseline justify-between gap-3">
      <BaseEyebrow :size="size">{{ label }}</BaseEyebrow>
      <BaseHint v-if="hint" class="shrink-0">{{ hint }}</BaseHint>
    </div>
    <slot />
  </div>
</template>
