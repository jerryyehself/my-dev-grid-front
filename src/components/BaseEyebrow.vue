<script setup lang="ts">
// 章節/欄位小標:等寬字、大寫、寬字距的那一行「// SOMETHING」。
//
// 數值以設計稿 artifact MxnbUbQypR2ZQdZugRGxCi 的 .lbl 為準,不是照既有程式碼逆推:
//   .lbl { font-mono; 11px; uppercase; letter-spacing:0.24em; bold; --text-accent }
// 設計稿裡 .lbl 出現 10 次,其中 4 次行內覆寫 font-size:10px（側欄面板）,
// 1 次覆寫 letter-spacing:0.2em（頁首那一行）——**覆寫字級時並沒有一起動字距**。
//
// 第一版抽這個元件時我是看著既有的 AboutView（0.2em）與編輯頁側欄（0.24em）逆推,
// 做出「11px 配 0.2em、10px 配 0.24em」兩個變體,還幫它編了「頁面章節 vs 表單欄位」
// 的說法——那是把程式碼既有的漂移當成設計意圖。現在字距固定 0.24em,
// 唯一需要 0.2em 的頁首用呼叫端覆寫,跟設計稿自己的做法一致。
withDefaults(
  defineProps<{
    /** 側欄面板用 field（10px）,對應設計稿的 font-size:10px 行內覆寫。字距不變。 */
    size?: 'default' | 'field'
  }>(),
  { size: 'default' },
)
</script>

<template>
  <div
    :class="[
      'font-mono uppercase tracking-[0.24em] text-(--text-accent) font-bold',
      size === 'field' ? 'text-[10px]' : 'text-[11px]',
    ]"
  >
    // <slot />
  </div>
</template>
