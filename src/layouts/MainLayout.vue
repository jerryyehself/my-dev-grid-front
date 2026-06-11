<template>
  <div class="min-h-screen flex flex-col relative transition-colors duration-300">
    <TheNavbar />

    <main class="grow relative z-10 w-full max-w-5xl mx-auto pt-6 pb-16 px-4 sm:px-6 md:px-8">
      <SiteHeader>
        <template v-if="$slots.tag" #tag>
          <slot name="tag"></slot>
        </template>
        <template v-if="$slots.title" #title>
          <slot name="title"></slot>
        </template>
        <template v-if="$slots.description" #description>
          <slot name="description"></slot>
        </template>
      </SiteHeader>

      <article class="global-page-wrapper">
        <slot name="content"></slot>
      </article>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup>
// 💡 引進所有獨立組件，Layout 不留任何多餘的計算邏輯（useRoute、computed 通通拔除）
import TheNavbar from '@/components/TheNavbar.vue'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
</script>

<style scoped>
/* 這裡維持乾淨空無一物，全域樣式已被 variables.css 和 base.css 接管 */
</style>
