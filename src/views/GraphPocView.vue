<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import GraphPoc2D from '@/components/poc/GraphPoc2D.vue'
import GraphPoc3D from '@/components/poc/GraphPoc3D.vue'

const route = useRoute()
const mode = ref<'2d' | '3d'>(route.query.mode === '3d' ? '3d' : '2d')
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <button
        class="rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider"
        :class="mode === '2d' ? 'bg-stone-900 text-white' : 'border-stone-300 text-stone-600'"
        @click="mode = '2d'"
      >
        2D · force-graph
      </button>
      <button
        class="rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider"
        :class="mode === '3d' ? 'bg-stone-900 text-white' : 'border-stone-300 text-stone-600'"
        @click="mode = '3d'"
      >
        3D · 3d-force-graph
      </button>
    </div>

    <GraphPoc2D v-if="mode === '2d'" />
    <GraphPoc3D v-else />

    <p class="text-xs text-stone-500">
      橘色 = 高權重核心節點；橘色虛線／粒子流 = 靈感對撞機連結。拖曳節點測試互動,灰色小點是背景筆記。
    </p>

    <!-- 未完成品標註：跟首頁 KnowledgeGraphPanel.vue 底部同一種 border-dashed 說明框，
         誠實講清楚這頁哪裡是真資料、哪裡只是技術驗證階段留下的近似值 -->
    <p class="text-[12px] leading-relaxed text-(--text-ink-muted) border border-dashed border-(--border-shelf) rounded-xl px-4 py-3">
      <b class="text-(--text-ink-body)">這頁不是完成品：</b>2D／3D 兩版都吃真實
      <code>/api/graph</code> 資料，但欄位形狀是當初「靈感筆記本」情境設計的，套到現在
      documentation/technique/implementation 的本體論上有落差——<code>weight</code>
      用節點 degree 正規化代替、<code>tags</code> 用 entity type 頂替，這兩個還算合理的代理指標；
      <code>daysSinceAccessed</code> 後端完全沒有這個欄位，一律回傳 0，3D
      版靠這個做 Z 軸縱深分層，在真實資料下全部貼齊前景、分層失去意義；橘色虛線／粒子流標的「靈感對撞機連結」其實只是「這條邊來自哪張關聯表」的視覺區分，不是真的語意上的靈感連結。
      配色也還是寫死的
      <code>stone-*</code>，沒有跟著全站深色模式切換。首頁的
      <RouterLink to="/" class="text-(--text-accent) hover:underline">知識網路</RouterLink>
      小工具是重新對齊本體論、可以上線的正式版，這頁保留下來純粹是技術驗證階段的歷史產物。
    </p>
  </div>
</template>
