<script setup lang="ts">
// 灰色的小字提示。抽出來的只有「不變的那三件事」——等寬字、10px、muted 色——
// 間距、對齊、tracking 這些會因場合而異的留在呼叫端（Vue 會把 class 合併到根節點）。
//
// 刻意不做成吃一堆 prop 的萬用元件：原本散寫的 14 處裡 opacity 有 60 / 70 / 75 三種、
// tracking 有寫跟沒寫，那種不一致本身就是散寫造成的，不是真的有三種語意。
// 收斂成兩級:預設 75，dim 60（用在附註的附註，例如「反向：…」那一行）。
withDefaults(defineProps<{ dim?: boolean }>(), { dim: false })
</script>

<template>
  <span :class="['font-mono text-[10px] text-(--text-ink-muted)', dim ? 'opacity-60' : 'opacity-75']">
    <slot />
  </span>
</template>
