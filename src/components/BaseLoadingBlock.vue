<script setup lang="ts">
// 內容還沒到位時的佔位框。重點是「先把空間佔住」——高度由呼叫端指定成跟實際內容
// 一樣高，載入完成時版面才不會整個跳動。
//
// 收斂前有 5 個幾乎一樣的版本（GraphPoc2D / GraphPoc3D 各有載入與錯誤兩種、
// KnowledgeGraphPanel 一種），複製貼上帶出來的不一致一併收掉：
// 圓角原本 rounded(4px) 與 rounded-xl 兩種混用——4px 在這個站的框線語彙裡
// 沒有對應（BaseCard 是 rounded-xl，panel 是 6px），統一成 rounded-xl；
// 字體原本 text-xs 無襯線與 font-mono 兩種，統一成 mono，跟站上其他狀態文字一致。
withDefaults(
  defineProps<{
    /** 佔位高度，直接給 CSS 值，例如 '520px'。 */
    height: string
    /** error 用強調色,讓失敗跟「還在載入」在餘光裡就分得開。 */
    tone?: 'muted' | 'error'
  }>(),
  { tone: 'muted' },
)
</script>

<template>
  <div
    class="w-full flex items-center justify-center rounded-xl border border-(--border-shelf) bg-(--bg-paper-light) font-mono text-[11px] tracking-widest"
    :class="tone === 'error' ? 'text-(--text-accent)' : 'text-(--text-ink-body)/40'"
    :style="{ height }"
  >
    <slot />
  </div>
</template>
