<template>
  <div
    class="max-w-5xl mx-auto py-12 px-4 bg-slate-50 text-slate-800 min-h-screen font-sans relative overflow-hidden select-none"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] bg-[size:2rem_2rem] opacity-70 pointer-events-none"
    ></div>

    <header class="relative z-10 pb-6 max-w-xl mb-6 text-left">
      <span
        class="text-[10px] bg-indigo-50 text-indigo-600 font-semibold tracking-wider px-2 py-0.5 rounded-full border border-indigo-100"
      >
        STATIC_SEMANTIC_MESH
      </span>
      <h1 class="text-2xl font-bold mt-2 tracking-tight text-slate-900">Jerry's Knowledge Space</h1>
      <p class="text-xs text-slate-400 mt-1 font-mono">// 確定性拓撲結構：精準定位語義資源</p>
    </header>

    <div
      class="relative z-10 h-[720px] w-full border border-slate-200 rounded-2xl bg-white/70 backdrop-blur-md shadow-[0_12px_40px_rgb(0,0,0,0.03)] overflow-hidden"
    >
      <svg class="absolute inset-0 w-full h-full pointer-events-none">
        <g v-for="(link, index) in links" :key="index">
          <path
            :d="calculateBezierPath(link)"
            fill="none"
            class="stroke-slate-300 transition-all duration-300 hover:stroke-indigo-400"
            :class="
              link.style === 'dashed' ? 'stroke-dasharray-[5,5] stroke-[1.2px]' : 'stroke-[1.8px]'
            "
          />

          <g :transform="`translate(${getCurveCenter(link).x}, ${getCurveCenter(link).y})`">
            <rect
              :x="-40"
              :y="-9"
              :width="80"
              :height="18"
              rx="6"
              fill="#ffffff"
              class="stroke-slate-200 stroke-[1px] shadow-sm"
            />
            <text
              fill="#4f46e5"
              class="text-[9px] font-mono font-bold tracking-tight"
              text-anchor="middle"
              dy="3.5"
            >
              {{ link.predicate }}
            </text>
          </g>
        </g>
      </svg>

      <div
        v-for="node in nodes"
        :key="node.id"
        class="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
        :style="{ left: `${node.x}px`, top: `${node.y}px` }"
      >
        <div
          v-if="node.type === 'SUBJECT'"
          class="border border-indigo-500 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-8 py-5 rounded-xl text-center min-w-[220px] shadow-[0_20px_35px_-5px_rgba(79,70,229,0.3)] hover:scale-102 transition-transform duration-300"
        >
          <div
            class="text-[9px] text-indigo-200 font-mono tracking-widest uppercase font-bold opacity-90"
          >
            // CENTRAL_SUBJECT
          </div>
          <h2 class="text-xl font-bold tracking-tight mt-1">{{ node.label }}</h2>
          <span
            class="text-[9px] bg-indigo-500/50 text-indigo-500 py-0.5 px-2.5 mt-2.5 inline-block rounded-md border border-indigo-400/30 font-mono text-white"
          >
            {{ node.role }}
          </span>
        </div>

        <div
          v-else
          class="border border-slate-200 bg-white/95 px-5 py-4 w-[260px] rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.02)] hover:border-indigo-400 hover:shadow-[0_10px_30px_rgba(79,70,229,0.08)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <div class="flex items-center justify-between border-b border-slate-50 pb-1.5 mb-2">
            <span class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider"
              >{{ node.id.toUpperCase() }}_ENTITY</span
            >
            <span class="w-2 h-2 rounded-full" :class="node.statusColor"></span>
          </div>

          <h3 class="text-xs font-bold text-slate-800 font-sans tracking-tight">
            {{ node.label }}
          </h3>
          <p class="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{{ node.desc }}</p>

          <div v-if="node.tags" class="mt-3 flex flex-wrap gap-1">
            <span
              v-for="tag in node.tags"
              :key="tag"
              class="text-[9px] bg-slate-50 border border-slate-150 text-slate-500 px-1.5 py-0.5 rounded font-mono"
            >
              {{ tag }}
            </span>
          </div>

          <div v-if="node.url" class="mt-4 pt-2 border-t border-slate-100 flex justify-end">
            <a
              :href="node.url"
              target="_blank"
              class="text-[10px] font-mono font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 transition-colors"
            >
              RESOLVE_URI ↗
            </a>
          </div>
        </div>
      </div>
    </div>

    <footer class="mt-6 text-[10px] font-mono text-slate-400 text-center tracking-wide">
      Deterministic Topology Mesh // Designed with SVG Cubic Bezier Curves // 2026
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 1. 完全釘死位置的節點（基於 960x720 畫布進行幾何對稱分布）
const nodes = ref([
  // 中央主體
  { id: 'me', label: 'Jerry Yeh', type: 'SUBJECT', role: 'Full-Stack Developer', x: 480, y: 360 },

  // 左上：GitHub 實體
  {
    id: 'github',
    label: 'GitHub Repository',
    desc: '託管核心開源組件與版本控制歷史。包含 isbn-scanner 掃描器原始碼及 GAS 自動化腳本組態。',
    url: 'https://github.com/jerryyehself',
    statusColor: 'bg-slate-800',
    x: 180,
    y: 160,
  },

  // 右上：Email 通訊
  {
    id: 'email',
    label: 'Secure Mail Gateway',
    desc: '網域安全路由通訊點。主要用於系統自動化排程報告接收、錯誤日誌（Log）警告通知以及低阻力商務對接。',
    url: 'mailto:jerry.yeh@example.com',
    statusColor: 'bg-blue-400',
    x: 780,
    y: 160,
  },

  // 左下：技術架構（受控詞表）
  {
    id: 'skills',
    label: 'Engineering Stack',
    desc: '深度聚焦於後端 Laravel 9 核心架構（任務排程、資料庫優化）與前端 Vue 3 響應式資料驅動開發。',
    tags: ['Laravel9', 'Vue3', 'Tailwind', 'GAS'],
    statusColor: 'bg-emerald-500',
    x: 180,
    y: 560,
  },

  // 右下：數據實驗室
  {
    id: 'sandbox',
    label: 'Data Sandbox (Gold Passbook)',
    desc: '非線性數據觀測沙盒。串接後端自動化工作流，系統化分析銀行黃金存摺牌價波動率與個人資產配置。',
    statusColor: 'bg-amber-400',
    x: 780,
    y: 560,
  },
])

