<script setup lang="ts">
// 一格數字。本體論詳情頁頂端那一排「子類 5 / 兄弟 0 / 實體 20」用的。
//
// **為什麼是新元件而不是 BaseCard 的第三個 variant**：BaseCard 已經有 card 與 panel
// 兩個 variant，而這一格要的東西跟那兩個都不一樣——它沒有框（整排靠 1px gap 分隔）、
// 數字要等寬對齊、而且「這一格是 0」必須在餘光裡就看得出來。塞進 BaseCard 會需要
// 再加至少兩個 prop，而規格第 02 節自己寫過的判準是「如果用起來要加第三個 prop
// 才塞得進去，那是抽象不對」。
//
// `zero` 這個 prop 是這一格的重點：計數 0 **要顯示，不能藏**。頂層 scope 的實體
// 筆數就是 0（實體掛在子類上），藏起來讀的人會以為還沒載入完；但一整排數字裡
// 如果 0 跟 20 一樣醒目，眼睛會抓不到哪一格才是重點。所以 0 降對比、不消失。
withDefaults(
  defineProps<{
    label: string
    value: number
    /** 這格是這個 scope／relation 的重點數字，用強調色。 */
    emphasis?: boolean
  }>(),
  { emphasis: false },
)
</script>

<template>
  <div class="bg-(--bg-paper-light) px-3.5 py-2.5">
    <span
      class="block font-mono text-2xl font-bold leading-tight tabular-nums"
      :class="[
        value === 0
          ? 'text-(--text-ink-muted)/45'
          : emphasis
            ? 'text-(--text-accent)'
            : 'text-(--text-ink-main)',
      ]"
      >{{ value }}</span
    >
    <span class="mt-0.5 block text-[11px] tracking-wide text-(--text-ink-muted)">{{ label }}</span>
  </div>
</template>
