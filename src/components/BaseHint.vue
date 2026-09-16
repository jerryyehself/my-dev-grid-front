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
withDefaults(defineProps<{ dim?: boolean }>(), { dim: false })
</script>

<template>
  <span
    :class="[
      'font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted)',
      dim ? 'opacity-60' : 'opacity-75',
    ]"
  >
    <slot />
  </span>
</template>
