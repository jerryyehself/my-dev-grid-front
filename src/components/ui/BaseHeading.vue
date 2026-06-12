<template>
  <h2
    v-if="level === 'h2'"
    class="text-xl md:text-2xl font-black font-mono tracking-wider text-(--text-ink-main) mt-10 mb-4 pb-2 border-b-2 border-(--border-shelf) transition-colors duration-300 hover:border-(--text-accent)/50"
  >
    <slot />
  </h2>

  <h3
    v-else-if="level === 'h3'"
    class="text-base md:text-lg font-bold font-mono tracking-wide text-(--text-ink-body) mt-6 mb-3"
  >
    <slot />
  </h3>
</template>

<script setup lang="ts">
interface Props {
  level?: 'h2' | 'h3'
}

withDefaults(defineProps<Props>(), {
  level: 'h2',
})
</script>
