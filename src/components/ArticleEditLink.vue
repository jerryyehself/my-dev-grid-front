<script setup lang="ts">
// 「編輯這篇文章」的連結，只給登入的人看（規則見 AuthOnly.vue）。文章清單、首頁知識網路的
// 彈窗、/graph 的詳情卡三個地方共用，連去哪、誰看得到只寫在這裡一次；長相由呼叫端用 class 決定，
// 因為三個地方的字級與排版本來就不一樣。
//
// inheritAttrs: false：根節點是 AuthOnly（只渲染 slot，沒有自己的 DOM），呼叫端給的 class
// 不會自動落到連結上，要手動綁到 RouterLink。
import { RouterLink } from 'vue-router'
import AuthOnly from '@/components/AuthOnly.vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    articleId: number
    /** 連結文字。螢幕閱讀器另外用 aria-label 講清楚編輯的是哪一篇。 */
    label?: string
    /** 文章標題，給 aria-label 用；同一頁有很多個「編輯」時才分得出來。 */
    title?: string
  }>(),
  { label: '編輯', title: '' },
)
</script>

<template>
  <AuthOnly>
    <RouterLink
      v-bind="$attrs"
      :to="{ name: 'article-editor', params: { id: articleId } }"
      :aria-label="title ? `編輯 ${title}` : undefined"
    >
      {{ label }}
    </RouterLink>
  </AuthOnly>
</template>
