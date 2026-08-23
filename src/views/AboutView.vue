<template>
  <div class="w-full space-y-16">
    <!-- 🎬 橫幅：用知識圖譜節點連線圖代替真實照片，呼應站主真正在做的事 -->
    <div class="relative h-[340px] sm:h-[400px] overflow-hidden bg-(--bg-nav-footer) rounded-2xl">
      <svg viewBox="0 0 900 420" preserveAspectRatio="xMidYMid slice" class="absolute inset-0 w-full h-full text-(--text-accent) opacity-50">
        <g stroke="currentColor" stroke-width="1" fill="none" opacity="0.6">
          <line x1="80" y1="90" x2="220" y2="150" />
          <line x1="220" y1="150" x2="180" y2="270" />
          <line x1="220" y1="150" x2="360" y2="110" />
          <line x1="360" y1="110" x2="480" y2="190" />
          <line x1="480" y1="190" x2="420" y2="320" />
          <line x1="480" y1="190" x2="620" y2="150" />
          <line x1="620" y1="150" x2="740" y2="220" />
          <line x1="620" y1="150" x2="700" y2="60" />
          <line x1="360" y1="110" x2="300" y2="30" />
          <line x1="180" y1="270" x2="80" y2="330" />
          <line x1="740" y1="220" x2="830" y2="180" />
        </g>
        <g fill="currentColor">
          <circle cx="80" cy="90" r="4" /><circle cx="220" cy="150" r="6" /><circle cx="180" cy="270" r="3.5" />
          <circle cx="360" cy="110" r="5" /><circle cx="480" cy="190" r="7" /><circle cx="420" cy="320" r="4" />
          <circle cx="620" cy="150" r="6" /><circle cx="740" cy="220" r="4.5" /><circle cx="700" cy="60" r="3" />
          <circle cx="300" cy="30" r="3" /><circle cx="80" cy="330" r="3" /><circle cx="830" cy="180" r="4" />
        </g>
      </svg>
      <div class="absolute inset-0 bg-gradient-to-b from-transparent to-(--bg-nav-footer) [background-position:0_92%]" style="background-image: linear-gradient(180deg, transparent 0%, var(--bg-nav-footer) 92%)"></div>
      <div class="absolute inset-x-0 bottom-0 px-6 sm:px-10 pb-8">
        <div class="font-mono text-[11px] tracking-[0.3em] uppercase text-(--text-accent) font-bold mb-3">About</div>
        <h1 class="text-4xl sm:text-[56px] font-extrabold tracking-tight leading-none text-(--text-nav-footer)">
          Jerry Yeh
        </h1>
        <p class="font-mono text-[13px] tracking-wider text-(--text-nav-footer) opacity-75 mt-2">
          FULL-STACK DEVELOPER &nbsp;·&nbsp; SYSTEM ARCHITECTURE &nbsp;·&nbsp; KNOWLEDGE SYSTEMS
        </p>
      </div>
    </div>

    <!-- 導言：照設計稿用這句，跟原本保留的哲學段落不衝突，只是搶同一個版位，選這句 -->
    <p class="max-w-[760px] mx-auto text-lg sm:text-xl font-semibold leading-[1.7] text-center text-(--text-ink-main)">
      這個網站不是履歷，是外部化的第二個大腦——用來收留還沒想清楚的點子、記錄踩過的坑，把散落的知識重新編目成看得懂的結構。
    </p>

    <!-- Focus Areas -->
    <div>
      <div class="text-center font-mono text-[11px] tracking-[0.2em] uppercase text-(--text-accent) font-bold mb-5">
        Focus Areas
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div
          v-for="area in focusAreas"
          :key="area.title"
          class="border border-(--border-shelf) rounded-xl p-6 bg-(--bg-paper-light)"
        >
          <div class="font-mono text-xs font-bold text-(--text-accent) mb-3">{{ area.index }}</div>
          <h3 class="text-base font-bold text-(--text-ink-main) mb-2">{{ area.title }}</h3>
          <p class="text-[13.5px] leading-relaxed text-(--text-ink-body)">{{ area.desc }}</p>
        </div>
      </div>
    </div>

    <!-- 真實可查核的數字：不放「幾年資歷」這種需要自報的數字，只放算得出來的 -->
    <div class="bg-(--bg-folder) border-y border-(--border-shelf) py-8 -mx-4 sm:-mx-6 px-4 sm:px-6">
      <div class="grid grid-cols-3 max-w-[1040px] mx-auto">
        <div v-for="stat in stats" :key="stat.label" class="text-center border-l border-(--border-shelf) first:border-l-0 px-2">
          <div class="font-mono text-2xl sm:text-3xl font-bold text-(--text-accent) mb-1">{{ stat.value }}</div>
          <div class="text-xs text-(--text-ink-muted)">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <blockquote class="max-w-[760px] mx-auto border-l-2 border-(--text-accent) pl-5 py-1">
      <p class="font-serif italic text-[15px] text-(--text-ink-main) leading-relaxed">
        「凡是具有邏輯規則的重複性工作，皆應被程式化自動清理；凡是存在波動的外部數據，皆能編目為觀測沙盒。」
      </p>
    </blockquote>

    <!-- 知識圖譜：保留原本真的在運作的視覺化，只是拿掉了假掃描的資料庫記錄框架 -->
    <section>
      <div class="mb-6">
        <div class="font-mono text-[11px] tracking-[0.2em] uppercase text-(--text-accent) font-bold mb-1.5">
          // Knowledge Graph
        </div>
        <p class="text-[11px] font-mono text-(--text-ink-muted) max-w-2xl leading-normal">
          基於 W3C RDF/OWL 標準本體論設計的職涯關係圖譜，將實體卡片、自動化工作流與數據沙盒有機聯結。
        </p>
      </div>

      <div
        ref="canvasRef"
        class="relative h-[600px] w-full border border-(--border-shelf) rounded-xl bg-(--bg-paper-light)/40 shadow-inner overflow-hidden"
      >
        <div
          class="absolute inset-0 bg-[radial-gradient(var(--text-ink-muted)_1.2px,transparent_1.2px)] bg-[size:1.5rem_1.5rem] opacity-[0.1] pointer-events-none"
          style="
            mask-image: radial-gradient(circle at 50% 50%, black 50%, transparent 95%);
            -webkit-mask-image: radial-gradient(circle at 50% 50%, black 50%, transparent 95%);
          "
        ></div>
        <svg class="absolute inset-0 w-full h-full pointer-events-none">
          <g v-for="(link, index) in links" :key="index">
            <path
              :d="calculateBezierPath(link)"
              fill="none"
              class="stroke-(--text-ink-muted) opacity-25 stroke-[1.2px] transition-all duration-300"
            />
            <g :transform="`translate(${getCurveCenter(link).x}, ${getCurveCenter(link).y})`">
              <rect :x="-38" :y="-8" :width="76" :height="16" rx="3" fill="var(--bg-paper-light)" class="stroke-(--border-shelf) stroke-[1px]" />
              <text fill="var(--text-accent)" class="text-[8px] font-mono font-bold tracking-wider" text-anchor="middle" dy="3">
                {{ link.predicate }}
              </text>
            </g>
          </g>
        </svg>
        <div
          v-for="node in computedNodes"
          :key="node.id"
          class="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
          :style="{ left: `${node.x}px`, top: `${node.y}px` }"
        >
          <div
            v-if="node.type === 'SUBJECT'"
            class="border border-(--text-accent) bg-gradient-to-br from-(--text-ink-main) to-(--text-ink-body) text-(--bg-paper-light) px-8 py-4 rounded-xl text-center min-w-[200px] shadow-md relative z-10"
          >
            <div class="text-base font-black tracking-widest font-serif">{{ node.label }}</div>
            <span class="text-[8px] bg-(--text-accent)/20 text-(--bg-paper-light) py-0.5 px-2 mt-1.5 inline-block rounded border border-(--text-accent)/30 font-mono tracking-wider">
              {{ node.role }}
            </span>
          </div>
          <div
            v-else
            class="border border-(--border-shelf) bg-(--bg-paper-light)/95 backdrop-blur-md px-4 py-3.5 w-[230px] sm:w-[250px] rounded-xl shadow-xs hover:border-(--text-accent) hover:shadow-md transition-all duration-300"
          >
            <div class="flex items-center justify-between border-b border-(--border-shelf) pb-1 mb-1.5 text-[8px] font-mono font-bold text-(--text-ink-muted) opacity-70">
              <span>{{ node.id.toUpperCase() }}_INDEX</span>
              <span class="w-1.5 h-1.5 rounded-full ring-2 ring-(--bg-paper-light) shadow-xs" :class="node.statusColor"></span>
            </div>
            <h3 class="text-xs font-bold text-(--text-ink-main) font-serif tracking-wide">
              <a v-if="node.url" :href="node.url" target="_blank" class="hover:underline inline-flex items-center gap-0.5">
                {{ node.label }} <span class="text-[9px] opacity-60">↗</span>
              </a>
              <span v-else>{{ node.label }}</span>
            </h3>
            <p class="text-[11px] text-(--text-ink-body) opacity-85 !mt-1 !mb-0 leading-normal text-justify">
              {{ node.desc }}
            </p>
            <div v-if="node.tags" class="mt-2 flex flex-wrap gap-1">
              <span v-for="tag in node.tags" :key="tag" class="text-[8px] bg-(--bg-folder) border border-(--border-shelf) text-(--text-ink-body) px-1.5 py-0.5 rounded font-mono">
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <div class="rounded-2xl bg-(--bg-nav-footer) border border-(--border-shelf) px-8 py-10 flex flex-col items-center text-center gap-6">
      <div>
        <h4 class="text-lg font-bold font-serif text-(--text-nav-footer) mb-2">
          準備好翻開全新系統架構的篇章了嗎？
        </h4>
        <p class="text-xs text-(--text-nav-footer) opacity-70 font-mono">
          歡迎透過安全郵務網關或 GitHub 檔案庫與我建立聯結。
        </p>
      </div>
      <div class="flex gap-3 w-full justify-center max-w-xs">
        <a
          href="https://github.com/jerryyehself"
          target="_blank"
          class="flex-1 text-center px-4 py-2.5 border border-(--text-nav-footer)/25 hover:border-(--text-nav-footer) rounded-lg text-xs font-mono transition-all text-(--text-nav-footer)"
        >
          Archive ↗
        </a>
        <a
          href="mailto:jerry.yeh@example.com"
          class="flex-1 text-center px-4 py-2.5 bg-(--text-accent) hover:bg-(--text-accent)/90 text-(--bg-nav-footer) font-bold rounded-lg text-xs font-mono transition-all"
        >
          Dispatch Mail ✉
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { articles } from '@/data/articles'
import { projects } from '@/data/projects'

