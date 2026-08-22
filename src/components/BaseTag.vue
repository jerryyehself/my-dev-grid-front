<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'accent' | 'muted' }>(), { tone: 'neutral' })
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] tracking-wide',
      tone === 'neutral' && 'bg-(--bg-folder) text-(--text-ink-body)',
      tone === 'accent' &&
        'border border-(--text-accent)/30 text-(--text-accent) font-semibold uppercase tracking-wider',
      tone === 'muted' &&
        'border border-(--border-shelf) text-(--text-ink-muted) uppercase tracking-wider',
    ]"
  >
    <slot />
  </span>
</template>
