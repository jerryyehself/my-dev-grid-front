<template>
  <router-link
    to="/articles"
    class="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.24em] text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900"
  >
    <span>←</span>
    <span>Articles</span>
  </router-link>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
