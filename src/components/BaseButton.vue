<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'tab' | 'page'
    active?: boolean
  }>(),
  { variant: 'primary', active: false },
)
</script>

<template>
  <button
    :class="[
      'font-mono transition-all disabled:opacity-40 disabled:pointer-events-none',
      variant === 'primary' &&
        'rounded-full border border-(--border-shelf) px-2.5 py-1 text-[10px] tracking-[0.3em] text-(--text-ink-body) opacity-70 hover:opacity-100 hover:text-(--text-accent)',
      variant === 'ghost' &&
        'px-1 py-1 text-[10px] tracking-[0.3em] text-(--text-ink-muted) hover:text-(--text-ink-main)',
      variant === 'tab' && [
        'h-[34px] flex items-center px-4 rounded-t border text-[10px] uppercase tracking-wider cursor-pointer',
        active
          ? 'text-(--text-accent) border-(--border-shelf) border-b-transparent font-bold bg-(--bg-paper-light) pt-2.5 pb-2'
          : 'text-(--text-ink-muted) font-medium border-transparent bg-(--bg-folder) hover:text-(--text-ink-main) hover:bg-(--bg-folder)/70 pt-2 pb-2',
      ],
      variant === 'page' && [
        'rounded-xs px-2.5 py-1 text-[11px]',
        active
          ? 'font-bold text-(--bg-paper-light) bg-(--text-ink-main)'
          : 'text-(--text-ink-body)/60 hover:bg-(--text-ink-main)/[0.04]',
      ],
    ]"
  >
    <slot />
  </button>
</template>
