<script setup lang="ts">
// 紙面上的一塊框。card 是原本就有的那種——會 hover 提亮、當作可點進去的東西
// （專案卡、文章卡）;panel 是靜態容器,側欄那種「這裡放一組設定」的框,
// 不該有 hover,因為它不可點,提亮等於承諾了一個不存在的動作。
//
// 依 visual-design-language skill 的規矩:新的需求先看能不能變成既有元件的
// variant,而不是再開一個名字不同、長得幾乎一樣的元件。
withDefaults(defineProps<{ variant?: 'card' | 'panel' }>(), { variant: 'card' })
</script>

<template>
  <div
    :class="[
      'flex flex-col bg-(--bg-paper-light) border border-(--border-shelf)',
      variant === 'card' && 'p-6 rounded-xl shadow-xs hover:border-(--text-accent)/30 transition-all group',
      variant === 'panel' && 'p-4 rounded-[6px]',
    ]"
  >
    <slot />
  </div>
</template>
