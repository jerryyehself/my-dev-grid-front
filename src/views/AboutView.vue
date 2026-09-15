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
          LIBRARY &amp; INFORMATION SCIENCE &nbsp;·&nbsp; BACKEND &nbsp;·&nbsp; KNOWLEDGE ORGANIZATION
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
          簡單講，我是個走在網站工程師路上的圖資人。
        </p>
        <p>
          圖書資訊學唸到碩士，主要專注在資訊組織——講白一點就是分類法，研究怎麼把一堆東西整理到別人找得到。
          學生時期也摸過一陣子期刊相關的議題，到現在偶爾還是會想看看學界最近在討論什麼。
        </p>
        <p>
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
        <p>
          其實 2022 年試過一次，叫
          <a href="https://github.com/jerryyehself/Laravel-LearningLibrary" target="_blank" rel="noopener" class="underline hover:text-(--text-accent)">Laravel-LearningLibrary</a>。
          那份 README 上有一欄「紀錄知識節點」，後面標著「(待補)」——這個站基本上就是三年後回來，把那兩個字補完。
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
          會不會有點過度工程？大概有一點。把資訊組織的概念帶回來寫程式這件事，老實說也還在嘗試——
          但我是真的想知道，一個人的技術知識如果被好好編目過，會長成什麼樣子。
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

    <!-- 專案時間軸：這一段刻意用圖不用文字。節奏（密集 → 靜默 → 恢復）講出來像在解釋，
         畫出來就只是事實。所有座標都由 computed 從真實的 repo 建立日期算出，沒有寫死。
         後端連不上時整段不顯示（v-if），不退回假資料——時間軸說謊比沒有時間軸糟。 -->
    <section v-if="timeline" class="space-y-6">
      <div>
        <div class="font-mono text-[11px] tracking-[0.2em] uppercase text-(--text-accent) font-bold mb-1.5">
          // Timeline
        </div>
        <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight text-(--text-ink-main)">
          GitHub 上的 {{ repoPoints.length }} 個 repo
        </h2>
      </div>

      <div class="relative h-[150px] sm:h-[190px] mt-8 sm:mt-10">
        <!-- 年份刻度 -->
        <template v-for="y in timeline.years" :key="y.year">
          <div
            class="absolute top-0 bottom-0 w-px bg-(--text-accent)/20"
            :style="{ left: y.left + '%' }"
          ></div>
          <div
            class="absolute top-full pt-2 -translate-x-1/2 font-mono text-[10px] sm:text-[11px] tracking-[0.14em] text-(--text-ink-muted) opacity-70"
            :style="{ left: y.left + '%' }"
          >
            {{ y.year }}
          </div>
        </template>

        <!-- 靜默期 -->
        <template v-if="timeline.gap">
          <div
            class="absolute top-0 bottom-0 bg-(--bg-folder) border-x border-dashed border-(--text-accent)/25"
            :style="{ left: timeline.gap.left + '%', width: timeline.gap.width + '%' }"
          ></div>
          <div
            class="absolute top-1/2 -translate-y-[calc(50%+40px)] sm:-translate-y-[calc(50%+52px)] text-center px-1"
            :style="{ left: timeline.gap.left + '%', width: timeline.gap.width + '%' }"
          >
            <div class="font-mono text-[9.5px] sm:text-[10px] tracking-[0.12em] text-(--text-ink-muted)">
              {{ timeline.gap.from }} – {{ timeline.gap.to }}
            </div>
            <div class="text-xs sm:text-[13px] text-(--text-ink-body) mt-0.5">在上班，沒開新的</div>
          </div>
        </template>

        <!-- 軸線 -->
        <div class="absolute inset-x-0 top-1/2 h-px bg-(--text-accent)/25"></div>

        <!-- 每個 repo 一個點 -->
        <div
          v-for="dot in timeline.dots"
          :key="dot.name"
          class="absolute top-1/2 rounded-full box-border"
          :class="dot.archived ? 'border-[1.5px] border-(--text-accent)' : 'bg-(--text-accent)'"
          :style="{
            left: dot.left + '%',
            width: dot.size + 'px',
            height: dot.size + 'px',
            transform: `translate(-50%, calc(-50% + ${dot.offset}px))`,
          }"
          :title="dot.name"
        ></div>

        <!-- 里程碑標籤：手機放不下，只在 sm 以上顯示 -->
        <div
          v-for="label in timeline.labels"
          :key="label.name"
          class="hidden sm:block absolute whitespace-nowrap"
          :class="label.above ? 'bottom-[calc(50%+26px)]' : 'top-[calc(50%+26px)]'"
          :style="{
            left: label.left + '%',
            transform: label.left < 50 ? 'translateX(-4px)' : 'translateX(calc(-100% + 4px))',
            textAlign: label.left < 50 ? 'left' : 'right',
          }"
        >
          <div class="font-mono text-[10px] tracking-[0.1em] text-(--text-accent) font-bold">
            {{ label.text }}
          </div>
          <div class="font-mono text-[9.5px] text-(--text-ink-muted) opacity-75 mt-0.5">
            {{ label.name }}
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-(--border-shelf) pt-3 mt-8 sm:mt-10">
        <span class="inline-flex items-center gap-1.5">
          <span class="w-[9px] h-[9px] rounded-full bg-(--text-accent)"></span>
          <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted)">里程碑</span>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-(--text-accent)"></span>
          <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted)">其他 repo</span>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full border-[1.5px] border-(--text-accent) box-border"></span>
          <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted)">已封存</span>
        </span>
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
import { fetchProjects, fetchRepoTimeline, type RepoPoint } from '@/api/projects'

