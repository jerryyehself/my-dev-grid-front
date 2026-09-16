<script setup lang="ts">
// 多行輸入框。跟 BaseInput 同一個理由抽出來——焦點樣式只該定義一次。
// resize-y:允許使用者自己拉高,但不允許拉寬,拉寬會撐破格線版面。
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 })
const model = defineModel<string>({ required: true })
</script>

<template>
  <textarea
    v-model="model"
    :rows="rows"
    class="border border-(--border-shelf) rounded-[5px] bg-(--bg-folder) px-3 py-2.5 text-(--text-ink-body) placeholder:text-(--text-ink-muted) placeholder:opacity-55 focus:outline-none focus:border-(--text-accent) focus:shadow-[0_0_0_3px_var(--focus-ring)] resize-y"
  ></textarea>
</template>
