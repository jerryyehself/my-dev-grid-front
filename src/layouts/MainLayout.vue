<template>
  <!-- 🎨 大背景：直接與你的全站專案語意色結合 -->
  <div class="min-h-screen flex flex-col font-sans antialiased">
    <TheNavbar />

    <!-- 🌐 外層：永遠滿版，使用 transform-gpu 強制走顯示卡獨立圖層，隔離 body 的 transition 影響 -->
    <header
      :class="[
        'sticky top-16 z-40 w-full transform-gpu transition-all duration-300 ease-in-out',
        isScrolled
          ? 'py-2 bg-(--bg-paper-dark)/90 backdrop-blur-md border-b border-(--border-shelf) shadow-sm'
          : 'py-6 bg-transparent border-b border-transparent',
      ]"
    >
      <!-- 🏛️ 內層：px-4 sm:px-6 完美對齊 main 的內文線 -->
      <div
        :class="[
          'w-full max-w-5xl mx-auto px-4 sm:px-6 flex transition-all duration-300 ease-in-out',
          isScrolled ? 'flex-row items-center gap-3' : 'flex-col gap-2',
        ]"
      >
        <!-- 🏷️ Tag 區：恢復你原本乾淨的結構與縮放 -->
        <div
          v-if="$slots.tag"
          class="flex-shrink-0 transition-transform duration-300 origin-left"
          :class="{ 'scale-90': isScrolled }"
        >
          <slot name="tag"></slot>
        </div>

        <!-- 文字區：回歸最初的 Col 變 Row 精緻並排比例 -->
        <div
          :class="[
            'flex transition-all duration-300 ease-in-out grow items-baseline',
            isScrolled ? 'flex-row gap-2 overflow-hidden' : 'flex-col',
          ]"
        >
          <!-- ⚠️ 強制加上 !font-extrabold 蓋掉 CSS root 的 normal 限制，找回粗體的精緻質感 -->
          <h1
            :class="[
              '!font-extrabold tracking-tight text-(--text-ink-main) transition-all duration-300 truncate',
              isScrolled ? 'text-base !font-bold' : 'text-2xl sm:text-3xl',
            ]"
          >
            <slot name="title"></slot>
          </h1>

          <span
            v-if="isScrolled && $slots.description"
            class="text-(--text-ink-muted) font-light select-none mx-0.5"
          >
            |
          </span>

          <p
            v-if="$slots.description"
            :class="[
              'text-(--text-ink-muted) transition-all duration-300 truncate !font-normal',
              isScrolled ? 'text-xs' : 'text-sm mt-1',
            ]"
          >
            <slot name="description"></slot>
          </p>
        </div>
      </div>
    </header>

    <!-- 📖 主內容區 -->
    <main class="grow w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <article class="global-page-wrapper">
        <slot name="content"></slot>
      </article>
    </main>

    <footer
      class="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 border-t border-(--border-shelf) mt-auto text-center text-xs text-(--text-ink-muted) font-mono"
    >
      © 2026 Jerry Yeh. All Rights Reserved.
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import TheNavbar from '@/components/TheNavbar.vue'

const isScrolled = ref(false)

const handleScroll = () => {
  if (window.scrollY > 50) {
    isScrolled.value = true
  } else {
    isScrolled.value = false
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
