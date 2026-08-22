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
          ? 'text-(--text-ink-main) border-(--border-shelf) border-b-transparent font-semibold bg-(--bg-paper-light) pt-2.5 pb-2'
          : 'text-(--text-ink-body)/60 border-transparent bg-(--text-ink-main)/[0.04] hover:text-(--text-ink-main) hover:bg-(--text-ink-main)/[0.08] pt-2 pb-2',
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
