<template>
  <!-- 草圖：成果、檢核、決策分岔的循環。三個圖形整組縮成 0.88 倍（用座標縮，不用 transform，線寬才跟其他草圖一樣）。
       樣式（線條、顏色、描線動畫）在 aboutSketch.css -->
  <svg
    class="sk"
    viewBox="0 0 240 166"
    role="img"
    aria-label="草圖：一個循環。成果卡上有幾根長條；箭頭接到檢核清單，前兩項打勾、第三項打叉；再接到一個決策點，路徑在這裡分岔：一條用強調色畫的分支帶著箭頭繼續往前，另一條灰色分支的盡頭打叉；外面一圈循環箭頭把三者圍起來，表示調整後再看下一輪成果"
    focusable="false"
  >
    <path
      class="ln"
      pathLength="1"
      style="--i: 0"
      d="M32.88 58.36H71.6Q78.64 58.36 78.64 65.4V100.6Q78.64 107.64 71.6 107.64H32.88Q25.84 107.64 25.84 100.6V65.4Q25.84 58.36 32.88 58.36Z"
    />
    <path class="dl" pathLength="1" style="--i: 0; stroke-width: 1.2" d="M32.88 68.04H52.24" />
    <path
      class="ln"
      pathLength="1"
      style="--i: 1"
      d="M36.4 98.84V88.28M45.2 98.84V79.48M54 98.84V74.2M62.8 98.84V83"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 2"
      d="M82.16 83H94.48M89.2 78.6L94.48 83L89.2 87.4"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 3"
      d="M106.8 58.36H145.52Q152.56 58.36 152.56 65.4V100.6Q152.56 107.64 145.52 107.64H106.8Q99.76 107.64 99.76 100.6V65.4Q99.76 58.36 106.8 58.36Z"
    />
    <path class="dl" pathLength="1" style="--i: 3; stroke-width: 1.2" d="M106.8 67.16H126.16" />
    <path
      class="ln"
      pathLength="1"
      style="--i: 4; stroke-width: 1.3"
      d="M106.8 73.76H112.96V79.92H106.8ZM106.8 83.44H112.96V89.6H106.8Z"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 4; stroke-width: 1.3"
      d="M108.12 76.84L109.62 78.6L112.08 74.64M108.12 86.52L109.62 88.28L112.08 84.32"
    />
    <path
      class="rd"
      pathLength="1"
      style="--i: 5; stroke-width: 1.5"
      d="M106.8 93.12H112.96V99.28H106.8ZM108.38 94.7L111.38 97.7M111.38 94.7L108.38 97.7"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 5; stroke-width: 1.2"
      d="M118.24 76.84H145.52M118.24 86.52H142M118.24 96.2H138.48"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 6"
      d="M156.08 83H166.64M161.36 78.6L166.64 83L161.36 87.4"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 7"
      d="M175.44 76.84L181.6 83L175.44 89.16L169.28 83Z"
    />
    <path
      class="rd"
      pathLength="1"
      style="--i: 8"
      d="M181.6 83C190.4 83 193.92 68.92 203.6 68.92H212.4M207.56 64.52L212.84 68.92L207.56 73.32"
    />
    <path
      class="dl"
      pathLength="1"
      style="--i: 8"
      d="M181.6 83C190.4 83 193.92 97.08 203.6 97.08"
    />
    <path
      class="dl"
      pathLength="1"
      style="--i: 9; stroke-width: 1.8"
      d="M206.24 93.12L214.16 101.04M214.16 93.12L206.24 101.04"
    />
    <path class="rd" pathLength="1" style="--i: 10" d="M149.76 26.98A115 58 0 1 1 90.24 26.98" />
    <path class="rd" pathLength="1" style="--i: 11" d="M83.97 32.87L90.83 26.9L82.63 22.96" />
  </svg>
</template>
