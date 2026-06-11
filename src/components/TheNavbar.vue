<template>
  <nav
    class="sticky top-0 z-50 w-full bg-[var(--bg-nav-footer)]/90 backdrop-blur-md transition-all duration-300 border-b border-black/10 shadow-sm"
  >
    <div
      class="max-w-5xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between font-mono text-xs"
    >
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-[var(--text-nav-hover)] animate-pulse"></span>
        <router-link
          to="/"
          class="font-black tracking-widest text-[var(--text-nav-footer)] hover:text-[var(--text-nav-hover)] transition-colors"
        >
          JERRY_YEH // ARCHIVE
        </router-link>
      </div>

      <div class="flex gap-6">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="relative py-1 text-[var(--text-nav-footer)] opacity-80 hover:opacity-100 hover:text-[var(--text-nav-hover)] transition-all font-semibold tracking-widest"
          active-class="!text-[var(--text-nav-hover)] !opacity-100 font-black after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[var(--text-nav-hover)] rounded-sm"
        >
          {{ item.name }}
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'

// 🎯 依據「部落格＋作品集＋隨手筆記」的核心架構，重新編目全站導航節點
const navItems = ref([
  { name: 'ABOUT', path: '/about' },
  { name: 'BLOG', path: '/blog' },
  { name: 'PROJECTS', path: '/projects' },
  { name: 'NOTES', path: '/notes' },
])
</script>
