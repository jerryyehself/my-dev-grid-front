<template>
  <router-link
    to="/articles"
    class="inline-flex items-center gap-2 rounded-full border border-(--border-shelf) bg-(--bg-folder) px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.24em] text-(--text-ink-body) transition-colors hover:border-(--text-accent)/40 hover:text-(--text-ink-main)"
  >
    <span>←</span>
    <span>Articles</span>
  </router-link>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
