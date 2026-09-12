<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 rounded-full border border-(--border-shelf) px-2.5 py-1 text-[10px] font-mono tracking-[0.15em] text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all"
    :aria-pressed="theme === 'terminal'"
    @click="toggleTheme"
  >
    <span aria-hidden="true">{{ theme === 'library' ? '☀' : '☽' }}</span>
    {{ theme === 'library' ? '淺色' : '深色' }}
  </button>
</template>
