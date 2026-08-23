<template>
  <nav
    class="sticky top-0 z-50 w-full bg-(--bg-nav-footer) border-b border-black/30 shadow-md transition-colors duration-300"
  >
    <div
      class="w-full h-16 px-4 md:px-8 flex items-center justify-between font-mono text-xs"
    >
      <router-link
        to="/"
        class="flex items-baseline gap-2 text-(--text-nav-footer) hover:text-(--text-nav-hover) transition-colors"
      >
        <span class="font-serif italic font-bold text-[19px] tracking-normal">Jerry</span>
        <span class="hidden sm:inline font-light text-[11px] tracking-[0.15em] opacity-65">in Archive</span>
      </router-link>

      <!-- 手機寬度放不下四個導覽項目＋主題切換鈕，中大螢幕才用橫排 -->
      <div class="hidden md:flex gap-6">
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

      <div class="hidden md:block">
        <ThemeToggle />
      </div>

      <button
        type="button"
        class="md:hidden flex items-center justify-center w-9 h-9 text-(--text-nav-footer)"
        aria-label="開啟導覽選單"
        :aria-expanded="isMenuOpen"
        @click="isMenuOpen = !isMenuOpen"
      >
        <span class="relative w-5 h-3.5 block">
          <span
            class="absolute left-0 w-5 h-[1.5px] bg-current transition-all"
            :class="isMenuOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'"
          ></span>
          <span
            class="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-[1.5px] bg-current transition-opacity"
            :class="isMenuOpen ? 'opacity-0' : 'opacity-100'"
          ></span>
          <span
            class="absolute left-0 w-5 h-[1.5px] bg-current transition-all"
            :class="isMenuOpen ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0'"
          ></span>
        </span>
      </button>
    </div>

    <div
      v-if="isMenuOpen"
      class="md:hidden border-t border-black/30 bg-(--bg-nav-footer) px-4 py-3 flex flex-col gap-1"
    >
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="py-2.5 text-(--text-nav-footer) opacity-70 font-semibold tracking-widest"
        active-class="!text-(--text-nav-hover) !opacity-100 font-bold"
        @click="isMenuOpen = false"
      >
        {{ item.name }}
      </router-link>
      <div class="pt-2 mt-1 border-t border-black/20">
        <ThemeToggle />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'

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

const isMenuOpen = ref(false)
watch(
  () => route.path,
  () => {
    isMenuOpen.value = false
  },
)
</script>
