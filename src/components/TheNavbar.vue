<template>
  <nav
    class="sticky top-0 z-50 w-full bg-(--bg-nav-footer) border-b border-black/30 shadow-md transition-colors duration-300"
  >
    <div
      class="max-w-5xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between font-mono text-xs"
    >
      <div class="flex items-center gap-2">
        <span class="beacon-dot w-2 h-2 rounded-full bg-(--text-nav-hover) text-(--text-nav-hover)"></span>
        <router-link
          to="/"
          class="flex items-center gap-2 tracking-[0.2em] text-(--text-nav-footer) hover:text-(--text-nav-hover) transition-colors"
        >
          <span class="font-black text-sm">JERRY YEH</span>
          <span class="h-3 w-px bg-(--text-nav-footer) opacity-30 mx-1"></span>
          <span class="font-extralight text-[10px] opacity-60">ARCHIVE</span>
        </router-link>
      </div>

      <div class="flex gap-6">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="relative pl-3 pr-1 py-1 text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all font-semibold tracking-widest flex items-center"
          active-class="!text-(--text-nav-hover) !opacity-100 font-bold"
        >
          <span
            class="absolute left-0 w-1 h-1 rounded-full bg-(--text-nav-hover) scale-0 transition-transform duration-200"
            :class="{ 'scale-100': route.path === item.path }"
          ></span>
          {{ item.name }}
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

// ⚡ 引入當前路由，用於精準驅動幾何 Active 圓點的動態樣式
const route = useRoute()

interface NavItem {
  name: string
  path: string
}

const navItems = ref<NavItem[]>([
  { name: 'ABOUT', path: '/about' },
  { name: 'ARTICLES', path: '/articles' },
  { name: 'PROJECTS', path: '/projects' },
  { name: 'NOTES', path: '/notes' },
])
</script>
