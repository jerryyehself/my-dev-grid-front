<template>
  <nav
    class="sticky top-0 z-50 w-full bg-(--bg-nav-footer) border-b border-black/30 shadow-md transition-colors duration-300"
    style="background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.025) 0px, rgba(255, 255, 255, 0.025) 1px, transparent 1px, transparent 7px)"
  >
    <div
      class="w-full h-16 px-4 md:px-8 flex items-center justify-between font-mono text-xs"
    >
      <!-- 字標（D-32 的「IN / ARCHIVE」，D-60 的寫法）：兩半等大、Libre Caslon Text 700、斜線用黃銅。
           以前 ARCHIVE 是 11px、65% 透明度，手機上還整個藏起來，字標只剩「IN」——
           NN/g 的首頁原則是 logo 要比周圍的導覽文字醒目，不能讀起來像另一個選單項目，
           所以兩半一樣大，手機只縮字級不拿掉 -->
      <router-link
        to="/"
        class="font-wordmark font-bold text-[20px] sm:text-[26px] tracking-[0.06em] whitespace-nowrap text-(--text-nav-footer) hover:text-(--text-nav-hover) transition-colors"
      >
        IN<span class="text-(--accent-brass) mx-[0.28em]">/</span>ARCHIVE
      </router-link>

      <!-- 手機寬度放不下四個導覽項目＋主題切換鈕，中大螢幕才用橫排 -->
      <div class="hidden md:flex gap-6 h-full">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center gap-1.5 h-full text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all font-semibold tracking-widest"
          active-class="!text-(--text-nav-hover) !opacity-100"
        >
          <span>{{ item.name }}</span>
          <span
            class="w-[18px] h-[3px] rounded-t-[2px] bg-(--text-nav-hover) scale-x-0 transition-transform duration-200"
            :class="{ 'scale-x-100': route.path === item.path }"
          ></span>
        </router-link>
      </div>

      <div class="hidden md:flex items-center gap-3">
        <AuthStatus />
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
        active-class="!text-(--text-nav-hover) !opacity-100"
        @click="isMenuOpen = false"
      >
        {{ item.name }}
      </router-link>
      <div class="pt-2 mt-1 border-t border-black/20 flex items-center justify-between">
        <AuthStatus />
        <ThemeToggle />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
import AuthStatus from '@/components/AuthStatus.vue'

// ⚡ 引入當前路由，用於精準驅動 Active 色條的動態樣式
const route = useRoute()

interface NavItem {
  name: string
  path: string
}

const navItems = ref<NavItem[]>([
  { name: 'HOME', path: '/' },
  { name: 'ARTICLES', path: '/articles' },
  { name: 'PROJECTS', path: '/projects' },
  { name: 'GRAPH', path: '/graph' },
  // NOTES 先註解掉:router/index.ts 裡沒有 /notes 這條路由,點下去只會得到空白頁,
  // 每次載入任何頁面 console 都還會噴兩次 Vue Router 的 No match 警告。
  // 導覽列上的連結對使用者的承諾是「這裡有東西」,沒有東西就不該掛在上面。
  // 之後真的做了 Notes 頁再把這行打開,路由補在 router/index.ts。
  // { name: 'NOTES', path: '/notes' },
  { name: 'ABOUT', path: '/about' },
])

const isMenuOpen = ref(false)
watch(
  () => route.path,
  () => {
    isMenuOpen.value = false
  },
)
</script>
