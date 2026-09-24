<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import ForceGraph3D, { type ForceGraph3DInstance, type NodeObject, type LinkObject } from '3d-force-graph'
import * as THREE from 'three'
import { fetchGraphPocData, type GraphPocNode, type GraphPocLink, type GraphPocSelection } from '@/data/graphPocData'
import { useTheme } from '@/composables/useTheme'

// 800×520 只是行動裝置量不到容器寬度前的保底值，見 GraphPoc2D.vue 同樣的說明。
const FALLBACK_WIDTH = 800
const FALLBACK_HEIGHT = 520

type SimNode = GraphPocNode & NodeObject
// Omit source/target：見 GraphPoc2D.vue 同樣的說明——不 Omit 的話交集型別會把
// source/target 收斂成只剩字串，typeof l.source === 'object' 分支會被 TS 判成 never。
type SimLink = Omit<GraphPocLink, 'source' | 'target'> & LinkObject<SimNode>

const emit = defineEmits<{ select: [selection: GraphPocSelection]; demo: [isDemo: boolean] }>()

const container = ref<HTMLDivElement>()
const loading = ref(true)
const error = ref<string | null>(null)
// settling 蓋住鏡頭還沒對焦的收斂過程，見 GraphPoc2D.vue 同樣的說明。
const settling = ref(true)
let graph: ForceGraph3DInstance<SimNode, SimLink> | undefined
let resizeObserver: ResizeObserver | undefined
let hasZoomedToFit = false

const { theme } = useTheme()

// 顏色改讀 CSS token，見 GraphPoc2D.vue 同樣的說明。
function css(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}

// 配色依 domainType，同 GraphPoc2D.vue 的 nodeColorVar()——兩個元件分開維護同一份小
// 對照表，跟這兩個檔案一路以來「各自獨立、靠註解互相參照」的慣例一致，沒有抽共用檔。
function nodeColorVar(domainType: GraphPocNode['domainType']): string {
  return domainType === 'documentation' ? '--node-doc' : domainType === 'technique' ? '--node-tech' : '--node-impl'
}
function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
// WebGL 材質的顏色字串不像 2D canvas 吃 rgba() 透明度(three.js 的 Color 解析 rgba()
// 字串會直接丟掉 alpha 通道，透明度不會生效)，「淡化」改成把顏色往背景色混，keep 越
// 小代表混得越接近背景、看起來越淡——這是跟 2D 版 withAlpha() 效果對應但實作手法不同
// 的淡化方式，兩邊都是「視覺上變不明顯」，只是受各自渲染管線限制走不同路徑。
function blendTowardBg(hex: string, keep: number): string {
  const [r1, g1, b1] = hexToRgb(hex)
  const [r2, g2, b2] = hexToRgb(css('--canvas-bg'))
  const r = Math.round(r1 * keep + r2 * (1 - keep))
  const g = Math.round(g1 * keep + g2 * (1 - keep))
  const b = Math.round(b1 * keep + b2 * (1 - keep))
  return `rgb(${r},${g},${b})`
}

// hover 提亮鄰居／淡化其餘，同 GraphPoc2D.vue 的 hoveredNodeId/neighborIds 段落——
// 這裡是 3D 版，nodeColor/linkColor accessor 不會每幀自動重算，onNodeHover 換人時
// 要手動觸發一次 graph.refresh() 才會套用新的顏色/淡化狀態。
let hoveredNodeId: string | null = null
let neighborIds = new Map<string, Set<string>>()
function endpointId(x: string | number | SimNode | undefined): string {
  if (x == null) return ''
  return typeof x === 'object' ? x.id : String(x)
}
function linkTouchesHovered(l: SimLink): boolean {
  return hoveredNodeId != null && (endpointId(l.source) === hoveredNodeId || endpointId(l.target) === hoveredNodeId)
}
function isDimmedNode(id: string): boolean {
  if (!hoveredNodeId) return false
  if (id === hoveredNodeId) return false
  return !neighborIds.get(hoveredNodeId)?.has(id)
}

