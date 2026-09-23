<script setup lang="ts">
// 單行輸入框。
//
// 數值以設計稿 artifact MxnbUbQypR2ZQdZugRGxCi 的 .fld 為準:
//   .fld { 1px --border-shelf; --bg-paper-light; radius:6px; padding:10px 12px;
//          14px; --text-ink-main; line-height:1.6 }
// 第一版是照既有程式碼寫的,padding 只有 8px 12px、也沒帶字級與行高,
// 每個呼叫端各自補——結果就是設計稿定好的基準值沒有一個地方持有。
//
// focus 樣式也收在這裡:focus:outline-none 把瀏覽器預設的焦點框拿掉之後,
// 一定要自己補一個看得見的替代品,否則鍵盤使用者會完全不知道焦點在哪。
withDefaults(
  defineProps<{
    /** default 是有外框的獨立欄位；inline 只有一條底線,用在段落標題那種嵌在卡片裡的欄位。 */
    variant?: 'default' | 'inline'
    type?: 'text' | 'email' | 'password'
    /**
     * 規格「本體論編輯規格」缺口 G5：被引用的 Relation 只剩 `note` 可改。
     * 視覺跟 `BaseSelect` 既有的 `disabled` 一致（`opacity-40` + 不可互動），
     * 不另外發明一種「鎖定」樣式——鎖定的理由是文字說明的責任，不是外框顏色的責任。
     */
    disabled?: boolean
  }>(),
  { variant: 'default', type: 'text', disabled: false },
)
const model = defineModel<string>({ required: true })
</script>

<template>
  <input
    v-model="model"
    :type="type"
    :disabled="disabled"
    :class="[
      'text-(--text-ink-main) placeholder:text-(--text-ink-muted) placeholder:opacity-55',
      'focus:outline-none focus:border-(--text-accent) focus:shadow-[0_0_0_3px_var(--focus-ring)]',
      'disabled:pointer-events-none disabled:opacity-40',
      variant === 'default' &&
        'border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-3 py-2.5 text-sm leading-[1.6]',
      variant === 'inline' &&
        'bg-transparent border-b border-(--border-shelf) pb-1.5 min-w-0',
    ]"
  />
</template>
