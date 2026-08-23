<template>
  <!-- 🎨 大背景：直接與你的全站專案語意色結合 -->
  <div class="min-h-screen flex flex-col font-sans antialiased">
    <TheNavbar />

    <!-- 🧭 捲動追蹤列：修正 issue #3 的縮放閃爍。
         跟下面的大標題是兩個獨立節點，只用 opacity/位移進場，
         不對同一個節點同時做字級縮放＋flex-direction 切換（那才是閃爍的根源）。
         v-if（不是純 opacity 切換）是刻意的：sticky 元素即使透明，沒拿掉還是會佔版面高度，
         之前就是這樣在每一頁頁首上方留了一段看不見的空白，怎麼調 header/main 的 padding 都調不掉。 -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-200 ease-out"
      leave-active-class="transition-[opacity,transform] duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="isScrolled"
        class="sticky top-16 z-40 w-full border-b border-(--border-shelf) bg-(--bg-paper-dark)/90 backdrop-blur-md shadow-sm"
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
    </Transition>

    <!-- 🏛️ 一般狀態的大標題：永遠維持同一個字級與排列方向，捲動時自然隨內容捲走
         hideHeader 的頁面（例如 About）自己畫了滿版橫幅當標題，這裡就不重複畫一次 -->
    <header v-if="!props.hideHeader" class="w-full pt-6 sm:pt-8 pb-3 sm:pb-4">
      <div class="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-2" :style="widthStyle">
        <div
          v-if="$slots.tag"
          class="flex-shrink-0 font-mono text-[11px] tracking-[0.2em] uppercase font-bold text-(--text-accent)"
        >
          <slot name="tag"></slot>
        </div>

        <h1 class="!font-extrabold tracking-tight text-(--text-ink-main) text-[28px] sm:text-[34px]">
          <slot name="title"></slot>
        </h1>

        <p v-if="$slots.description" class="text-(--text-ink-muted) text-sm mt-1 !font-normal">
          <slot name="description"></slot>
        </p>
      </div>
    </header>

    <!-- 📖 主內容區：hideHeader 時上面沒有 header 佔位，這段留白就不需要了，讓橫幅直接貼齊導覽列 -->
    <main
      class="grow w-full max-w-5xl mx-auto px-4 sm:px-6 pb-8"
      :class="props.hideHeader ? 'pt-0' : 'pt-3 sm:pt-4'"
      :style="widthStyle"
    >
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
const props = defineProps<{ contentWidth?: string; hideHeader?: boolean }>()
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