// 三層各自固定一個 Z 帶（documentation 最靠近鏡頭、technique 中間、implementation
// 最遠），取代原本壞掉的 daysSinceAccessed（後端一律回傳 0，見 graphPocData.ts
// 檔頭說明，三層節點會全部疊在同一個 z=0 平面上，看不出「三層」）。fz 只鎖 z 座標，
// x/y 仍然交給力模擬自由分佈——同一層內部照樣看得出誰跟誰連得比較近，只是三層
// 整體在鏡頭方向上被拉開，才是使用者要的「真的疊在不同 Z 軸」，不是同一個平面。
const Z_LAYER_GAP = 260
function zForType(domainType: GraphPocNode['domainType']): number {
  if (domainType === 'documentation') return Z_LAYER_GAP
  if (domainType === 'implementation') return -Z_LAYER_GAP
  return 0
}

// 每層一片半透明色板 + 一個浮動文字標籤，讓「這是三個分開的 Z 層」不用等使用者自己
// 腦補、轉動鏡頭比對節點位置才看得出來——色板本身也用來標示層的顏色跟圖例對上。
const LAYER_PLANE_SIZE = 900
const LAYER_ORDER: GraphPocNode['domainType'][] = ['documentation', 'technique', 'implementation']
const LAYER_LABEL: Record<GraphPocNode['domainType'], string> = {
  documentation: 'Documentation',
  technique: 'Technique',
  implementation: 'Implementation',
}
let layerVisuals: { plane: THREE.Mesh; sprite: THREE.Sprite; domainType: GraphPocNode['domainType'] }[] = []

function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const fontSize = 48
  ctx.font = `bold ${fontSize}px sans-serif`
  const textWidth = ctx.measureText(text).width
  canvas.width = textWidth + 24
  canvas.height = fontSize * 1.5
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 12, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  const scale = 0.24
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1)
  return sprite
}

function buildLayerVisuals(scene: THREE.Scene) {
  for (const v of layerVisuals) {
    scene.remove(v.plane)
    scene.remove(v.sprite)
  }
  layerVisuals = []
  for (const domainType of LAYER_ORDER) {
    const z = zForType(domainType)
    const colorHex = css(nodeColorVar(domainType))
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(LAYER_PLANE_SIZE, LAYER_PLANE_SIZE),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }),
    )
    plane.position.set(0, 0, z)
    scene.add(plane)

    const sprite = makeLabelSprite(LAYER_LABEL[domainType], colorHex)
    sprite.position.set(-LAYER_PLANE_SIZE / 2 + 60, LAYER_PLANE_SIZE / 2 - 40, z + 2)
    scene.add(sprite)

    layerVisuals.push({ plane, sprite, domainType })
  }
}

function refreshLayerColors() {
  for (const v of layerVisuals) {
    const colorHex = css(nodeColorVar(v.domainType))
    ;(v.plane.material as THREE.MeshBasicMaterial).color.set(colorHex)
  }
}

