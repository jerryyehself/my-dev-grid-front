<script setup lang="ts">
// 網址對不到任何路由時的頁面（router 最後一條 /:pathMatch(.*)*）。以前沒有這條，打錯網址
// 只剩頁首頁尾、中間空白，看起來像網站壞了。版面選置中的 C 版（2026-10-04 使用者決定，
// 雛形比較過「跟其他頁同一套表頭」的 A 版）：一眼看得出是錯誤頁，連結離視線近。
//
// 單頁應用的 404 頁 HTTP 狀態碼其實是 200（Cloudflare 對任何路徑都回 index.html），搜尋引擎
// 可能當成正常頁面收錄，所以這頁在的時候加 robots noindex，離開就拿掉。
import { onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'

const LINKS = [
  { to: '/', text: '首頁' },
  { to: '/articles', text: '文章' },
  { to: '/projects', text: '專案' },
  { to: '/graph', text: '圖譜' },
]

let robots: HTMLMetaElement | null = null
onMounted(() => {
  robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex'
  document.head.appendChild(robots)
})
onUnmounted(() => robots?.remove())
</script>

<template>
  <div class="w-full flex flex-col items-center text-center py-16 lg:py-24">
    <div class="font-mono font-bold text-[13px] tracking-[0.24em] text-(--text-accent)">404</div>
    <h1
      class="mt-4 mb-0 font-serif font-black text-[32px] sm:text-[44px] leading-[1.2] text-(--text-ink-main)"
    >
      找不到這個頁面
    </h1>
    <!-- 文案不說「網址打錯了」：從搜尋結果或別人的連結點進來的人根本沒有打字（模擬讀者審查） -->
    <p class="mt-4 mb-0 text-[16px] leading-[1.75] text-(--text-ink-body)">
      這個網址沒有對應的頁面，可能是連結有誤，或內容已經移走。
    </p>
    <!-- 每個連結至少 44px 高，手機好點 -->
    <nav aria-label="可以前往的頁面" class="mt-6 flex flex-wrap justify-center gap-x-6">
      <RouterLink
        v-for="l in LINKS"
        :key="l.to"
        :to="l.to"
        class="inline-flex items-center min-h-11 text-[15px] text-(--text-accent) hover:underline"
        >{{ l.text }}</RouterLink
      >
    </nav>
  </div>
</template>
