<template>
  <!-- 頁首線稿：六張小卡依類別分組、組間連上關係，最後寫成一段程式碼。
       樣式（線條、顏色、描線動畫）在 aboutSketch.css -->
  <svg
    class="sk about-hero-art"
    viewBox="0 0 360 190"
    role="img"
    aria-label="線稿：六張標著文件、技術、實作的小卡散落各處，依類別分成三組，組與組之間連上關係，最後寫成一段程式碼，每個分類各占一行"
    focusable="false"
  >
    <g transform="translate(8 14) rotate(-9)">
      <path
        class="tt c-doc"
        style="--i: 0"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-doc"
        pathLength="1"
        style="--i: 0"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <text class="cl x-doc" x="18" y="14.5" style="--i: 0">文件</text>
    </g>
    <g transform="translate(50 10) rotate(7)">
      <path
        class="tt c-tech"
        style="--i: 0"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-tech"
        pathLength="1"
        style="--i: 0"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <text class="cl x-tech" x="18" y="14.5" style="--i: 0">技術</text>
    </g>
    <g transform="translate(30 58) rotate(5)">
      <path
        class="tt c-impl"
        style="--i: 1"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-impl"
        pathLength="1"
        style="--i: 1"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <text class="cl x-impl" x="18" y="14.5" style="--i: 1">實作</text>
    </g>
    <g transform="translate(4 98) rotate(-6)">
      <path
        class="tt c-tech"
        style="--i: 1"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-tech"
        pathLength="1"
        style="--i: 1"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <text class="cl x-tech" x="18" y="14.5" style="--i: 1">技術</text>
    </g>
    <g transform="translate(52 96) rotate(9)">
      <path
        class="tt c-doc"
        style="--i: 2"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-doc"
        pathLength="1"
        style="--i: 2"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <text class="cl x-doc" x="18" y="14.5" style="--i: 2">文件</text>
    </g>
    <g transform="translate(26 146) rotate(-5)">
      <path
        class="tt c-impl"
        style="--i: 2"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-impl"
        pathLength="1"
        style="--i: 2"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <text class="cl x-impl" x="18" y="14.5" style="--i: 2">實作</text>
    </g>
    <path class="ln" pathLength="1" style="--i: 3" d="M100 96H124M117 90L125 96L117 102" />
    <path
      class="ln"
      pathLength="1"
      style="--i: 4"
      d="M140 22H204Q212 22 212 30V58Q212 66 204 66H140Q132 66 132 58V30Q132 22 140 22Z"
    />
    <g transform="translate(139 33) rotate(0)">
      <path
        class="tt c-doc"
        style="--i: 4"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-doc"
        pathLength="1"
        style="--i: 4"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <text class="cl x-doc" x="18" y="14.5" style="--i: 4">文件</text>
    </g>
    <g transform="translate(173 33) rotate(0)">
      <path
        class="tt c-doc"
        style="--i: 4"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-doc"
        pathLength="1"
        style="--i: 4"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path class="ln c-doc" pathLength="1" style="--i: 4; stroke-width: 1.2" d="M7 8H29M7 14H21" />
    </g>
    <path
      class="ln"
      pathLength="1"
      style="--i: 5"
      d="M140 74H204Q212 74 212 82V110Q212 118 204 118H140Q132 118 132 110V82Q132 74 140 74Z"
    />
    <g transform="translate(139 85) rotate(0)">
      <path
        class="tt c-tech"
        style="--i: 5"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-tech"
        pathLength="1"
        style="--i: 5"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <text class="cl x-tech" x="18" y="14.5" style="--i: 5">技術</text>
    </g>
    <g transform="translate(173 85) rotate(0)">
      <path
        class="tt c-tech"
        style="--i: 5"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-tech"
        pathLength="1"
        style="--i: 5"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-tech"
        pathLength="1"
        style="--i: 5; stroke-width: 1.2"
        d="M7 8H29M7 14H21"
      />
    </g>
    <path
      class="ln"
      pathLength="1"
      style="--i: 6"
      d="M140 126H204Q212 126 212 134V162Q212 170 204 170H140Q132 170 132 162V134Q132 126 140 126Z"
    />
    <g transform="translate(139 137) rotate(0)">
      <path
        class="tt c-impl"
        style="--i: 6"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-impl"
        pathLength="1"
        style="--i: 6"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <text class="cl x-impl" x="18" y="14.5" style="--i: 6">實作</text>
    </g>
    <g transform="translate(173 137) rotate(0)">
      <path
        class="tt c-impl"
        style="--i: 6"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-impl"
        pathLength="1"
        style="--i: 6"
        d="M4 0H32Q36 0 36 4V18Q36 22 32 22H4Q0 22 0 18V4Q0 0 4 0Z"
      />
      <path
        class="ln c-impl"
        pathLength="1"
        style="--i: 6; stroke-width: 1.2"
        d="M7 8H29M7 14H21"
      />
    </g>
    <path class="rd" pathLength="1" style="--i: 7" d="M172 67V73M167.5 69.5L172 73.5L176.5 69.5" />
    <path
      class="rd"
      pathLength="1"
      style="--i: 8"
      d="M172 119V125M167.5 121.5L172 125.5L176.5 121.5"
    />
    <path
      class="rd"
      pathLength="1"
      style="--i: 9"
      d="M218 44C232 50 232 90 218 96M218 98C232 104 232 142 218 148"
    />
    <path class="ln" pathLength="1" style="--i: 10" d="M240 96H258M251 90L259 96L251 102" />
    <path
      class="fl"
      fill-opacity=".1"
      style="--i: 11"
      d="M276 44H346Q354 44 354 52V140Q354 148 346 148H276Q268 148 268 140V52Q268 44 276 44Z"
    />
    <path
      class="rd"
      pathLength="1"
      style="--i: 11"
      d="M276 44H346Q354 44 354 52V140Q354 148 346 148H276Q268 148 268 140V52Q268 44 276 44Z"
    />
    <path class="rd" pathLength="1" style="--i: 12" d="M278 60H298" />
    <path class="tt c-doc" style="--i: 13" d="M280 80H288V88H280Z" />
    <path
      class="ln c-doc"
      pathLength="1"
      style="--i: 13; stroke-width: 1.5"
      d="M280 80H288V88H280Z"
    />
    <path class="ln c-doc" pathLength="1" style="--i: 13; stroke-width: 1.8" d="M296 84H334" />
    <path class="tt c-tech" style="--i: 14" d="M280 98H288V106H280Z" />
    <path
      class="ln c-tech"
      pathLength="1"
      style="--i: 14; stroke-width: 1.5"
      d="M280 98H288V106H280Z"
    />
    <path class="ln c-tech" pathLength="1" style="--i: 14; stroke-width: 1.8" d="M296 102H326" />
    <path class="tt c-impl" style="--i: 15" d="M280 116H288V124H280Z" />
    <path
      class="ln c-impl"
      pathLength="1"
      style="--i: 15; stroke-width: 1.5"
      d="M280 116H288V124H280Z"
    />
    <path class="ln c-impl" pathLength="1" style="--i: 15; stroke-width: 1.8" d="M296 120H338" />
    <path
      class="rd"
      pathLength="1"
      style="--i: 16"
      d="M278 133Q282 133 282 136.5V139.5Q282 143 278 143"
    />
  </svg>
</template>
