<script setup lang="ts">
// 知識圖譜圖例裡「三個型別各一個色點」的那一段。
//
// 只做三個色點、不含外層容器,是因為兩個呼叫端的圖例其實不一樣長:
// GraphPocView 後面接的是邊樣式（跨型別真實關聯…）,KnowledgeGraphPanel 後面接的是
// 推導關聯與一句操作說明。相同的只有這三顆點,把整列一起抽出來反而要開一堆 slot。
// 所以這裡輸出三個並列的 <span>,外層的 flex 容器留在各自的呼叫端。
//
// 顏色讀 FAMILY_COLOR,跟 /graph 的節點、路徑圖、文章編輯頁的關聯挑選器同一份對照表。
// 圖例跟它要解釋的東西不同步,是圖例最糟的失效方式。
import { FAMILY_COLOR } from '@/api/ontology'
import type { GraphNodeType } from '@/api/graph'

// 多根節點元件不會自動繼承 class/style,關掉自動繼承免得 Vue 警告
defineOptions({ inheritAttrs: false })

const ITEMS: { type: GraphNodeType; label: string }[] = [
  { type: 'documentation', label: 'Documentation' },
  { type: 'technique', label: 'Technique' },
  { type: 'implementation', label: 'Implementation' },
]
</script>

<template>
  <span v-for="item in ITEMS" :key="item.type" class="flex items-center gap-1.5">
    <span class="w-2 h-2 rounded-full" :style="{ background: FAMILY_COLOR[item.type] }"></span>
    {{ item.label }}
  </span>
</template>
