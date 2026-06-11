<template>
  <div
    class="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800 font-sans antialiased flex flex-col relative"
  >
    <TheNavbar />

    <main class="grow relative z-10 w-full max-w-5xl mx-auto pt-6 pb-16 px-4 sm:px-6 md:px-8">
      <header class="relative pt-2 pb-5 mb-6 border-b border-slate-200/60 text-left">
        <div class="flex flex-col gap-1.5">
          <div v-if="$slots.tag" class="mb-1">
            <slot name="tag"></slot>
          </div>

          <h1 class="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            <slot name="title"></slot>
          </h1>

          <div class="text-xs md:text-sm text-slate-400 mt-1 font-mono">
            <slot name="description"></slot>
          </div>
        </div>
      </header>

      <article class="global-page-wrapper">
        <slot name="content"></slot>
      </article>
    </main>

    <footer
      class="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-mono"
    >
      © 2026 Jerry Yeh. Built with Vue 3 & Layout Architecture
    </footer>
  </div>
</template>

<script setup>
import TheNavbar from '@/components/TheNavbar.vue'
</script>

<style scoped>
/* 🎯 深度選取器：自動大一統子網頁內部的 h2 與 p */
.global-page-wrapper :deep(h2) {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: #0f172a;
  margin-top: 2.5rem; /* 💡 從 3rem 微調至 2.5rem，適度緊湊 */
  margin-bottom: 1.125rem;
  display: flex;
  align-items: center;
}

.global-page-wrapper :deep(h2)::before {
  content: '// ';
  color: #6366f1;
  font-family: monospace;
  margin-right: 0.5rem;
}

.global-page-wrapper :deep(p) {
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.75;
  margin-bottom: 1.25rem; /* 💡 從 1.5rem 縮減至 1.25rem */
}
</style>
