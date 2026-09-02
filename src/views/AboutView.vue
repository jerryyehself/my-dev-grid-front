<template>
  <div class="w-full space-y-16">
    <!-- 🎬 橫幅：用知識圖譜節點連線圖代替真實照片，呼應站主真正在做的事
         照設計稿是滿版到瀏覽器邊緣的橫幅，不是站內容欄寬度，所以用這個 trick 跳出 MainLayout 的 max-w-5xl/px 容器 -->
    <div class="relative left-1/2 right-1/2 -mx-[50vw] w-screen h-[340px] sm:h-[400px] overflow-hidden bg-(--bg-nav-footer)">
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

    <!-- 原本這裡是一個手刻的靜態 bezier 連結圖，跟真正的知識圖譜功能（/graph，接真實
         Scope/Relation 資料）語意撞名、內容也重複，issue #25 拿掉了。先留白當佔位符，
         之後可能會放一小部分真實知識圖譜的範例節點進來 -->
    <section>
      <div class="mb-6">
        <div class="font-mono text-[11px] tracking-[0.2em] uppercase text-(--text-accent) font-bold mb-1.5">
          // Network
        </div>
        <p class="text-[11px] font-mono text-(--text-ink-muted) max-w-2xl leading-normal">
          籌備中——完整互動版知識圖譜見
          <router-link to="/graph" class="underline hover:text-(--text-accent)">/graph</router-link>。
        </p>
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
import { ref, computed } from 'vue'
import { articles } from '@/data/articles'
import { fetchProjects } from '@/api/projects'

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

// 專案數改打後端 API，載入完成前先用 '—' 佔位，避免顯示會誤導的 0
const projectCount = ref<string>('—')
fetchProjects()
  .then((projects) => {
    projectCount.value = String(projects.length)
  })
  .catch(() => {
    // 這個數字只是統計展示，載入失敗就維持佔位符號，不用另外顯示錯誤訊息干擾整頁
  })

const stats = computed(() => [
  { value: String(articles.length), label: '篇文章' },
  { value: projectCount.value, label: '個專案' },
  { value: '2026.01', label: '全端資歷起點' },
])

</script>
