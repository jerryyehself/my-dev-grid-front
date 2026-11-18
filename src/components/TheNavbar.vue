<template>
  <nav
    class="sticky top-0 z-50 w-full bg-(--bg-nav-footer) border-b border-black/30 shadow-md transition-colors duration-300"
    style="background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.025) 0px, rgba(255, 255, 255, 0.025) 1px, transparent 1px, transparent 7px)"
  >
    <div
      class="w-full h-14 md:h-16 px-3 min-[360px]:px-4 md:px-8 flex items-center justify-between font-mono text-xs"
    >
      <!-- 字標（D-32 的「IN / ARCHIVE」，D-60 的寫法）：兩半等大、Libre Caslon Text 700、斜線用黃銅。
           以前 ARCHIVE 是 11px、65% 透明度，手機上還整個藏起來，字標只剩「IN」——
           NN/g 的首頁原則是 logo 要比周圍的導覽文字醒目，不能讀起來像另一個選單項目，
           所以兩半一樣大，手機只縮字級不拿掉 -->
      <router-link
        to="/"
        class="font-wordmark font-bold text-[16px] min-[360px]:text-[18px] min-[400px]:text-[20px] md:text-[22px] lg:text-[26px] leading-[normal] tracking-[0.05em] whitespace-nowrap text-(--text-nav-footer) hover:text-(--text-nav-hover) transition-colors"
      >
        IN<span class="text-(--accent-brass) mx-[0.28em]">/</span>ARCHIVE
      </router-link>

      <!-- 手機寬度放不下五個導覽項目＋主題切換鈕，中大螢幕才用橫排 -->
      <div class="hidden md:flex md:gap-4 lg:gap-6 h-full">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center gap-1.5 h-full text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-[color,opacity] font-semibold md:tracking-wide lg:tracking-widest"
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

      <!-- 手機:主題鈕露在漢堡旁邊,不藏進選單(開關要一眼找得到、一步按得到) -->
      <div class="md:hidden flex shrink-0 items-center gap-1 min-[360px]:gap-2 -mr-2 min-[360px]:mr-0">
        <ThemeToggle />
        <button
          type="button"
          class="flex shrink-0 items-center justify-center w-11 h-11 text-(--text-nav-footer)"
          :aria-label="NAV_MENU_ARIA_LABEL"
          :aria-expanded="isMenuOpen"
          @click="isMenuOpen = !isMenuOpen"
        >
          <span class="relative w-5 h-3.5 block">
            <span
              class="absolute left-0 top-0 w-5 h-[1.5px] bg-current transition-transform ease-[cubic-bezier(.2,.8,.2,1)]"
              :class="isMenuOpen ? 'duration-200 translate-y-[6.25px] rotate-45' : 'duration-[120ms]'"
            ></span>
            <span
              class="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-[1.5px] bg-current transition-opacity ease-[cubic-bezier(.2,.8,.2,1)]"
              :class="isMenuOpen ? 'duration-200 opacity-0' : 'duration-[120ms] opacity-100'"
            ></span>
            <span
              class="absolute left-0 bottom-0 w-5 h-[1.5px] bg-current transition-transform ease-[cubic-bezier(.2,.8,.2,1)]"
              :class="isMenuOpen ? 'duration-200 -translate-y-[6.25px] -rotate-45' : 'duration-[120ms]'"
            ></span>
          </span>
        </button>
      </div>
    </div>

    <!-- 手機選單:只用 opacity／translate(Tailwind v4 的 -translate-y-1 是獨立的 translate 屬性,transition 要列 translate 才會動),開 200ms、收 120ms(panel-open／panel-close),同一條 ease-control 曲線 -->
    <Transition
      enter-active-class="transition-[opacity,translate] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]"
      leave-active-class="transition-[opacity,translate] duration-[120ms] ease-[cubic-bezier(.2,.8,.2,1)]"
      enter-from-class="opacity-0 -translate-y-1"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="isMenuOpen"
        class="md:hidden border-t border-black/30 bg-(--bg-nav-footer) px-4 py-3 flex flex-col gap-1"
      >
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="relative flex items-center gap-3 min-h-11 font-mono text-[13px] text-(--text-nav-footer) opacity-85 font-semibold tracking-widest"
          active-class="!text-(--text-nav-hover) !opacity-100"
          @click="isMenuOpen = false"
        >
          <!-- 目前頁的指示:左側色條(跟桌機的底部色條同色),不只靠變色 -->
          <span
            v-if="route.path === item.path"
            aria-hidden="true"
            class="absolute -left-4 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-[2px] bg-(--text-nav-hover)"
          ></span>
          <span>{{ item.name }}</span>
          <span class="font-sans text-[13px] font-normal tracking-[0.05em]">{{ item.zh }}</span>
        </router-link>
        <!-- 登入鈕有 1px 外框＋10px 內距,AuthStatus 這一層往左拉 11px（分隔線不動）讓文字左緣跟上面選單項目一樣在 16px -->
        <div class="pt-2 mt-1 border-t border-black/20 flex items-center">
          <AuthStatus class="-ml-[11px]" />
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
import AuthStatus from '@/components/AuthStatus.vue'
import { NAV_LABELS, NAV_LABELS_ZH, NAV_MENU_ARIA_LABEL } from '@/copy/common'

// ⚡ 引入當前路由，用於精準驅動 Active 色條的動態樣式
const route = useRoute()

interface NavItem {
  name: string
  /** 中文名,只在手機選單中英並列時用 */
  zh: string
  path: string
}

const navItems = ref<NavItem[]>([
  { name: NAV_LABELS.home, zh: NAV_LABELS_ZH.home, path: '/' },
  { name: NAV_LABELS.articles, zh: NAV_LABELS_ZH.articles, path: '/articles' },
  { name: NAV_LABELS.projects, zh: NAV_LABELS_ZH.projects, path: '/projects' },
  { name: NAV_LABELS.graph, zh: NAV_LABELS_ZH.graph, path: '/graph' },
  // NOTES 先註解掉:router/index.ts 裡沒有 /notes 這條路由,點下去只會得到空白頁,
  // 每次載入任何頁面 console 都還會噴兩次 Vue Router 的 No match 警告。
  // 導覽列上的連結對使用者的承諾是「這裡有東西」,沒有東西就不該掛在上面。
  // 之後真的做了 Notes 頁再把這行打開,路由補在 router/index.ts。
  // { name: 'NOTES', path: '/notes' },
  { name: NAV_LABELS.about, zh: NAV_LABELS_ZH.about, path: '/about' },
])

const isMenuOpen = ref(false)
watch(
  () => route.path,
  () => {
    isMenuOpen.value = false
  },
)
</script>
