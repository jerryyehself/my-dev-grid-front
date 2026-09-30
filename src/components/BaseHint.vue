<script setup lang="ts">
// 灰色的小字提示。
//
// 數值以設計稿 artifact MxnbUbQypR2ZQdZugRGxCi 的 .hint 為準:
//   .hint { font-mono; 10px; letter-spacing:0.12em; --text-ink-muted; opacity:0.75 }
//
// letter-spacing 是這個定義的一部分,第一版把它踢給呼叫端是錯的——26 個呼叫端裡
// 多數沒補回去,等於整批字距被我改掉了。現在收回元件內。
//
// opacity 收斂成兩級。設計稿的行內覆寫有 0.6（5 處）、0.55（2 處）、1（1 處）;
// 0.55 與 0.6 併成 dim 是刻意的取捨——那 0.05 的差在畫面上看不出來,
// 留著只是讓同一種語意有兩個數值。需要 opacity:1 的場合請在呼叫端覆寫。
//
// tone="error"（2026-09-29）：錯誤訊息用 --text-error、不透明。以前錯誤訊息是呼叫端
// 在 class 裡塞 text-(--text-accent)／text-red-700，但這裡本身就有 text-(--text-ink-muted)，
// 兩個文字色 utility 打架時是元件自己的灰色贏，再加上 0.75 透明度——15 處錯誤訊息
// 實際上一直顯示成灰字。顏色由元件決定，呼叫端不要再用 class 覆寫文字色
withDefaults(defineProps<{ dim?: boolean; tone?: 'muted' | 'error' }>(), {
  dim: false,
  tone: 'muted',
})
</script>

<template>
  <span
    :class="[
      'font-mono text-[10px] tracking-[0.12em]',
      tone === 'error'
        ? 'text-(--text-error)'
        : ['text-(--text-ink-muted)', dim ? 'opacity-60' : 'opacity-75'],
    ]"
  >
    <slot />
  </span>
</template>
