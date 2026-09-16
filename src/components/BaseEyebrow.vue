<script setup lang="ts">
// 全站的章節/欄位小標:等寬字、大寫、寬字距的那一行「// SOMETHING」。
// 抽出來之前這串 class 在 About 與文章編輯頁之間重複了 18 次,每一份都是
// 一次寫錯就默默失效的機會（今天已經發生過兩次:編不出來的刪除線、透明的 tooltip）。
//
// `//` 前綴由元件自己加,呼叫端只給文字——之前有的地方寫在文字裡、有的地方
// 分成兩個 span,間距因此不一致。
withDefaults(
  defineProps<{
    /** section 用在頁面章節（11px）,field 用在表單欄位與側欄卡片（10px）。 */
    size?: 'section' | 'field'
  }>(),
  { size: 'section' },
)
</script>

<template>
  <div
    :class="[
      'font-mono uppercase text-(--text-accent) font-bold',
      size === 'section' ? 'text-[11px] tracking-[0.2em]' : 'text-[10px] tracking-[0.24em]',
    ]"
  >
    // <slot />
  </div>
</template>
