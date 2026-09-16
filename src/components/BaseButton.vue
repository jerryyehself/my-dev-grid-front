<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'tab' | 'page' | 'add'
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
      // 虛線外框的「新增一個」按鈕。虛線本身就是 signifier:這裡還沒有東西,
      // 按下去才會長出來——跟實線的既有項目一眼可以分開
      variant === 'add' &&
        'flex items-center gap-2.5 border border-dashed border-(--border-shelf) rounded-[6px] px-3.5 py-3 text-[11px] tracking-[0.18em] uppercase text-(--text-ink-muted) hover:text-(--text-ink-main) hover:border-(--text-accent)/40',
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
