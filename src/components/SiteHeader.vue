<template>
  <header class="site-header-container mb-8 transition-all duration-300 text-left">
    <div v-if="type === 'profile'" class="header-profile py-4">
      <h1 class="text-5xl md:text-6xl font-black tracking-tighter text-(--text-ink-main) mb-3">
        <slot name="title"></slot>
      </h1>
      <p class="text-lg text-(--text-ink-muted) font-light leading-relaxed max-w-3xl">
        <slot name="description"></slot>
      </p>
    </div>

    <div
      v-else-if="type === 'essay'"
      class="header-essay pt-2 pb-5 border-b border-(--border-shelf)"
    >
      <div
        class="flex items-center gap-2 font-mono text-[10px] tracking-widest text-(--text-ink-muted) uppercase font-semibold mb-2"
      >
        <span class="text-(--text-accent) font-bold">//</span>
        <slot name="tag"></slot>
        <span class="text-[9px] opacity-40 ml-auto font-normal">CATALOG_NODE</span>
      </div>
      <h1 class="text-3xl md:text-4xl font-black tracking-tight text-(--text-ink-main) mb-2">
        <slot name="title"></slot>
      </h1>
      <div class="text-sm text-(--text-ink-body) leading-relaxed max-w-3xl font-medium">
        <slot name="description"></slot>
      </div>
    </div>

    <div
      v-else-if="type === 'snippet'"
      class="header-snippet bg-white border border-(--border-shelf) p-6 rounded-xl border-l-4 border-l-(--text-accent) shadow-sm font-mono mb-2"
    >
      <div
        class="flex justify-between items-center mb-4 text-[10px] text-(--text-ink-muted) font-bold opacity-70"
      >
        <span>[ LOG_SYSTEM ]</span>
        <span>STATUS: ACTIVE</span>
      </div>
      <h1 class="text-xl md:text-2xl font-bold text-(--text-ink-main) mb-2 flex items-center gap-2">
        <span class="text-(--text-accent) font-black">></span>
        <slot name="title"></slot>
      </h1>
      <p class="text-xs text-(--text-ink-body) opacity-90 leading-relaxed max-w-3xl">
        <slot name="description"></slot>
      </p>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 💡 限制型別只能是這三種受控頁面標籤之一，防範未知的 meta 屬性
type HeaderType = 'profile' | 'essay' | 'snippet'

const type = computed<HeaderType>(() => {
  return (route.meta.type as HeaderType) || 'essay'
})
</script>
