<template>
  <!-- 草圖：圖資與系統設計的左右對照表。
       樣式（線條、顏色、描線動畫）在 aboutSketch.css -->
  <svg
    class="sk"
    viewBox="0 0 240 166"
    role="img"
    aria-label="草圖：像對照表一樣的左右兩欄，左欄是圖資、右欄是系統設計，三條連接線把分類編目對到資料模型、權威控制對到唯一識別與正規化、讀者服務／資訊行為對到使用者研究與介面設計"
    focusable="false"
  >
    <text class="t-del lbl" x="44" y="16" font-size="11" text-anchor="middle" style="--i: 0">
      圖資
    </text>
    <text class="t-del lbl" x="182" y="16" font-size="11" text-anchor="middle" style="--i: 0">
      系統設計
    </text>
    <path class="dl" pathLength="1" style="--i: 0" d="M4 25H236" />
    <rect class="ln" pathLength="1" style="--i: 1" x="4" y="32" width="80" height="26" rx="4" />
    <text class="t-pen" x="44" y="49.3" font-size="12" text-anchor="middle" style="--i: 1">
      分類編目
    </text>
    <circle class="fl" style="--i: 2" cx="88" cy="45" r="2.6" />
    <path class="rd" pathLength="1" style="--i: 2" d="M88 45H124" />
    <circle class="fl" style="--i: 2" cx="124" cy="45" r="2.6" />
    <rect class="ln" pathLength="1" style="--i: 3" x="128" y="32" width="108" height="26" rx="4" />
    <text class="t-pen" x="182" y="49.3" font-size="12" text-anchor="middle" style="--i: 3">
      資料模型
    </text>
    <path
      class="dl"
      pathLength="1"
      style="--i: 3; stroke-dasharray: 2 4; stroke-width: 1"
      d="M4 65H236"
    />
    <rect class="ln" pathLength="1" style="--i: 2" x="4" y="72" width="80" height="38" rx="4" />
    <text class="t-pen" x="44" y="95.3" font-size="12" text-anchor="middle" style="--i: 2">
      權威控制
    </text>
    <circle class="fl" style="--i: 3" cx="88" cy="91" r="2.6" />
    <path class="rd" pathLength="1" style="--i: 3" d="M88 91H124" />
    <circle class="fl" style="--i: 3" cx="124" cy="91" r="2.6" />
    <rect class="ln" pathLength="1" style="--i: 4" x="128" y="72" width="108" height="38" rx="4" />
    <text class="t-pen" x="182" y="87.8" font-size="12" text-anchor="middle" style="--i: 4">
      唯一識別
    </text>
    <text class="t-pen" x="182" y="102.8" font-size="12" text-anchor="middle" style="--i: 4">
      與正規化
    </text>
    <path
      class="dl"
      pathLength="1"
      style="--i: 4; stroke-dasharray: 2 4; stroke-width: 1"
      d="M4 117H236"
    />
    <rect class="ln" pathLength="1" style="--i: 3" x="4" y="124" width="80" height="38" rx="4" />
    <text class="t-pen" x="44" y="139.8" font-size="12" text-anchor="middle" style="--i: 3">
      讀者服務／
    </text>
    <text class="t-pen" x="44" y="154.8" font-size="12" text-anchor="middle" style="--i: 3">
      資訊行為
    </text>
    <circle class="fl" style="--i: 4" cx="88" cy="143" r="2.6" />
    <path class="rd" pathLength="1" style="--i: 4" d="M88 143H124" />
    <circle class="fl" style="--i: 4" cx="124" cy="143" r="2.6" />
    <rect class="ln" pathLength="1" style="--i: 5" x="128" y="124" width="108" height="38" rx="4" />
    <text class="t-pen" x="182" y="139.8" font-size="12" text-anchor="middle" style="--i: 5">
      使用者研究
    </text>
    <text class="t-pen" x="182" y="154.8" font-size="12" text-anchor="middle" style="--i: 5">
      與介面設計
    </text>
  </svg>
</template>
