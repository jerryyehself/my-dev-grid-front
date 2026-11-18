<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
import {
  THEME_LIGHT_OFF_TEXT,
  THEME_LIGHT_ON_TEXT,
  THEME_TOGGLE_LABEL,
} from '@/copy/common'

const { theme, setTheme } = useTheme()
</script>

<template>
  <!-- 「明亮模式｜暗黑模式」:兩顆鈕並排,兩個狀態同時看得到,選中的那顆反白。
       明亮模式＝淺色、暗黑模式＝深色。螢幕閱讀器讀成「顯示模式 群組:明亮模式,已按下」這類,
       目前是哪一種由 aria-pressed 告知(不靠顏色)。
       選中的底色塊用 transform 滑過去(slide 240ms、ease-control),不動 width／left;
       prefers-reduced-motion 時 base.css 會把時間壓成 0.01ms。
       底色用導覽列文字色(米色),字用導覽列底色(藏青):兩個主題的導覽列都是藏青底,
       不會有藏青實心融進導覽列看不見的問題。 -->
  <div
    role="group"
    :aria-label="THEME_TOGGLE_LABEL"
    class="relative inline-grid shrink-0 grid-cols-2 rounded-full border border-(--border-on-nav) text-[13px] tracking-normal min-[400px]:tracking-[0.05em] md:tracking-normal lg:tracking-[0.05em]"
  >
    <span
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-full bg-(--text-nav-footer) transition-transform duration-[240ms] ease-[cubic-bezier(.2,.8,.2,1)]"
      :class="theme === 'dark' ? 'translate-x-full' : 'translate-x-0'"
    ></span>
    <button
      type="button"
      class="relative z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-1 min-[400px]:px-2 md:px-1 lg:px-2 whitespace-nowrap transition-[color,opacity] duration-[120ms] hover:duration-150 ease-[cubic-bezier(.2,.8,.2,1)]"
      :class="
        theme === 'light'
          ? 'text-(--bg-nav-footer)'
          : 'text-(--text-nav-footer) opacity-70 hover:opacity-100'
      "
      :aria-pressed="theme === 'light'"
      @click="setTheme('light')"
    >
      {{ THEME_LIGHT_ON_TEXT }}
    </button>
    <button
      type="button"
      class="relative z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-1 min-[400px]:px-2 md:px-1 lg:px-2 whitespace-nowrap transition-[color,opacity] duration-[120ms] hover:duration-150 ease-[cubic-bezier(.2,.8,.2,1)]"
      :class="
        theme === 'dark'
          ? 'text-(--bg-nav-footer)'
          : 'text-(--text-nav-footer) opacity-70 hover:opacity-100'
      "
      :aria-pressed="theme === 'dark'"
      @click="setTheme('dark')"
    >
      {{ THEME_LIGHT_OFF_TEXT }}
    </button>
  </div>
</template>