// 2. 定義關係連線
const links = ref([
  {
    sourceId: 'me',
    targetId: 'github',
    predicate: 'owl:sameAs',
    style: 'solid',
    curveDirection: -1,
  },
  {
    sourceId: 'me',
    targetId: 'email',
    predicate: 'schema:email',
    style: 'dashed',
    curveDirection: 1,
  },
  {
    sourceId: 'me',
    targetId: 'skills',
    predicate: 'schema:knowsAbout',
    style: 'solid',
    curveDirection: 1,
  },
  {
    sourceId: 'me',
    targetId: 'sandbox',
    predicate: 'schema:interest',
    style: 'dashed',
    curveDirection: -1,
  },
])

// 3. 核心數學演算法：計算優雅的三次貝茲曲線路徑
const calculateBezierPath = (link) => {
  const source = nodes.value.find((n) => n.id === link.sourceId)
  const target = nodes.value.find((n) => n.id === link.targetId)
  if (!source || !target) return ''

  // 計算控制點（Control Points），讓曲線帶有溫柔的 S 型弧度
  const dx = target.x - source.x
  const cp1x = source.x + dx * 0.4
  const cp1y = source.y + link.curveDirection * 40 // 縱向拉出弧度
  const cp2x = source.x + dx * 0.6
  const cp2y = target.y - link.curveDirection * 40

  return `M ${source.x} ${source.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${target.x} ${target.y}`
}

// 4. 計算曲線幾何中心點，用來精準放置關係膠囊標籤
const getCurveCenter = (link) => {
  const source = nodes.value.find((n) => n.id === link.sourceId)
  const target = nodes.value.find((n) => n.id === link.targetId)
  if (!source || !target) return { x: 0, y: 0 }

  // 基於三次貝茲曲線公式在 t = 0.5 時的幾何中心點精準解
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
