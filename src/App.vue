<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

// 將導覽列選單定義成結構化的陣列，未來要增刪項目改這裡就好！
const navItems = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Projects', path: '/projects' },
  { name: 'Triple', path: '/triple' },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
    <header
      class="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-xs"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
          <span class="font-bold text-base tracking-tight text-slate-900 font-mono"
            >Jerry.DevLog</span
          >
        </div>

        <nav class="flex space-x-3 md:space-x-6 text-xs md:text-sm font-medium">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            active-class="active-nav"
          >
            {{ item.name }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
      <RouterView />
    </main>

    <footer
      class="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-mono"
    >
      © 2026 Jerry Yeh. Built with Vue 3 & Tailwind v4
    </footer>
  </div>
</template>

<style scoped>
@utility nav-item {
  display: inline-flex;
  align-items: center;
  /* 優化處 ──> 左右內襯稍微加大 (px-3.5)，讓點擊範圍更寬敞舒服 */
  padding-left: 0.875rem;
  padding-right: 0.875rem;
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
  border-radius: 0.5rem;
  color: var(--color-slate-600);
  transition-property: all;
  transition-duration: 200ms;

  &:hover {
    color: var(--color-indigo-600);
    background-color: var(--color-slate-100);
  }
}

@utility active-nav {
  color: var(--color-indigo-600);
  background-color: rgba(238, 242, 255, 0.7);
  font-weight: 600;
}
</style>
