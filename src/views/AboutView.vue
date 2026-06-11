<template>
  <p>
    我專注於建構穩健的後端系統與直覺的前端資料驅動介面。擅長利用 Laravel
    核心架構進行任務排程與資料庫優化，並結合 Vue 3 與 Google Apps Script 自動化工作流。
  </p>

  <h2>Semantic Resource Graph</h2>

  <div
    class="relative h-[720px] w-full border border-[var(--border-shelf)] rounded-2xl bg-[var(--bg-paper-light)]/40 shadow-sm overflow-hidden my-6 transition-all duration-300"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(var(--text-ink-muted)_1.2px,transparent_1.2px)] bg-[size:2rem_2rem] opacity-[0.15] pointer-events-none"
      style="
        mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 90%);
        -webkit-mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 90%);
      "
    ></div>

    <svg class="absolute inset-0 w-full h-full pointer-events-none">
      <g v-for="(link, index) in links" :key="index">
        <path
          :d="calculateBezierPath(link)"
          fill="none"
          class="stroke-[var(--text-ink-muted)] opacity-30 stroke-[1.5px]"
        />

        <g :transform="`translate(${getCurveCenter(link).x}, ${getCurveCenter(link).y})`">
          <rect
            :x="-42"
            :y="-9"
            :width="84"
            :height="18"
            rx="4"
            fill="var(--bg-paper-light)"
            class="stroke-[var(--border-shelf)] stroke-[1px]"
          />
          <text
            fill="var(--text-accent)"
            class="text-[9px] font-mono font-bold tracking-wider"
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
        class="border border-[var(--text-accent)] bg-gradient-to-br from-[var(--text-ink-main)] to-[var(--text-ink-body)] text-[var(--bg-paper-light)] px-8 py-5 rounded-xl text-center min-w-[220px] shadow-md"
      >
        <div class="text-xl font-black tracking-widest">
          {{ node.label }}
        </div>
        <span
          class="text-[9px] bg-[var(--text-accent)]/20 text-[var(--bg-paper-light)] py-0.5 px-2.5 mt-2 inline-block rounded border border-[var(--text-accent)]/30 font-mono tracking-wider"
        >
          {{ node.role }}
        </span>
      </div>

      <div
        v-else
        class="border border-[var(--border-shelf)] bg-[var(--bg-paper-light)]/95 px-5 py-4 w-[260px] rounded-xl shadow-sm hover:border-[var(--text-accent)] transition-all duration-300"
      >
        <div
          class="flex justify-between border-b border-[var(--border-shelf)] pb-1 mb-2 text-[9px] font-mono font-bold text-[var(--text-ink-muted)] opacity-80"
        >
          <span>{{ node.id.toUpperCase() }}_ENTITY</span>
          <span
            class="w-1.5 h-1.5 rounded-full ring-2 ring-[var(--bg-paper-light)] shadow-sm"
            :class="node.statusColor"
          ></span>
        </div>
        <h3 class="text-xs font-bold text-[var(--text-ink-main)] font-sans tracking-wide">
          {{ node.label }}
        </h3>
        <p
          class="text-[11px] text-[var(--text-ink-body)] opacity-90 !mt-1.5 !mb-0 leading-relaxed text-justify"
        >
          {{ node.desc }}
        </p>

        <div v-if="node.tags" class="mt-3 flex flex-wrap gap-1">
          <span
            v-for="tag in node.tags"
            :key="tag"
            class="text-[9px] bg-[var(--bg-folder)] border border-[var(--border-shelf)] text-[var(--text-ink-body)] px-1.5 py-0.5 rounded font-mono"
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
    statusColor: 'bg-amber-900' /* 💡 稍微調深，配合木質調 */,
    x: 180,
    y: 160,
  },
  {
    id: 'email',
    label: 'Secure Mail Gateway',
    desc: '網域安全路由通訊點。主要用於系統自動化排程報告接收、錯誤日誌警告通知。',
    url: 'mailto:jerry.yeh@example.com',
    statusColor: 'bg-yellow-600',
    x: 780,
    y: 160,
  },
  {
    id: 'skills',
    label: 'Engineering Stack',
    desc: '深度聚焦於後端 Laravel 9 核心架構與前端 Vue 3 響應式資料驅動開發。',
    tags: ['Laravel9', 'Vue3', 'GAS'],
    statusColor: 'bg-amber-700',
    x: 180,
    y: 560,
  },
  {
    id: 'sandbox',
    label: 'Data Sandbox (Gold Passbook)',
    desc: '非線性數據觀測沙盒。串接後端自動化工作流，系統化分析銀行黃金存摺牌價波動率與個人資產配置。',
    statusColor: 'bg-amber-500',
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
    mt * mt * mt * source.y + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2x + t * t * t * target.x // 修正原本代碼中公式末端的微小對稱性誤差
  const yFinal =
    mt * mt * mt * source.y + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * target.y
  return { x, y, y: yFinal }
}
</script>
