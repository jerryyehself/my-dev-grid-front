<script setup lang="ts">
import { ref } from 'vue'
import GraphLegendDots from '@/components/GraphLegendDots.vue'
import { useRoute, RouterLink } from 'vue-router'
import GraphPoc2D from '@/components/poc/GraphPoc2D.vue'
import GraphPoc3D from '@/components/poc/GraphPoc3D.vue'
import GraphPathSearch from '@/components/poc/GraphPathSearch.vue'
import GraphPathDiagram from '@/components/poc/GraphPathDiagram.vue'
import type { GraphPocSelection } from '@/data/graphPocData'
import type { GraphNodeType, GraphPathDto } from '@/api/graph'

const route = useRoute()
const mode = ref<'2d' | '3d'>(route.query.mode === '3d' ? '3d' : '2d')

// 點節點/點連線的詳情——2D/3D 各自把力模擬內部物件解析成同一種形狀再往上 emit
// （見 graphPocData.ts 的 GraphPocSelection 說明），這裡只管顯示，不用管是哪個
// 元件、哪個渲染引擎點出來的。
const selected = ref<GraphPocSelection | null>(null)
const domainLabel: Record<GraphNodeType, string> = {
  documentation: 'Documentation',
  technique: 'Technique',
  implementation: 'Implementation',
}

// 路徑查詢結果：null 代表「還沒查/起訖點沒選好」，畫面上不顯示任何路徑相關的東西
// （既不高亮、也不顯示路徑清單或找不到路徑的訊息）。found=false 才是「查過了，
// 但真的沒有路徑」，兩者要分清楚，不能都用 null 表示。
const pathResult = ref<GraphPathDto | null>(null)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <button
        class="rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider"
        :class="mode === '2d' ? 'bg-stone-900 text-white' : 'border-stone-300 text-stone-600'"
        @click="mode = '2d'"
      >
        2D · force-graph
      </button>
      <button
        class="rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider"
        :class="mode === '3d' ? 'bg-stone-900 text-white' : 'border-stone-300 text-stone-600'"
        @click="mode = '3d'"
      >
        3D · 3d-force-graph
      </button>
    </div>

    <GraphPathSearch @result="pathResult = $event" />

    <GraphPoc2D v-if="mode === '2d'" :highlight-path="pathResult" @select="selected = $event" />
    <GraphPoc3D v-else @select="selected = $event" />

    <!-- 捷運路線圖式的路徑清單／找不到路徑的誠實空狀態——GraphPathSearch 起訖點都選
         好才會真的查詢，pathResult 是 null 代表還沒查，這裡不用顯示任何東西。 -->
    <GraphPathDiagram v-if="pathResult" :path="pathResult" />

    <!-- 圖例：色點對顏色，邊樣式對線條，最後一句是操作說明——取代原本一句純文字
         描述配色的散文，讓「這個顏色/這條線代表什麼」有真的視覺對照可查，不用
         自己記文字說明。3D 版另外在畫布裡疊了三片色板 + 浮動文字標籤標示三層，
         這裡的色點圖例同一套顏色，兩邊對得起來。 -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-(--text-ink-muted)">
      <GraphLegendDots />
      <span class="flex items-center gap-1.5"
        ><span class="w-4 h-0 border-t border-(--edge-real)"></span>跨型別真實關聯</span
      >
      <span class="flex items-center gap-1.5"
        ><span class="w-4 h-0 border-t border-dashed border-(--text-accent)"></span>同型別關聯</span
      >
      <span class="ml-auto">hover 節點看直接鄰居・點節點看內容・點連線看關聯定義・拖曳節點調整位置</span>
    </div>

    <!-- 點節點/點連線的詳情面板——GraphPocSelection 是共同格式（見 graphPocData.ts），
         2D/3D 兩版共用同一個面板,不用各自另外刻一份。 -->
    <div
      v-if="selected"
      class="relative text-[12.5px] leading-relaxed border border-(--border-shelf) rounded-xl px-4 py-3 bg-(--bg-paper-light)"
    >
      <button
        type="button"
        class="absolute top-2 right-3 text-(--text-ink-muted) hover:text-(--text-ink-body) cursor-pointer"
        aria-label="關閉"
        @click="selected = null"
      >
        ×
      </button>
      <template v-if="selected.kind === 'node'">
        <p class="font-mono text-[11px] uppercase tracking-wider text-(--text-accent)">{{ domainLabel[selected.domainType] }}</p>
        <p class="text-(--text-ink-body) font-medium">{{ selected.label }}</p>
        <p class="text-(--text-ink-muted)">共 {{ selected.degree }} 條真實關聯</p>
      </template>
      <template v-else>
        <p class="font-mono text-[11px] uppercase tracking-wider text-(--text-accent)">
          {{ selected.linkKind === 'inspiration' ? '同型別關聯' : '跨型別真實關聯' }}
        </p>
        <p class="text-(--text-ink-body) font-medium">{{ selected.sourceLabel }} → {{ selected.targetLabel }}</p>
        <p class="text-(--text-ink-muted)">{{ selected.predicate ?? selected.label ?? '(未命名關聯)' }}</p>
      </template>
    </div>

    <!-- 未完成品標註：跟首頁 KnowledgeGraphPanel.vue 底部同一種 border-dashed 說明框，
         誠實講清楚這頁哪裡是真資料、哪裡只是技術驗證階段留下的近似值 -->
    <p class="text-[12px] leading-relaxed text-(--text-ink-muted) border border-dashed border-(--border-shelf) rounded-xl px-4 py-3">
      <b class="text-(--text-ink-body)">這頁不是完成品：</b>2D／3D 兩版都吃真實
      <code>/api/graph</code> 資料，但欄位形狀是當初「靈感筆記本」情境設計的，套到現在
      documentation/technique/implementation 的本體論上有落差——<code>weight</code>
      用節點 degree 正規化代替，是還算合理的代理指標。配色（依型別的
      <code>--node-doc</code>/<code>--node-tech</code>/<code>--node-impl</code>）、hover/點擊互動、上面的圖例、
      3D 版的三層 Z 軸分層，2026-09-14 起都已經補齊——3D
      版原本靠已知會全部回傳 0 的 <code>daysSinceAccessed</code> 做 Z 軸縱深，三層節點其實疊在同一個
      z=0 平面上，看不出「三層」；改成直接依 documentation/technique/implementation
      三個型別各自固定一個 Z 帶（配上畫布裡的半透明色板＋浮動文字標籤），才是真的三層疊圖，不是同一平面。
      仍然沒對齊的地方：「同型別關聯」這個邊分類單純是「這條邊來自哪張關聯表」的技術區分（pivot 表 vs
      entity_relations），不是原始 POC 設計裡真的語意上的推薦/靈感連結。配色/邊樣式的 CSS token
      跟首頁
      <code>KnowledgeGraphPanel.vue</code> 共用，會跟著全站深色模式切換。首頁的
      <RouterLink to="/" class="text-(--text-accent) hover:underline">知識網路</RouterLink>
      小工具是重新對齊本體論、可以上線的正式版，這頁保留下來純粹是技術驗證階段的歷史產物。
    </p>
  </div>
</template>
