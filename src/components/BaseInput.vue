<script setup lang="ts">
// 單行輸入框。存在的理由是 focus 樣式:focus:outline-none 把瀏覽器預設的
// 焦點框拿掉之後,一定要自己補一個看得見的替代品,否則鍵盤使用者會完全不知道
// 焦點在哪。這條規則寫在一個地方比寫在 11 個呼叫端安全。
withDefaults(
  defineProps<{
    /** default 是有外框的獨立欄位；inline 只有一條底線,用在段落標題那種嵌在卡片裡的欄位。 */
    variant?: 'default' | 'inline'
  }>(),
  { variant: 'default' },
)
const model = defineModel<string>({ required: true })
</script>

<template>
  <input
    v-model="model"
    type="text"
    :class="[
      'text-(--text-ink-main) placeholder:text-(--text-ink-muted) placeholder:opacity-55',
      'focus:outline-none focus:border-(--text-accent) focus:shadow-[0_0_0_3px_var(--focus-ring)]',
      variant === 'default' &&
        'border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-3 py-2',
      variant === 'inline' &&
        'bg-transparent border-b border-(--border-shelf) pb-1.5 min-w-0',
    ]"
  />
</template>
