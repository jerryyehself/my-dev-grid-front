<template>
  <!-- 草圖：讀者說出口與沒說出口的需求，流向站主，整理成一張頁面線框。
       樣式（線條、顏色、描線動畫）在 aboutSketch.css -->
  <svg
    class="sk"
    viewBox="0 0 240 166"
    role="img"
    aria-label="草圖：左邊是一位讀者，實線的對話框是他說出口的需求，虛線的思考泡泡是他沒說出口的需求；兩條線都流向中間用強調色畫的站主，站主再把它們整理成右邊的一張頁面設計線框"
    focusable="false"
  >
    <circle class="ln" pathLength="1" style="--i: 0" cx="22" cy="108" r="8" />
    <path class="ln" pathLength="1" style="--i: 0" d="M8 142Q8 124 22 124Q36 124 36 142" />
    <path
      class="ln"
      pathLength="1"
      style="--i: 1"
      d="M12 40H50Q56 40 56 46V58Q56 64 50 64H28L18 80L20 64H12Q6 64 6 58V46Q6 40 12 40Z"
    />
    <path class="ln" pathLength="1" style="--i: 2; stroke-width: 1.2" d="M14 49H48M14 56H34" />
    <circle class="gh" style="--i: 1" cx="34" cy="101" r="1.8" />
    <circle class="gh" style="--i: 1" cx="40" cy="96" r="2.6" />
    <path
      class="gh"
      style="--i: 2"
      d="M56 102Q44 102 46 92Q40 82 52 78Q54 68 66 71Q75 64 84 70Q95 70 94 81Q100 91 90 97Q85 104 75 101Q66 106 56 102Z"
    />
    <path class="dl" pathLength="1" style="--i: 3; stroke-width: 1.2" d="M56 84H84M60 92H78" />
    <path
      class="ln"
      pathLength="1"
      style="--i: 4; stroke-width: 1.2"
      d="M57 52C94 52 112 74 116 98M97 88C104 90 110 94 116 98"
    />
    <circle class="rd" pathLength="1" style="--i: 5" cx="126" cy="100" r="9" />
    <path class="rd" pathLength="1" style="--i: 5" d="M110 142Q110 116 126 116Q142 116 142 142" />
    <path class="ln" pathLength="1" style="--i: 6" d="M148 110H160M154 105L160 110L154 115" />
    <path
      class="ln"
      pathLength="1"
      style="--i: 7"
      d="M174 40H228Q234 40 234 46V136Q234 142 228 142H174Q168 142 168 136V46Q168 40 174 40Z"
    />
    <path class="ln" pathLength="1" style="--i: 7; stroke-width: 1.2" d="M168 54H234M175 47H190" />
    <path
      class="ln"
      pathLength="1"
      style="--i: 8; stroke-width: 1.2"
      d="M176 63H186V73H176ZM176 85H186V95H176ZM176 107H186V117H176Z"
    />
    <path
      class="ln"
      pathLength="1"
      style="--i: 8; stroke-width: 1.2"
      d="M192 65H226M192 71H212M192 87H224M192 93H210M192 109H226M192 115H214"
    />
    <path class="dl" pathLength="1" style="--i: 9; stroke-width: 1.2" d="M176 129H226" />
  </svg>
</template>
