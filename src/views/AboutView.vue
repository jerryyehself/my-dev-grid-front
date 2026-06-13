<template>
  <div class="about-me-container w-full font-sans antialiased selection:bg-(--text-accent)/10">
    <div class="w-full space-y-16">
      <header class="w-full pb-8 border-b border-(--border-shelf) relative">
        <div
          class="flex flex-col gap-2 mb-6 text-[10px] font-mono tracking-widest text-(--text-ink-muted)"
        >
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-(--text-accent)/80 rounded-xs"></span>
            <span class="text-(--text-accent) uppercase">// AMBIENT ARCHIVE: METADATA CONTEXT</span>
          </div>
          <div
            class="bg-(--bg-folder) border border-(--border-shelf) px-2 py-0.5 rounded text-(--text-accent) self-start"
          >
            SYS_REF: QA.903.Y34_2026
          </div>
        </div>

        <h1
          class="text-3xl sm:text-4xl font-black text-(--text-ink-main) tracking-tight leading-tight font-serif"
        >
          在變動的數據沙盒中，<br class="sm:hidden" />編目穩健的<span
            class="font-sans text-(--text-accent) italic tracking-wide font-normal"
            >邏輯與實體模型</span
          >
        </h1>
      </header>

      <AuthorAuthorityCard name="Jerry Yeh" birthYear="199x" avatarUrl="/path-to-your-avatar.jpg" />

      <div class="w-full space-y-4">
        <div class="flex items-center gap-1.5 mb-2">
          <span class="text-xs font-mono text-(--text-accent)">01 /</span>
          <span class="text-xs font-mono tracking-widest text-(--text-ink-muted) uppercase"
            >PHILOSOPHY</span
          >
        </div>
        <div
          class="text-sm sm:text-base leading-relaxed text-justify opacity-95 font-serif text-(--text-ink-main) px-1"
        >
          <p class="indent-8">
            對我而言，漫步於圖書館的實木書架間，與在終端機前梳理複雜的資料庫模型，在本質上是完全同構的體驗。兩者皆是在龐雜、無序的實體宇宙中，利用<strong
              >受控詞表（Controlled Vocabulary）</strong
            >與結構化架構，為人類的意圖尋找最精準的定位。
          </p>
        </div>
      </div>

      <div class="w-full space-y-6">
        <div class="flex items-center gap-1.5 mb-2">
          <span class="text-xs font-mono text-(--text-accent)">01.B /</span>
          <span class="text-xs font-mono tracking-widest text-(--text-ink-muted) uppercase"
            >PROJECT REGISTRY (子項權威控制)</span
          >
        </div>

        <div class="space-y-4 w-full">
          <LibraryIndexCard
            title="工程履約管理系統 (Engineering Contract Management)"
            indexRef="SYS_01"
            callNumber="005.13 / CONTRACT"
            date="2026"
            :tags="['Laravel 9', 'Async Queue Workers', 'Database Optimization']"
          >
            針對大型履約系統的異步清理機制進行深度重構。利用 Laravel 9 底層的 Task Scheduler
            與任務監聽器，打造強健的多表軟刪除自動清理排程，成功優化長期積壓的資料庫效能瓶頸。
          </LibraryIndexCard>

          <LibraryIndexCard
            title="isbn-scanner 條碼管理工程"
            indexRef="APP_02"
            callNumber="025.34 / SCAN"
            date="2026"
            :tags="['Vue 3 / Nuxt', 'Google Apps Script', 'Camera API']"
          >
            以「將前端視為響應式流動」的核心思維設計的書籍條碼掃描管理工具。前端採用 Vue 3 / Nuxt
            驅動相機硬體，後端大膽串接 Google Apps Script (GAS) 作為極輕量資料緩衝與 Sheets
            同步網關，落實無伺服器（Serverless）的快速編目工作流。
          </LibraryIndexCard>

          <LibraryIndexCard
            title="黃金存摺數據觀測沙盒 (Gold Passbook Sandbox)"
            indexRef="SANDBOX_03"
            callNumber="332.63 / GOLD"
            date="2026"
            :tags="['Data Pipeline', 'Automation', 'Asset Allocation']"
          >
            將個人理財視為非線性數據的實驗場。建立自動化腳本定期追蹤銀行買賣匯率與金價波動，透過資料管道（Data
            Pipeline）進行清洗與歷史資產配置比重分析，將外部波動數據轉化為系統化的編目報表。
          </LibraryIndexCard>
        </div>

        <div class="mt-6 p-4 border-l border-(--text-accent) bg-(--bg-paper-light)/20">
          <p
            class="text-xs font-serif italic text-(--text-ink-muted) leading-relaxed pl-2 text-justify"
          >
            “凡是具有邏輯規則的重複性工作，皆應被程式化、自動化；凡是存在波動的外部數據，皆能成為系統迭代的觀測沙盒。”
          </p>
        </div>
      </div>

      <section
        class="w-full p-6 border border-(--border-shelf) rounded-2xl bg-(--bg-paper-light)/10 backdrop-blur-xs relative"
      >
        <div class="flex flex-col border-b border-(--border-shelf) pb-4 mb-6 gap-3">
          <div>
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-xs font-mono text-(--text-accent)">02 /</span>
              <span class="text-xs font-mono tracking-widest text-(--text-ink-muted) uppercase"
                >BIBLIOGRAPHIC GRAPH</span
              >
            </div>
            <BaseHeading
              level="h2"
              class="!text-xl !font-bold !my-0 text-(--text-ink-main) font-serif"
            >
              Semantic Knowledge Graph
            </BaseHeading>
          </div>
          <p
            class="text-[11px] font-mono text-(--text-ink-muted) max-w-2xl leading-normal text-justify"
          >
            基於 W3C RDF/OWL
            標準本體論設計的職涯關係圖譜。如同圖書館內的交叉索引（Cross-reference），將實體卡片、自動化工作流與數據沙盒有機聯結。
          </p>
        </div>

        <div
          ref="canvasRef"
          class="relative h-[600px] w-full border border-(--border-shelf) rounded-xl bg-(--bg-paper-light)/40 shadow-inner overflow-hidden transition-all duration-300"
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
                <rect
                  :x="-38"
                  :y="-8"
                  :width="76"
                  :height="16"
                  rx="3"
                  fill="var(--bg-paper-light)"
                  class="stroke-(--border-shelf) stroke-[1px]"
                />
                <text
                  fill="var(--text-accent)"
                  class="text-[8px] font-mono font-bold tracking-wider"
                  text-anchor="middle"
                  dy="3"
                >
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
              <span
                class="text-[8px] bg-(--text-accent)/20 text-(--bg-paper-light) py-0.5 px-2 mt-1.5 inline-block rounded border border-(--text-accent)/30 font-mono tracking-wider"
                >{{ node.role }}</span
              >
            </div>
            <div
              v-else
              class="border border-(--border-shelf) bg-(--bg-paper-light)/95 backdrop-blur-md px-4 py-3.5 w-[230px] sm:w-[250px] rounded-xl shadow-xs hover:border-(--text-accent) hover:shadow-md transition-all duration-300"
            >
              <div
                class="flex items-center justify-between border-b border-(--border-shelf) pb-1 mb-1.5 text-[8px] font-mono font-bold text-(--text-ink-muted) opacity-70"
              >
                <span>{{ node.id.toUpperCase() }}_INDEX</span>
                <span
                  class="w-1.5 h-1.5 rounded-full ring-2 ring-(--bg-paper-light) shadow-xs"
                  :class="node.statusColor"
                ></span>
              </div>
              <h3 class="text-xs font-bold text-(--text-ink-main) font-serif tracking-wide">
                <a
                  v-if="node.url"
                  :href="node.url"
                  target="_blank"
                  class="hover:underline inline-flex items-center gap-0.5"
                  >{{ node.label }} <span class="text-[9px] opacity-60">↗</span></a
                >
                <span v-else>{{ node.label }}</span>
              </h3>
              <p
                class="text-[11px] text-(--text-ink-body) opacity-85 !mt-1 !mb-0 leading-normal text-justify"
              >
                {{ node.desc }}
              </p>
              <div v-if="node.tags" class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="tag in node.tags"
                  :key="tag"
                  class="text-[8px] bg-(--bg-folder) border border-(--border-shelf) text-(--text-ink-body) px-1.5 py-0.5 rounded font-mono"
                  >#{{ tag }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer class="w-full border-t border-(--border-shelf) pt-12">
        <div class="mb-6">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="text-xs font-mono text-(--text-accent)">03 /</span>
            <span class="text-xs font-mono tracking-widest text-(--text-ink-muted) uppercase"
              >RUNTIME INDEX MATRIX</span
            >
          </div>
          <BaseHeading
            level="h2"
            class="!text-xl !font-bold !my-0 text-(--text-ink-main) font-serif"
            >Core Engineering Competencies</BaseHeading
          >
          <p class="text-xs text-(--text-ink-muted) mt-1.5">
            基於受控詞表的技術能力矩陣分類，提供結構化的實戰履歷編目：
          </p>
        </div>

        <div
          class="p-6 border border-dashed border-(--border-shelf) rounded-xl bg-(--bg-paper-light)/10 text-center text-xs font-mono text-(--text-ink-muted) mb-12 w-full"
        >
          [ 插入能力矩陣表格或組件 ]
        </div>

        <div
          class="p-8 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 text-(--bg-paper-light) flex flex-col items-center text-center gap-6 shadow-xl relative overflow-hidden w-full"
        >
          <div
            class="absolute -bottom-10 -left-10 w-40 h-40 bg-(--text-accent)/5 rounded-full blur-2xl pointer-events-none"
          ></div>
          <div>
            <h4 class="text-base sm:text-lg font-bold font-serif text-white mb-2 tracking-wide">
              準備好翻開全新系統架構的篇章了嗎？
            </h4>
            <p class="text-xs text-neutral-400 font-mono">
              歡迎透過安全郵務網關或 GitHub 檔案庫與我建立聯結。
            </p>
          </div>
          <div class="flex gap-3 shrink-0 w-full justify-center max-w-xs">
            <a
              href="https://github.com/jerryyehself"
              target="_blank"
              class="flex-1 text-center px-4 py-2.5 border border-white/20 hover:border-white rounded-lg text-xs font-mono transition-all text-white bg-white/5 backdrop-blur-xs"
              >Archive ↗</a
            >
            <a
              href="mailto:jerry.yeh@example.com"
              class="flex-1 text-center px-4 py-2.5 bg-(--text-accent) hover:bg-(--text-accent)/90 text-white font-bold rounded-lg text-xs font-mono shadow-sm transition-all"
              >Dispatch Mail ✉</a
            >
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import BaseHeading from '@/components/ui/BaseHeading.vue'
import AuthorAuthorityCard from '@/components/about/AuthorAuthorityCard.vue'
import LibraryIndexCard from '@/components/ui/LibraryIndexCard.vue' // 引入分項編目卡元件

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

const calculateBezierPath = (link: any) => {
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

const getCurveCenter = (link: any) => {
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