const focusAreas = [
  {
    index: '01',
    title: '後端系統架構',
    desc: 'Laravel Framework（v8/v9）為主，設計多表非同步清理排程與 Task Scheduler，把重複、規則明確的工作程式化自動清理。',
  },
  {
    index: '02',
    title: '響應式前端流程',
    desc: 'Vue 3 與 Nuxt Engine 驅動的資料流開發，把互動邏輯跟視覺回饋收斂到清楚的責任邊界，讓介面經得起長期修改。',
  },
  {
    index: '03',
    title: '自動化資料管線',
    desc: '串接 Google Apps Script 打造無伺服器工作流——ISBN 掃描器的圖書編目、黃金存摺牌價觀測都是同一套思路的實踐。',
  },
]

const stats = computed(() => [
  { value: String(articles.length), label: '篇文章' },
  { value: String(projects.length), label: '個專案' },
  { value: '2026.01', label: '全端資歷起點' },
])

const canvasRef = ref<HTMLElement | null>(null)
const canvasWidth = ref(1000)
const canvasHeight = ref(600)

const nodes = ref([
  {
    id: 'me',
    label: 'Jerry Yeh',
    type: 'SUBJECT',
    role: 'System Archivist & Dev',
    xRatio: 0.5,
    yRatio: 0.5,
  },
  {
    id: 'github',
    label: 'GitHub Repository',
    desc: '託管核心開源組件與編目版本。包含 isbn-scanner 原始碼及 GAS 自動化腳本組態。',
    url: 'https://github.com/jerryyehself',
    statusColor: 'bg-amber-950',
    xRatio: 0.18,
    yRatio: 0.22,
  },
  {
    id: 'email',
    label: 'Secure Mail Gateway',
    desc: '網域安全路由通訊點。主要用於系統自動化排程報告接收、錯誤日誌警告通知與外部合作對接。',
    url: 'mailto:jerry.yeh@example.com',
    statusColor: 'bg-yellow-700',
    xRatio: 0.82,
    yRatio: 0.22,
  },
  {
    id: 'skills',
    label: 'Engineering Stack',
    desc: '深度聚焦於後端 Laravel 核心架構（任務排程與優化）與前端 Vue 3 響應式資料驅動開發。',
    tags: ['Laravel9', 'Vue3', 'GAS'],
    statusColor: 'bg-amber-800',
    xRatio: 0.18,
    yRatio: 0.78,
  },
  {
    id: 'sandbox',
    label: 'Data Sandbox (Gold Passbook)',
    desc: '非線性數據觀測沙盒。串接後端自動化工作流，系統化編目並分析黃金存摺牌價波動率與個人資產配置。',
    statusColor: 'bg-amber-600',
    xRatio: 0.82,
    yRatio: 0.78,
  },
])

