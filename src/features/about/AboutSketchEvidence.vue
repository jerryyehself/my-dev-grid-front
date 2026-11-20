<template>
  <!-- 草圖：放大鏡檢視一疊來源卡片，下方是由證據支撐的主張。
       樣式（線條、顏色、描線動畫）在 aboutSketch.css -->
  <svg
    class="sk"
    viewBox="0 0 240 166"
    role="img"
    aria-label="草圖：放大鏡檢視一疊來源卡片，鏡片裡放大的是引用記號 [1]；卡片下方是一行由這些證據支撐的主張，旁邊打勾"
    focusable="false"
  >
    <path
      class="ln"
      pathLength="1"
      style="--i: 0"
      d="M56 18H128Q132 18 132 22V80Q132 84 128 84H56Q52 84 52 80V22Q52 18 56 18Z"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 1"
      d="M64 26H136Q140 26 140 30V88Q140 92 136 92H64Q60 92 60 88V30Q60 26 64 26Z"
    />
    <path
      class="bgf"
      style="--i: 2"
      d="M72 34H144Q148 34 148 38V96Q148 100 144 100H72Q68 100 68 96V38Q68 34 72 34Z"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 2"
      d="M72 34H144Q148 34 148 38V96Q148 100 144 100H72Q68 100 68 96V38Q68 34 72 34Z"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 3; stroke-width: 1.2"
      d="M78 48H126M78 58H136M78 68H124M78 78H132M78 88H110"
    />
    <circle class="bgf" style="--i: 4" cx="152" cy="66" r="24" />
    <circle class="fl" fill-opacity=".08" style="--i: 4" cx="152" cy="66" r="24" />
    <text class="t-mark code" x="152" y="70" font-size="20" text-anchor="middle" style="--i: 5">
      [1]
    </text>
    <path class="ln" pathLength="1" style="--i: 5; stroke-width: 2.4" d="M134 82H160" />
    <circle class="rd" pathLength="1" style="--i: 4; stroke-width: 2.2" cx="152" cy="66" r="24" />
    <path class="ln" pathLength="1" style="--i: 6; stroke-width: 5" d="M170 84L192 106" />
    <path class="ln" pathLength="1" style="--i: 7" d="M100 106V122M95 117L100 123L105 117" />
    <path class="ln" pathLength="1" style="--i: 8; stroke-width: 2" d="M46 136H156M46 148H126" />
    <path
      class="rd"
      pathLength="1"
      style="--i: 9; stroke-width: 2.2"
      d="M166 138L173 146L188 128"
    />
  </svg>
</template>
