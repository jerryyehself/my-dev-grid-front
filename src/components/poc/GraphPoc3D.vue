<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph'
import { fetchGraphPocData } from '@/data/graphPocData'
import { useTheme } from '@/composables/useTheme'

// 800×520 只是行動裝置量不到容器寬度前的保底值，見 GraphPoc2D.vue 同樣的說明。
const FALLBACK_WIDTH = 800
const FALLBACK_HEIGHT = 520

const container = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref<string | null>(null)
// settling 蓋住鏡頭還沒對焦的收斂過程，見 GraphPoc2D.vue 同樣的說明。
const settling = ref(true)
let graph: ForceGraph3DInstance | undefined
let resizeObserver: ResizeObserver | undefined
let hasZoomedToFit = false

const { theme } = useTheme()

// 顏色改讀 CSS token，見 GraphPoc2D.vue 同樣的說明。
function css(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}

onMounted(async () => {
  let graphPocNodes: Awaited<ReturnType<typeof fetchGraphPocData>>['nodes']
  let graphPocLinks: Awaited<ReturnType<typeof fetchGraphPocData>>['links']
  try {
    ;({ nodes: graphPocNodes, links: graphPocLinks } = await fetchGraphPocData())
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入知識圖譜資料失敗'
    loading.value = false
    return
  }
  loading.value = false
  // v-show 從 display:none 切回可見要等 nextTick 才會真的 flush 到 DOM，見 GraphPoc2D.vue
  // 同樣的說明——不等就量 clientWidth 會量到 0。
  await nextTick()

  if (!container.value) return

  // 量測容器實際寬度（高度維持固定，見 GraphPoc2D.vue 同樣的說明）
  const width = container.value.clientWidth || FALLBACK_WIDTH

  // Z 軸縱深分層：fz 直接固定 z 座標,越久沒讀的筆記退到後面(數值越負離鏡頭越遠)
  const nodes = graphPocNodes.map((n) => ({ ...n, fz: -n.daysSinceAccessed * 1.5 }))
  const links = graphPocLinks.map((l) => ({ ...l }))

  graph = new ForceGraph3D(container.value)
    .width(width)
    .height(FALLBACK_HEIGHT)
    .backgroundColor(css('--canvas-bg'))
    .graphData({ nodes, links })
    .nodeId('id')
    .nodeLabel('label')
    .nodeVal((n) => 2 + (n as { weight: number }).weight * 22)
    .nodeColor((n) => ((n as { weight: number }).weight > 0.6 ? css('--text-accent') : css('--overlay-nodata')))
    .linkColor((l) => ((l as { kind: string }).kind === 'inspiration' ? css('--text-accent') : css('--edge-real')))
    .linkWidth((l) => ((l as { kind: string }).kind === 'inspiration' ? 1.5 : 0.6))
    // 3d-force-graph 沒有原生「虛線」材質,用沿線飄動的粒子近似「靈感對撞機」的動態感
    .linkDirectionalParticles((l) => ((l as { kind: string }).kind === 'inspiration' ? 3 : 0))
    .linkDirectionalParticleSpeed(0.004)
    // 不設的話跑到真正物理收斂要 20 幾秒，見 GraphPoc2D.vue 同樣的說明。
    .cooldownTicks(300)
    // 力模擬收斂後鏡頭自動框住所有節點，見 GraphPoc2D.vue 同樣的說明。3D 版預設
    // 就能拖節點(enableNodeDrag 預設開啟)，放開後一樣會 reheat 模擬再觸發一次
    // onEngineStop，用 hasZoomedToFit 只在第一次收斂時校正鏡頭。
    .onEngineStop(() => {
      if (hasZoomedToFit) return
      hasZoomedToFit = true
      graph?.zoomToFit(400, 40)
      settling.value = false
    })

  // 容器寬度改變時同步更新畫布寬度，見 GraphPoc2D.vue 同樣的說明。
  resizeObserver = new ResizeObserver((entries) => {
    const newWidth = entries[0]?.contentRect.width
    if (newWidth && graph) {
      graph.width(newWidth)
      if (hasZoomedToFit) graph.zoomToFit(0, 40)
    }
  })
  resizeObserver.observe(container.value)
})

// nodeColor/linkColor 是 accessor function，但 three-forcegraph 只在建立/更新材質時
// 呼叫一次，不會像 2D canvas 版本那樣每幀重畫，主題切換要手動 refresh() 才會重新跑一次
// accessor 拿到新的 CSS 變數值；backgroundColor() 也要另外重設，同 GraphPoc2D.vue。
watch(theme, () => {
  graph?.backgroundColor(css('--canvas-bg'))
  graph?.refresh()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  graph?._destructor?.()
})
</script>

<template>
  <div v-if="loading" class="w-full h-[520px] flex items-center justify-center rounded border border-(--border-shelf) bg-(--bg-paper-light) text-xs text-(--text-ink-body)/40">
    載入知識圖譜資料中...
  </div>
  <div v-else-if="error" class="w-full h-[520px] flex items-center justify-center rounded border border-(--border-shelf) bg-(--bg-paper-light) text-xs text-(--text-accent)">
    {{ error }}
  </div>
  <!-- container 用 v-show 而不是 v-if：ref 要在 onMounted 執行前就綁定好，
       loading/error 之間切換時才不會拿到還沒掛載的 DOM 節點 -->
  <div v-show="!loading && !error" class="relative">
    <div ref="container" class="w-full overflow-hidden rounded border border-(--border-shelf)" />
    <div
      v-if="!loading && !error"
      class="absolute inset-0 flex items-end justify-center pb-5 backdrop-blur-sm bg-(--bg-paper-light)/50 transition-opacity duration-700"
      :class="settling ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <span class="font-mono text-[11px] tracking-widest text-(--text-ink-body)/70">// 節點排列中...</span>
    </div>
  </div>
</template>