const links = ref([
  { sourceId: 'me', targetId: 'github', predicate: 'owl:sameAs', curveDirection: -1 },
  { sourceId: 'me', targetId: 'email', predicate: 'schema:email', curveDirection: 1 },
  { sourceId: 'me', targetId: 'skills', predicate: 'schema:knowsAbout', curveDirection: 1 },
  { sourceId: 'me', targetId: 'sandbox', predicate: 'schema:interest', curveDirection: -1 },
])

const computedNodes = computed(() => {
  return nodes.value.map((node) => {
    const isMobile = canvasWidth.value < 640
    let adjustedXRatio = node.xRatio
    if (isMobile) {
      if (node.xRatio < 0.3) adjustedXRatio = 0.12
      if (node.xRatio > 0.7) adjustedXRatio = 0.88
    }
    return {
      ...node,
      x: adjustedXRatio * canvasWidth.value,
      y: node.yRatio * canvasHeight.value,
    }
  })
})

let resizeObserver: ResizeObserver | null = null
const updateCanvasSize = () => {
  if (canvasRef.value) {
    canvasWidth.value = canvasRef.value.clientWidth
    canvasHeight.value = canvasRef.value.clientHeight
  }
}

onMounted(() => {
  updateCanvasSize()
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
    })
    resizeObserver.observe(canvasRef.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver && canvasRef.value) {
    resizeObserver.unobserve(canvasRef.value)
  }
})

