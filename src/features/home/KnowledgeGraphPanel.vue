<script setup lang="ts">
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import LoadFailedNotice from '@/components/LoadFailedNotice.vue'
import KnowledgeGraphCanvas from '@/features/graph/KnowledgeGraphCanvas.vue'
import type { GraphDto, GraphPathDto } from '@/api/graph'
import { LOADING_GRAPH_TEXT } from '@/copy/common'

// 首頁的知識網路圖：資料由首頁（HomeView）取好傳進來，路線卡跟這張圖用同一份。畫布本身是共用元件
// KnowledgeGraphCanvas.vue（跟 /graph 頁共用；圖例、顯示設定、縮放控制、「?」說明都在畫布
// 元件裡，首頁用 home-mode：圖例帶數量與「目前路線」、「?」打開閱讀方式）。
// C 版（路線當主角）把這裡的標題、統計句、「怎麼看這張圖」都拿掉了：統計併進圖例，讀法收進「?」面板。
// 三層疊圖排版的沿革見 features/graph/layeredLayout.ts。
defineProps<{
  dto: GraphDto | null
  loading: boolean
  loadError: string | null
  /** 路線卡目前這一條；圖上亮起它（沒有路線就是 null） */
  route: GraphPathDto | null
}>()

// 首頁維持三層疊圖。「?」面板裡的圓框說明跟著這個值：哪天改成 'free'，那句說明也會一起消失。
const GRAPH_LAYOUT: 'layered' | 'free' = 'layered'
</script>

<template>
  <section class="w-full">
    <LoadFailedNotice v-if="!loading && loadError" :message="loadError" class="mb-2" />

    <BaseLoadingBlock v-if="loading" height="460px">{{ LOADING_GRAPH_TEXT }}</BaseLoadingBlock>

    <!-- 節點顏色、顯示層、間接關聯收進畫布左上角的「顯示設定」 -->
    <KnowledgeGraphCanvas
      v-if="!loading && dto"
      :data="dto"
      :layout="GRAPH_LAYOUT"
      :highlight-path="route"
      home-mode
      label="知識網路圖"
    />
  </section>
</template>
