<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="rounded-full border border-(--border-shelf) px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all"
    :aria-label="theme === 'library' ? '切換成藍白科技主題' : '切換成木質圖書館主題'"
    @click="toggleTheme"
  >
    {{ theme === 'library' ? '📖 Library' : '💻 Cyber' }}
  </button>
</template>