interface GraphLink {
  sourceId: string
  targetId: string
  curveDirection: number
}

const calculateBezierPath = (link: GraphLink) => {
  const source = computedNodes.value.find((n) => n.id === link.sourceId)
  const target = computedNodes.value.find((n) => n.id === link.targetId)
  if (!source || !target) return ''
  const dx = target.x - source.x
  const cp1x = source.x + dx * 0.4
  const cp1y = source.y + link.curveDirection * 40
  const cp2x = source.x + dx * 0.6
  const cp2y = target.y - link.curveDirection * 40
  return `M ${source.x} ${source.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${target.x} ${target.y}`
}

const getCurveCenter = (link: GraphLink) => {
  const source = computedNodes.value.find((n) => n.id === link.sourceId)
  const target = computedNodes.value.find((n) => n.id === link.targetId)
  if (!source || !target) return { x: 0, y: 0 }
  const dx = target.x - source.x
  const cp1x = source.x + dx * 0.4
  const cp1y = source.y + link.curveDirection * 40
  const cp2x = source.x + dx * 0.6
  const cp2y = target.y - link.curveDirection * 40
  const t = 0.5
  const mt = 1 - t
  const x =
    mt * mt * mt * source.x + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * target.x
  const y =
    mt * mt * mt * source.y + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * target.y
  return { x, y }
}
</script>
