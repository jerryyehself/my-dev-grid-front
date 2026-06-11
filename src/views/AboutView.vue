<template>
  <p>
    我專注於建構穩健的後端系統與直覺的前端資料驅動介面。擅長利用 Laravel
    核心架構進行任務排程與資料庫優化，並結合 Vue 3 與 Google Apps Script 自動化工作流。
  </p>

  <h2>Semantic Resource Graph</h2>

  <div
    class="relative h-[720px] w-full border border-slate-200 rounded-2xl bg-white/70 shadow-sm overflow-hidden my-6"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] bg-[size:2rem_2rem] opacity-50 pointer-events-none"
      style="
        mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0.2) 100%);
        -webkit-mask-image: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 1) 70%,
          rgba(0, 0, 0, 0.2) 100%
        );
      "
    ></div>

    <svg class="absolute inset-0 w-full h-full pointer-events-none">
      <g v-for="(link, index) in links" :key="index">
        <path :d="calculateBezierPath(link)" fill="none" class="stroke-slate-300 stroke-[1.8px]" />
        <g :transform="`translate(${getCurveCenter(link).x}, ${getCurveCenter(link).y})`">
          <rect
            :x="-40"
            :y="-9"
            :width="80"
            :height="18"
            rx="6"
            fill="#ffffff"
            class="stroke-slate-200 stroke-[1px]"
          />
          <text fill="#4f46e5" class="text-[9px] font-mono font-bold" text-anchor="middle" dy="3.5">
            {{ link.predicate }}
          </text>
        </g>
      </g>
    </svg>

    <div
      v-for="node in nodes"
      :key="node.id"
      class="absolute transform -translate-x-1/2 -translate-y-1/2"
      :style="{ left: `${node.x}px`, top: `${node.y}px` }"
    >
      <div
        v-if="node.type === 'SUBJECT'"
        class="border border-indigo-500 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-8 py-5 rounded-xl text-center min-w-[220px] shadow-lg"
      >
        <div class="text-xl font-bold tracking-wide text-white">
          {{ node.label }}
        </div>
        <span
          class="text-[9px] bg-indigo-500/50 py-0.5 px-2.5 mt-2 inline-block rounded border border-indigo-400/30 font-mono"
        >
          {{ node.role }}
        </span>
      </div>

      <div
        v-else
        class="border border-slate-200 bg-white/95 px-5 py-4 w-[260px] rounded-xl shadow-sm hover:border-indigo-400 transition-all duration-300"
      >
        <div
          class="flex justify-between border-b pb-1 mb-2 text-[9px] font-mono font-bold text-slate-400"
        >
          <span>{{ node.id.toUpperCase() }}_ENTITY</span>
          <span class="w-2 h-2 rounded-full" :class="node.statusColor"></span>
        </div>
        <h3 class="text-xs font-bold text-slate-800 font-sans">{{ node.label }}</h3>
        <p class="text-[11px] text-slate-400 !mt-1.5 !mb-0 leading-relaxed">{{ node.desc }}</p>

        <div v-if="node.tags" class="mt-3 flex flex-wrap gap-1">
          <span
            v-for="tag in node.tags"
            :key="tag"
            class="text-[9px] bg-slate-50 border border-slate-150 text-slate-500 px-1.5 py-0.5 rounded font-mono"
          >
            #{{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <h2>Core Engineering Competencies</h2>
  <p>基於受控詞表的技術能力矩陣分類，提供結構化的實戰履歷索引：</p>
</template>

<script setup>
import { ref } from 'vue'

const nodes = ref([
  { id: 'me', label: 'Jerry Yeh', type: 'SUBJECT', role: 'Full-Stack Developer', x: 480, y: 360 },
  {
    id: 'github',
    label: 'GitHub Repository',
    desc: '託管核心開源組件與版本控制歷史。包含 isbn-scanner 掃描器原始碼及 GAS 自動化腳本組態。',
    url: 'https://github.com/jerryyehself',
    statusColor: 'bg-slate-800',
    x: 180,
    y: 160,
  },
  {
    id: 'email',
    label: 'Secure Mail Gateway',
    desc: '網域安全路由通訊點。主要用於系統自動化排程報告接收、錯誤日誌警告通知。',
    url: 'mailto:jerry.yeh@example.com',
    statusColor: 'bg-blue-400',
    x: 780,
    y: 160,
  },
  {
    id: 'skills',
    label: 'Engineering Stack',
    desc: '深度聚焦於後端 Laravel 9 核心架構與前端 Vue 3 響應式資料驅動開發。',
    tags: ['Laravel9', 'Vue3', 'GAS'],
    statusColor: 'bg-emerald-500',
    x: 180,
    y: 560,
  },
  {
    id: 'sandbox',
    label: 'Data Sandbox (Gold Passbook)',
    desc: '非線性數據觀測沙盒。串接後端自動化工作流，系統化分析銀行黃金存摺牌價波動率與個人資產配置。',
    statusColor: 'bg-amber-400',
    x: 780,
    y: 560,
  },
])

const links = ref([
  { sourceId: 'me', targetId: 'github', predicate: 'owl:sameAs', curveDirection: -1 },
  { sourceId: 'me', targetId: 'email', predicate: 'schema:email', curveDirection: 1 },
  { sourceId: 'me', targetId: 'skills', predicate: 'schema:knowsAbout', curveDirection: 1 },
  { sourceId: 'me', targetId: 'sandbox', predicate: 'schema:interest', curveDirection: -1 },
])

const calculateBezierPath = (link) => {
  const source = nodes.value.find((n) => n.id === link.sourceId)
  const target = nodes.value.find((n) => n.id === link.targetId)
  if (!source || !target) return ''
  const dx = target.x - source.x
  const cp1x = source.x + dx * 0.4
  const cp1y = source.y + link.curveDirection * 40
  const cp2x = source.x + dx * 0.6
  const cp2y = target.y - link.curveDirection * 40
  return `M ${source.x} ${source.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${target.x} ${target.y}`
}

const getCurveCenter = (link) => {
  const source = nodes.value.find((n) => n.id === link.sourceId)
  const target = nodes.value.find((n) => n.id === link.targetId)
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