onMounted(async () => {
  let graphPocNodes: GraphPocNode[]
  let graphPocLinks: GraphPocLink[]
  try {
    const { nodes, links, isDemo } = await fetchGraphPocData()
    graphPocNodes = nodes
    graphPocLinks = links
    emit('demo', isDemo)
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

  const nodes: SimNode[] = graphPocNodes.map((n) => ({ ...n, fz: zForType(n.domainType) }))
  const links: SimLink[] = graphPocLinks.map((l) => ({ ...l }))

  neighborIds = new Map()
  for (const l of links) {
    const s = endpointId(l.source)
    const t = endpointId(l.target)
    if (!neighborIds.has(s)) neighborIds.set(s, new Set())
    if (!neighborIds.has(t)) neighborIds.set(t, new Set())
    neighborIds.get(s)!.add(t)
    neighborIds.get(t)!.add(s)
  }

  // 3d-force-graph 的 default export 是宣告成固定型別的 const（IForceGraph3D，
  // 不是像 force-graph 的 ForceGraph 那樣宣告成泛型 class），沒辦法像 GraphPoc2D.vue
  // 的 `new ForceGraph<SimNode, SimLink>(...)` 那樣直接帶型別參數建構——用一次性的
  // 邊界轉型換回正確型別，換取下面整條鏈式呼叫（nodeColor/onNodeClick 等）都能拿到
  // 正確的 SimNode/SimLink 型別，不用每個 callback 各自寫 `as {...}` 局部轉型。
  const graph3d = new ForceGraph3D(container.value) as unknown as ForceGraph3DInstance<SimNode, SimLink>
  graph = graph3d
    .width(width)
    .height(FALLBACK_HEIGHT)
    .backgroundColor(css('--canvas-bg'))
    .graphData({ nodes, links })
    .nodeId('id')
    .nodeLabel('label')
    .nodeVal((n) => 2 + n.weight * 22)
    .nodeColor((n) => {
      const base = css(nodeColorVar(n.domainType))
      if (n.id === hoveredNodeId || !isDimmedNode(n.id)) return base
      return blendTowardBg(base, 0.15)
    })
    .linkColor((l) => {
      const base = l.kind === 'inspiration' ? css('--text-accent') : css('--edge-real')
      if (hoveredNodeId) return linkTouchesHovered(l) ? css('--text-accent') : blendTowardBg(base, 0.12)
      return base
    })
    .linkWidth((l) => {
      if (hoveredNodeId && linkTouchesHovered(l)) return 2.2
      return l.kind === 'inspiration' ? 1.5 : 0.6
    })
    // 3d-force-graph 沒有原生「虛線」材質,用沿線飄動的粒子近似「靈感對撞機」的動態感，
    // hover 到的鄰居邊額外加密粒子當提示。
    .linkDirectionalParticles((l) => {
      if (hoveredNodeId && linkTouchesHovered(l)) return 5
      return l.kind === 'inspiration' ? 3 : 0
    })
    .linkDirectionalParticleSpeed(0.004)
    .onNodeHover((n) => {
      const nextId = n?.id ?? null
      if (nextId === hoveredNodeId) return
      hoveredNodeId = nextId
      graph?.refresh()
    })
    .onNodeClick((n) =>
      emit('select', {
        kind: 'node',
        id: n.id,
        label: n.label,
        domainType: n.domainType,
        weight: n.weight,
        degree: neighborIds.get(n.id)?.size ?? 0,
      }),
    )
    .onLinkClick((l) =>
      emit('select', {
        kind: 'link',
        sourceLabel: (typeof l.source === 'object' ? l.source.label : nodes.find((n) => n.id === l.source)?.label) ?? String(l.source),
        targetLabel: (typeof l.target === 'object' ? l.target.label : nodes.find((n) => n.id === l.target)?.label) ?? String(l.target),
        linkKind: l.kind,
        predicate: l.predicate,
        label: l.label,
      }),
    )
    // 不設的話跑到真正物理收斂要 20 幾秒，見 GraphPoc2D.vue 同樣的說明。
    .cooldownTicks(300)
    // 力模擬收斂後鏡頭自動框住所有節點，見 GraphPoc2D.vue 同樣的說明。3D 版預設
    // 就能拖節點(enableNodeDrag 預設開啟)，放開後一樣會 reheat 模擬再觸發一次
    // onEngineStop，用 hasZoomedToFit 只在第一次收斂時校正鏡頭。zoomToFit 只框
    // 節點座標，三層的 Z 帶距離夠開時鏡頭會自動拉遠到能同時看到三層都在畫面內。
    .onEngineStop(() => {
      if (hasZoomedToFit) return
      hasZoomedToFit = true
      graph?.zoomToFit(400, 40)
      settling.value = false
    })

  buildLayerVisuals(graph.scene())

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
// 層板/標籤是額外手動加進 scene 的物件，不在 refresh() 管的範圍內，要另外重上色。
watch(theme, () => {
  graph?.backgroundColor(css('--canvas-bg'))
  graph?.refresh()
  refreshLayerColors()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  graph?._destructor?.()
})
</script>

<template>
  <BaseLoadingBlock v-if="loading" height="520px">// LOADING_GRAPH...</BaseLoadingBlock>
  <BaseLoadingBlock v-else-if="error" height="520px" tone="error">{{ error }}</BaseLoadingBlock>
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
