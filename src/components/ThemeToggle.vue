<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="rounded-full border border-(--border-shelf) px-2.5 py-1 text-[10px] font-mono tracking-[0.3em] text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all"
    :aria-label="theme === 'library' ? '切換成夜讀主題' : '切換成晝間主題'"
    @click="toggleTheme"
  >
    {{ theme === 'library' ? '晝間' : '夜讀' }}
  </button>
</template>
