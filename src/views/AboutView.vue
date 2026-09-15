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
          IN
        </h1>
        <p class="font-mono text-[13px] tracking-wider text-(--text-nav-footer) opacity-75 mt-2">
          FULL-STACK DEVELOPER &nbsp;·&nbsp; SYSTEM ARCHITECTURE &nbsp;·&nbsp; KNOWLEDGE SYSTEMS
        </p>
      </div>
    </div>

    <!-- 導言：照設計稿用這句，跟原本保留的哲學段落不衝突，只是搶同一個版位，選這句 -->
    <p class="max-w-[760px] mx-auto text-lg sm:text-[22px] font-semibold leading-[1.7] text-center text-(--text-ink-main)">
      這個網站不是履歷，是外部化的第二個大腦——用來收留還沒想清楚的點子、記錄踩過的坑，把散落的知識重新編目成看得懂的結構。
    </p>

    <!-- 起點：這個站是怎麼來的。使用者要求的重點段落——把圖書資訊學背景跟這個站的設計動機接起來，
         語氣刻意放鬆，不寫成求職自我推銷。內容全部有依據（碩論題目與實習經歷來自 104 履歷自傳，
         分類號與述詞來自 my-dev-grid 資料庫的 Scope / Relation 實際資料）。 -->
    <section class="max-w-[760px] mx-auto space-y-5">
      <div class="font-mono text-[11px] tracking-[0.2em] uppercase text-(--text-accent) font-bold">
        // Origin
      </div>
      <h2 class="text-2xl sm:text-[28px] font-extrabold tracking-tight text-(--text-ink-main)">
        這東西是怎麼來的
      </h2>

      <div class="space-y-4 text-[15px] leading-8 text-(--text-ink-body)">
        <p>
          我唸的是圖書資訊學，一路唸到碩士。那幾年在學的事，講白了就是「怎麼把一堆東西整理到別人找得到」——分類號、主題標目、書目關係模型。
          碩論比較的是小說讀者腦中的資訊尋找心智模型跟 FRBR 這套書目模型的差距，說穿了是在問：學界設計的那套結構，離人真正的找法有多遠。
        </p>
        <p>
          其實更早就有徵兆。大學在台北市議會圖書館實習，工作是整理議員的議案資料，館員教我用文書軟體一筆一筆清；
          我清到一半覺得這太蠢了，改寫巨集讓它自己跑。那時候還不知道這件事跟寫程式有什麼關係。
        </p>
        <p>
          後來真的開始寫程式，才發現這兩件事根本是同一件。程式碼裡也有一堆沒被明確講出來的結構——這個 class 為什麼長這樣、
          當初那個決定在權衡什麼、這段邏輯到底對應哪份文件。只是它們從來沒有被編目，散在 commit 訊息、聊天記錄，
          以及某個人的腦袋裡。然後某天那個人離職了。
        </p>
        <p>
          所以這個網站是一個實驗：把圖書館那套資訊組織的方法，套到自己的技術知識上。
        </p>
      </div>

      <!-- 分類號不是裝飾，是資料庫裡 scopes 表的真實內容 -->
      <div class="border border-(--border-shelf) rounded-[10px] bg-(--bg-folder) p-5 space-y-3">
        <div class="font-mono text-[10px] tracking-[0.18em] uppercase text-(--text-ink-muted)">
          站上的東西真的有分類號
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-3">
          <div class="flex items-baseline gap-2.5">
            <span class="font-mono text-[12px] font-bold text-(--text-accent)">0000</span>
            <span class="text-[13px] text-(--text-ink-main)">文件</span>
            <span class="font-mono text-[10px] text-(--text-ink-muted) opacity-70">post / sourcesite</span>
          </div>
          <div class="flex items-baseline gap-2.5">
            <span class="font-mono text-[12px] font-bold text-(--text-accent)">1000</span>
            <span class="text-[13px] text-(--text-ink-main)">技術</span>
            <span class="font-mono text-[10px] text-(--text-ink-muted) opacity-70">framework / language</span>
          </div>
          <div class="flex items-baseline gap-2.5">
            <span class="font-mono text-[12px] font-bold text-(--text-accent)">2000</span>
            <span class="text-[13px] text-(--text-ink-main)">實作</span>
            <span class="font-mono text-[10px] text-(--text-ink-muted) opacity-70">project / work</span>
          </div>
        </div>
        <p class="text-[13px] leading-7 text-(--text-ink-body) border-t border-(--border-shelf) pt-3">
          節點之間也不是隨便連的，是有述詞的三元組：這篇文章
          <span class="font-mono text-[11.5px] text-(--text-accent)">documents</span> 這個技術，反過來這個技術就是被它
          <span class="font-mono text-[11.5px] text-(--text-accent)">documentedBy</span>。
          <router-link to="/graph" class="underline hover:text-(--text-accent)">/graph</router-link>
          看到的那張圖，就是這套規則長出來的。
        </p>
      </div>

      <div class="space-y-4 text-[15px] leading-8 text-(--text-ink-body)">
        <p>
          會不會有點過度工程？大概有一點。但我真正想知道的是：一個人的技術知識如果真的被好好編目，會長成什麼樣子。
        </p>
        <p>
          白天的工作剛好是同一題的另一個版本——接手一套沒有技術文件、也沒有商業邏輯文件的公文系統，
          從程式碼反推業務規則、補出 API 文件，再把糾在一起的 god class 一個一個拆開。
        </p>
        <p class="text-(--text-ink-main) font-semibold">
          碩論、這個網站、還有白天那份工作，其實都在做同一件事：把沒有被明確表達的結構，變成明確、可用、別人能接手的東西。
        </p>
      </div>
    </section>

    <!-- Focus Areas -->
    <div>
      <div class="text-center font-mono text-[11px] tracking-[0.2em] uppercase text-(--text-accent) font-bold mb-5">
        Focus Areas
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div
          v-for="area in focusAreas"
          :key="area.title"
          class="border border-(--border-shelf) rounded-[10px] p-6 bg-(--bg-paper-light)"
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
        「分類的意義從來不在分得多細，而在於下次有人來找的時候，找得到。」
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
          想聊聊的話
        </h4>
        <p class="text-xs text-(--text-nav-footer) opacity-70 font-mono">
          工作機會、技術討論，或只是想問這套分類號到底在幹嘛，都歡迎。
        </p>
      </div>
      <div class="flex gap-3 w-full justify-center max-w-xs">
        <a
          href="https://github.com/jerryyehself"
          target="_blank"
          class="flex-1 text-center px-4 py-2.5 border border-(--text-nav-footer)/25 hover:border-(--text-nav-footer) rounded-lg text-xs font-mono transition-all text-(--text-nav-footer)"
        >
          GitHub ↗
        </a>
        <a
          href="mailto:jerry40522@gmail.com"
          class="flex-1 text-center px-4 py-2.5 bg-(--text-accent) hover:bg-(--text-accent)/90 text-(--bg-nav-footer) font-bold rounded-lg text-xs font-mono transition-all"
        >
          寄信 ✉
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
    title: '後端與重構',
    desc: 'Laravel 為主。現職接手由前手從非 Laravel 專案升級上來的公文系統，處理遷移遺留的技術債——從程式碼逆向釐清業務規則、產出 API 文件、拆解 god abstract class 並重新界定模組邊界。',
  },
  {
    index: '02',
    title: '前端與資料視覺化',
    desc: 'Vue 3 與 TypeScript。這個站本身就是成品：知識圖譜的 2D／3D 力導向視覺化、節點之間的最短路徑查詢，以及跟著深色模式走的整套設計 token。',
  },
  {
    index: '03',
    title: '資訊組織',
    desc: '把圖書資訊學那套分類與關聯模型，落成真的可以查詢的資料結構——階層式分類號（Scope）、帶述詞且成對可逆的關聯（Relation），而不是一堆彼此無關的標籤。',
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
  { value: '2022.06', label: '開發資歷起點' },
])

</script>
