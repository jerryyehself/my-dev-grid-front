<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
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
        2D · d3-force
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
  </div>
</template>
