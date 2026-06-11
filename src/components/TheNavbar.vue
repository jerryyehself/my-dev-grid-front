<template>
  <nav class="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/70 backdrop-blur-md">
    <div
      class="max-w-5xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between font-mono text-xs"
    >
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
        <router-link
          to="/"
          class="font-bold tracking-tight text-slate-900 hover:text-indigo-600 transition-colors"
        >
          JERRY_YEH // ARCHITECT
        </router-link>
      </div>

      <div class="flex gap-6">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="relative py-1 text-slate-500 hover:text-indigo-650 transition-colors font-medium tracking-wide"
          active-class="text-indigo-600 font-bold after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-indigo-600 rounded-sm"
        >
          {{ item.name }}
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'

// 統一管理全站的導航節點
const navItems = ref([
  { name: 'ABOUT', path: '/about' },
  { name: 'PROJECTS', path: '/projects' },
  { name: 'DASHBOARD', path: '/dashboard' },
])
</script>