const focusAreas = [
  {
    index: '01',
    title: '資訊組織與本體設計',
    desc: '借鑑 Linked Data 三元組：Scope 是階層式分類號、當主詞與受詞，Relation 是述詞且成對可逆（documents ↔ documentedBy）。碩論比較 FRBR 書目模型與讀者實際的資訊尋找心智模型，得到的結論直接用在這裡——模型設計得再嚴謹，找不到就沒有用。',
  },
  {
    index: '02',
    title: '把混亂收斂成結構',
    desc: '前身把問題領域拆成四個各自的 model（Environment / Framework / Language / Packagetool），關聯靠多型 pivot；現在收斂成一張表加階層分類號，關聯換成帶述詞、可逆的三元組。白天的工作是同一題的另一個版本：從沒有文件的系統反推業務規則、拆解 god class。',
  },
  {
    index: '03',
    title: '排程與資料加值',
    desc: '兩代共同的主線——用排程打 GitHub API 取回 repo 資料後加值（topics、建立時間、封存狀態）。前身拿它做 topics 檢索與練習比例圖，現在餵進知識圖譜，成為 Implementation 那一族的節點。',
  },
]// --- About 時間軸 -----------------------------------------------------------
// 位置一律由真實的 repo 建立日期算出來，不寫死座標：軸的起訖、年份刻度、靜默期
// 區間都是從資料推出來的，之後多了 repo 也不用回來改這裡。
const MILESTONES: Record<string, string> = {
  thesis: '碩論工具',
  'Laravel-LearningLibrary': '前身',
  'my-dev-grid': '現在這個站',
  'my-dev-grid-front': '前台',
}

const repoPoints = ref<RepoPoint[]>([])
fetchRepoTimeline()
  .then((points) => {
    repoPoints.value = points
  })
  .catch(() => {
    // 後端沒起來就整段不顯示（見 template 的 v-if）。時間軸是錦上添花，
    // 不值得為它顯示錯誤訊息，也不該退回寫死的假資料——那會在資料變動後說謊。
  })

const monthIndex = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7))

interface TimelineModel {
  dots: { name: string; left: number; offset: number; size: number; archived: boolean }[]
  labels: { name: string; text: string; left: number; above: boolean }[]
  years: { year: string; left: number }[]
  gap: { left: number; width: number; from: string; to: string } | null
}

const timeline = computed<TimelineModel | null>(() => {
  const pts = repoPoints.value
  const head = pts[0]
  const tail = pts[pts.length - 1]
  if (!head || !tail || pts.length < 2) return null

  const first = monthIndex(head.ym)
  const last = monthIndex(tail.ym)
  // 尾端多留兩個月，最後一個點才不會貼齊右邊界
  const span = last - first + 2
  // 左右各留 4% 內縮：最早與最晚的點如果貼在 0% / 100%，點本身跟它的標籤會被容器裁掉
  const pct = (ym: string) => 4 + ((monthIndex(ym) - first) / span) * 92

  // 同月份的點上下錯開，才不會疊在一起
  const perMonth: Record<string, number> = {}
  const dots = pts.map((p) => {
    const n = (perMonth[p.ym] = (perMonth[p.ym] ?? 0) + 1)
    const sameMonth = pts.filter((q) => q.ym === p.ym).length
    return {
      name: p.name,
      left: pct(p.ym),
      offset: sameMonth > 1 ? (n === 1 ? -11 : 11) : 0,
      size: p.name in MILESTONES ? 9 : 6,
      archived: p.archived,
    }
  })

  const labels = pts
    .filter((p) => p.name in MILESTONES)
    .map((p, i) => ({ name: p.name, text: MILESTONES[p.name] ?? p.name, left: pct(p.ym), above: i % 2 === 1 }))

  const years: { year: string; left: number }[] = []
  for (let y = Math.ceil(first / 12); y * 12 <= last; y++) {
    years.push({ year: String(y), left: 4 + ((y * 12 - first) / span) * 92 })
  }

  // 靜默期＝資料裡最長的一段「沒有新 repo」的空檔，同樣由資料推出來
  let gap: TimelineModel['gap'] = null
  let widest = 0
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    if (!prev || !curr) continue
    const months = monthIndex(curr.ym) - monthIndex(prev.ym)
    if (months > widest) {
      widest = months
      gap = {
        left: pct(prev.ym),
        width: pct(curr.ym) - pct(prev.ym),
        from: prev.ym.replace('-', '.'),
        to: curr.ym.replace('-', '.'),
      }
    }
  }
  // 少於一年的空檔不特別標示，那只是正常的忙碌，不是一段故事
  if (widest < 12) gap = null

  return { dots, labels, years, gap }
})

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
