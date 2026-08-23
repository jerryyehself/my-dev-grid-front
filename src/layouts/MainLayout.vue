<template>
  <!-- 🎨 大背景：直接與你的全站專案語意色結合 -->
  <div class="min-h-screen flex flex-col font-sans antialiased">
    <TheNavbar />

    <!-- 🧭 捲動追蹤列：修正 issue #3 的縮放閃爍。
         跟下面的大標題是兩個獨立節點，只用 opacity/位移進場，
         不對同一個節點同時做字級縮放＋flex-direction 切換（那才是閃爍的根源）。 -->
    <div
      class="sticky top-16 z-40 w-full border-b border-(--border-shelf) bg-(--bg-paper-dark)/90 backdrop-blur-md shadow-sm transition-[opacity,transform] duration-200 ease-out"
      :class="isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'"
    >
      <div
        class="w-full max-w-5xl mx-auto px-4 sm:px-6 h-11 flex items-center gap-2.5 overflow-hidden"
        :style="widthStyle"
      >
        <span class="w-[3px] h-3.5 rounded-full bg-(--text-accent) shrink-0"></span>
        <span
          v-if="$slots.tag"
          class="shrink-0 text-[10px] font-mono uppercase tracking-widest text-(--text-ink-muted)"
        >
          <slot name="tag"></slot>
        </span>
        <span v-if="$slots.tag" class="text-(--text-ink-muted)/50 shrink-0">›</span>
        <h2 class="text-[13px] font-bold text-(--text-ink-main) truncate">
          <slot name="title"></slot>
        </h2>
      </div>
    </div>

    <!-- 🏛️ 一般狀態的大標題：永遠維持同一個字級與排列方向，捲動時自然隨內容捲走 -->
    <header class="w-full py-6 sm:py-8">
      <div class="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-2" :style="widthStyle">
        <div v-if="$slots.tag" class="flex-shrink-0">
          <slot name="tag"></slot>
        </div>

        <h1 class="!font-extrabold tracking-tight text-(--text-ink-main) text-2xl sm:text-3xl">
          <slot name="title"></slot>
        </h1>

        <p v-if="$slots.description" class="text-(--text-ink-muted) text-sm mt-1 !font-normal">
          <slot name="description"></slot>
        </p>
      </div>
    </header>

    <!-- 📖 主內容區 -->
    <main class="grow w-full max-w-5xl mx-auto px-4 sm:px-6 py-8" :style="widthStyle">
      <article class="global-page-wrapper">
        <slot name="content"></slot>
      </article>
    </main>

    <footer
      class="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 border-t border-(--border-shelf) mt-auto text-center text-xs text-(--text-ink-muted) font-mono"
      :style="widthStyle"
    >
      © 2026 Jerry Yeh. All Rights Reserved.
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TheNavbar from '@/components/TheNavbar.vue'

// 大部分頁面共用 max-w-5xl（1024px）；個別頁面如果設計稿要更寬/更窄，
// 透過 route.meta.contentWidth 覆蓋，不用整站改寬度。
const props = defineProps<{ contentWidth?: string }>()
const widthStyle = computed(() => (props.contentWidth ? { maxWidth: props.contentWidth } : undefined))

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
