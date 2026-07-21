<script setup lang="ts">
import { ref } from 'vue'

// 💡 純粹的數據驅動
const projects = ref([
  {
    id: 'PROJ-2026-01',
    title: 'ISBN 智慧圖書掃描器',
    status: 'Active',
    statusType: 'active',
    desc: '基於 Vue3 與 OpenCV 核心，實作行動端高精度條碼解碼，串接 GAS 自動化工作流，達成圖書資產自動化上架與鏈結編目系統。',
    tags: ['Vue 3', 'Tailwind v4', 'OpenCV'],
  },
  {
    id: 'PROJ-2026-02',
    title: 'GAS 自動化工作流沙盒',
    status: 'Archived',
    statusType: 'archived',
    desc: '個人數位空間的自動化控制中樞，整合金鑰與帳密安全管理系統，定時觀測黃金持股數據並映射至自動化看板。',
    tags: ['Google Apps Script', 'Node.js'],
  },
  {
    id: 'PROJ-2026-03',
    title: "Jerry's Knowledge Space (v2)",
    status: 'Active',
    statusType: 'active',
    desc: '全站重構至 Tailwind v4 與配置編進的「圖書館物理美學」設計系統。全面將外殼與邊界固定，將內容與人的特質往前推進。',
    tags: ['Vue 3', 'Vite', 'Tailwind v4'],
  },
  {
    id: 'PROJ-2026-04',
    title: '全端履約進度看板',
    status: 'Active',
    statusType: 'active',
    desc: '工具型儀表板應用，完美防範 D3 畫布或圖表組件發生高寬度塌陷與重繪問題，提供高度穩定的容器骨架。',
    tags: ['D3.js', 'Tailwind v4', 'SVG Canvas'],
  },
])
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div
      v-for="proj in projects"
      :key="proj.id"
      class="flex flex-col p-6 bg-(--bg-paper-light) border border-(--border-shelf) rounded-xl shadow-xs hover:border-amber-900/30 transition-all group"
    >
      <div class="flex items-center justify-between mb-4 font-mono text-xs text-amber-950/60">
        <span>{{ proj.id }}</span>
        <span
          :class="[
            'px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase scale-90 border',
            proj.statusType === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-100',
          ]"
        >
          {{ proj.status }}
        </span>
      </div>

      <h2 class="text-xl font-bold text-amber-950 group-hover:text-amber-900 transition-colors">
        {{ proj.title }}
      </h2>

      <p class="text-sm text-amber-950/80 my-3 leading-relaxed text-justify">
        {{ proj.desc }}
      </p>

      <div
        class="mt-auto pt-4 border-t border-(--border-shelf)/40 flex flex-wrap gap-2 font-mono text-[11px] text-amber-950/70"
      >
        <span v-for="tag in proj.tags" :key="tag" class="bg-(--bg-folder) px-2 py-0.5 rounded">
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>
