<template>
  <div
    class="w-full p-5 md:p-6 rounded-xl border transition-all duration-300 text-left font-mono"
    :class="[
      // 1. 作用中狀態 (Active)：實心加強，邊框打亮，視覺權重最高
      isActive
        ? 'bg-white border-(--text-accent) shadow-md ring-1 ring-(--text-accent)/30'
        : 'bg-(--bg-folder) border-(--border-shelf) shadow-sm hover:bg-white hover:border-(--text-ink-muted)/40 hover:shadow-md',
    ]"
  >
    <div
      v-if="$slots.header"
      class="mb-3 flex justify-between items-center text-[11px] font-bold text-(--text-ink-muted)"
    >
      <slot name="header" />
    </div>

    <div class="text-sm text-(--text-ink-body) leading-relaxed">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="mt-4 pt-3 border-t border-(--border-shelf)/40 flex items-center justify-between text-xs text-(--text-ink-muted)"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isActive?: boolean
}
withDefaults(defineProps<Props>(), {
  isActive: false,
})
</script>
