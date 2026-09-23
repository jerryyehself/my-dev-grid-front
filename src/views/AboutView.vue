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

    <!-- 開場：訪客點進 About 想知道的是「這個人是誰」，所以身分句擺最前面。
         原本這裡是「這個網站不是履歷…」——位置對但主詞錯了，那是在介紹網站不是介紹人，
         改成先講人，再用一句話帶出這個站。 -->
    <div class="max-w-[760px] mx-auto text-center space-y-3">
      <p class="text-[26px] sm:text-[34px] font-extrabold tracking-tight leading-[1.45] text-(--text-ink-main)">
        簡單講，我是個走在網站工程師路上的圖資人。
      </p>
      <p class="text-base leading-[1.6] text-(--text-ink-body) max-w-prose mx-auto">
        這個站不是履歷，是拿自己的技術知識當材料，試著把散落的東西重新編目成看得懂的結構。
      </p>
    </div>

    <!-- 三條主線：緊接在身分句後面，這是最快回答「這人在幹嘛」的東西。
         原本埋在 Origin 故事的結尾，訪客得讀完五百字才看得到。 -->
    <div class="max-w-[760px] mx-auto">
    <div class="border border-(--border-shelf) rounded-[10px] overflow-hidden">
      <div
        v-for="line in throughLines"
        :key="line.when"
        class="grid grid-cols-[76px_minmax(0,1fr)] sm:grid-cols-[110px_minmax(0,1fr)] gap-x-4 px-4 sm:px-5 py-3.5 border-b border-(--border-shelf) last:border-b-0"
      >
        <div class="font-mono text-[11px] tracking-[0.14em] text-(--text-accent) font-bold pt-0.5">
          {{ line.when }}
        </div>
        <div class="text-[13.5px] leading-7 text-(--text-ink-body)">{{ line.what }}</div>
      </div>
      <div class="bg-(--bg-folder) px-4 sm:px-5 py-4 text-[14px] leading-7 font-semibold text-(--text-ink-main)">
        三件事是同一件：把沒有被明確表達的結構，變成明確、可用、別人能接手的東西。
      </div>
    </div>

    </div>

    <!-- Focus Areas：整段換成滿版的 --bg-folder 底色。
         這頁原本從開場到結尾都在同一張紙上，章節之間只靠 space-y-16 的空白分隔，
         往下捲的時候分不出「換段落」跟「換章節」。底色換一次＝讀者知道這裡翻頁了。
         卡片維持 --bg-paper-light，在深一階的底色上會自然讀成浮起來的東西。
         滿版的做法跟上面的橫幅一樣，用 -mx-[50vw] w-screen 跳出 MainLayout 的 max-w-5xl，
         裡面再把同一組容器 class 補回來，內容才會跟其他章節對齊。 -->
    <div class="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-(--bg-folder) border-y border-(--border-shelf) py-12 sm:py-14">
      <div class="w-full max-w-5xl mx-auto px-4 sm:px-6">
      <BaseEyebrow class="mb-1.5">Focus</BaseEyebrow>
      <h2 class="text-2xl sm:text-[28px] font-extrabold tracking-tight text-(--text-ink-main) mb-7">
        目前在練的三件事
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div
          v-for="area in focusAreas"
          :key="area.title"
          class="border border-(--border-shelf) rounded-[10px] p-6 bg-(--bg-paper-light)"
        >
          <div class="font-mono text-xs font-bold text-(--text-accent) mb-3">{{ area.index }}</div>
          <h3 class="text-base font-bold text-(--text-ink-main) mb-2">{{ area.title }}</h3>
          <p class="text-[13.5px] leading-relaxed text-(--text-ink-body)">{{ area.desc }}</p>
          <div v-if="area.compare" class="mt-3 space-y-2.5">
            <div
              v-for="row in area.compare"
              :key="row.label"
              class="border-t border-(--border-shelf) pt-2.5"
            >
              <div class="font-mono text-[10px] tracking-[0.14em] text-(--text-ink-muted) mb-1.5">
                {{ row.label }}
              </div>
              <div class="text-[12.5px] text-(--text-ink-muted) line-through">{{ row.before }}</div>
              <div class="flex items-start gap-1.5 text-[12.5px] mt-1">
                <svg width="11" height="13" viewBox="0 0 11 13" fill="none" class="shrink-0 mt-0.5 text-(--text-accent)">
                  <line x1="5.5" y1="0" x2="5.5" y2="9" stroke="currentColor" stroke-width="1.2" />
                  <polyline points="2.5,6 5.5,9.5 8.5,6" stroke="currentColor" stroke-width="1.2" fill="none" />
                </svg>
                <span class="text-(--text-ink-main) font-semibold">{{ row.after }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- 專案時間軸：這一段刻意用圖不用文字。節奏（密集 → 靜默 → 恢復）講出來像在解釋，
         畫出來就只是事實。所有座標都由 computed 從真實的 repo 建立日期算出，沒有寫死。
         後端連不上時整段不顯示（v-if），不退回假資料——時間軸說謊比沒有時間軸糟。 -->
    <section v-if="timeline" class="space-y-6">
      <div>
        <BaseEyebrow class="mb-1.5">Timeline</BaseEyebrow>
        <h2 class="text-2xl sm:text-[28px] font-extrabold tracking-tight text-(--text-ink-main)">
          GitHub 上的 {{ repoPoints.length }} 個 repo
        </h2>
      </div>

      <!-- role="img":這是一張圖，不是 16 個可以逐一 tab 過去的控制項。
           給整段一句話的替代描述，比讓每顆 6px 的點都變成鍵盤焦點合理。 -->
      <div
        class="timeline-plot relative h-[150px] sm:h-[190px] mt-8 sm:mt-10"
        role="img"
        :aria-label="timelineAlt"
      >
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

        <!-- 每個 repo 一個點。外層是 28px 的透明感應區——點本身只有 6~9px，滑鼠很難精準指到，
             所以讓感應區負責接 hover，真正改變外觀的是裡面那顆點。
             加 hover 的理由是補訊號、不是加裝飾:每顆點本來就各自代表一個 repo(有資訊)，
             但外觀上完全沒有「可以指指看」的暗示，等於有意義卻沒有 signifier。
             100ms / ease-out 是 NN/g 對「單純的游標回饋」這類微互動給的建議值。 -->
        <div
          v-for="dot in timeline.dots"
          :key="dot.name"
          class="group absolute top-1/2 w-7 h-7 flex items-center justify-center hover:z-20"
          :style="{
            left: dot.left + '%',
            transform: `translate(-50%, calc(-50% + ${dot.offset}px))`,
          }"
        >
          <span
            class="rounded-full box-border transition-transform duration-100 ease-out group-hover:scale-[1.6]"
            :class="dot.archived ? 'border-[1.5px] border-(--text-accent)' : 'bg-(--text-accent)'"
            :style="{ width: dot.size + 'px', height: dot.size + 'px' }"
          ></span>
          <!-- 名字用自己畫的浮層而不是原生 title:原生 tooltip 要等快一秒才出現，
               對「掃過去看看這顆是哪個 repo」這種用法來說慢到等於沒有。
               靠左的點往右展開、靠右的點往左展開，才不會被容器裁掉。

               底色一定要用 --bg-paper-light 這種不透明色。--bg-folder 是
               rgba(...,0.04) 的透染色,浮層疊到里程碑標籤上時會整片透出來,
               變成兩層字疊在一起(第一版就是這樣)。

               提升層級的 z 掛在外層而不是浮層上:外層有 inline transform,
               transform 會另外開一個 stacking context,浮層自己的 z-index
               只在那個 context 裡有效,永遠爬不出去蓋過後面的里程碑標籤。
               只在 hover 時才提升,平常維持原本的疊放順序。 -->
          <span
            class="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded-[4px] border border-(--border-shelf) bg-(--bg-paper-light) shadow-sm px-2 py-1 font-mono text-[10px] text-(--text-ink-main) opacity-0 transition-opacity duration-100 ease-out group-hover:opacity-100"
            :style="{
              left: dot.left < 50 ? '50%' : 'auto',
              right: dot.left < 50 ? 'auto' : '50%',
              transform: dot.left < 50 ? 'translateX(-6px)' : 'translateX(6px)',
            }"
            >{{ dot.name }}</span
          >
        </div>

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

    <!-- 起點：這個站是怎麼來的。使用者要求的重點段落——把圖書資訊學背景跟這個站的設計動機接起來，
         語氣刻意放鬆，不寫成求職自我推銷。內容全部有依據（碩論題目與實習經歷來自 104 履歷自傳，
         分類號與述詞來自 my-dev-grid 資料庫的 Scope / Relation 實際資料）。 -->
    <section class="max-w-[760px] mx-auto space-y-5">
      <BaseEyebrow>Origin</BaseEyebrow>
      <h2 class="text-2xl sm:text-[28px] font-extrabold tracking-tight text-(--text-ink-main)">
        這東西是怎麼來的
      </h2>

      <div class="max-w-prose space-y-4 text-base leading-[1.6] text-(--text-ink-body)">
        <p>
          圖書資訊學唸到碩士，專注在資訊組織——講白一點就是分類法，研究怎麼把一堆東西整理到別人找得到。
        </p>
        <p>
          更早就有徵兆。大學在議會圖書館實習整理議案資料，館員教我用文書軟體一筆一筆清，我清到一半覺得太蠢，
          改寫巨集讓它自己跑。那時還不知道這跟寫程式有什麼關係。
        </p>
        <p>
          後來開始寫程式，才發現這兩件事是同一件。程式碼裡也有一堆沒被明確講出來的結構——這個 class 為什麼長這樣、
          當初在權衡什麼、這段邏輯對應哪份文件。只是它們從沒被編目，散在 commit 訊息和某個人的腦袋裡。然後那個人離職了。
        </p>
        <p>
          所以這個網站是一個實驗：把圖書館那套資訊組織的方法，套到自己的技術知識上。
        </p>
        <p>
          2022 年試過一次，叫
          <a href="https://github.com/jerryyehself/Laravel-LearningLibrary" target="_blank" rel="noopener" class="underline hover:text-(--text-accent)">Laravel-LearningLibrary</a>。
          那份 README 有一欄「紀錄知識節點」標著「(待補)」——這個站就是三年後回來把那兩個字補完。
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
        <!-- 三元組：主詞—述詞—受詞，以及成對可逆的反向關係。這是本體論最核心、
             也最容易用一句話講不清楚的概念，畫出來比寫三行字快得多。 -->
        <div class="border-t border-(--border-shelf) pt-4">
          <svg viewBox="0 0 320 78" class="w-full max-w-[420px] mx-auto" role="img"
               aria-label="三元組示意：這篇文章 documents vue3，反向為 vue3 documentedBy 這篇文章">
            <rect x="1" y="21" width="86" height="26" rx="5" fill="var(--bg-paper-light)" stroke="var(--text-accent)" stroke-opacity="0.4" />
            <text x="44" y="38" text-anchor="middle" font-size="11" fill="var(--text-ink-main)">這篇文章</text>
            <rect x="233" y="21" width="86" height="26" rx="5" fill="var(--bg-paper-light)" stroke="var(--text-accent)" stroke-opacity="0.4" />
            <text x="276" y="38" text-anchor="middle" font-size="11" fill="var(--text-ink-main)">vue3</text>

            <line x1="92" y1="28" x2="222" y2="28" stroke="var(--text-accent)" stroke-width="1" />
            <polyline points="217,25 222,28 217,31" fill="none" stroke="var(--text-accent)" stroke-width="1" />
            <text x="157" y="21" text-anchor="middle" font-size="9.5" font-family="ui-monospace, monospace" fill="var(--text-accent)">documents</text>

            <line x1="228" y1="40" x2="98" y2="40" stroke="var(--text-ink-muted)" stroke-width="1" stroke-opacity="0.5" />
            <polyline points="103,37 98,40 103,43" fill="none" stroke="var(--text-ink-muted)" stroke-width="1" stroke-opacity="0.5" />
            <text x="163" y="54" text-anchor="middle" font-size="9.5" font-family="ui-monospace, monospace" fill="var(--text-ink-muted)">documentedBy</text>

            <text x="160" y="72" text-anchor="middle" font-size="9" fill="var(--text-ink-muted)" opacity="0.7">每個述詞都有成對的反向</text>
          </svg>
          <p class="text-[13px] leading-7 text-(--text-ink-body) text-center mt-1">
            <router-link to="/graph" class="underline hover:text-(--text-accent)">/graph</router-link>
            看到的那張圖，就是這套規則長出來的。
          </p>
        </div>
      </div>

      <div class="max-w-prose space-y-4 text-base leading-[1.6] text-(--text-ink-body)">
        <p>
          會不會過度工程？大概有一點，而且老實說還在嘗試。但我真的想知道，一個人的技術知識被好好編目過會長成什麼樣子。
        </p>
      </div>

    </section>

    <!-- 真實可查核的數字：不放「幾年資歷」這種需要自報的數字，只放算得出來的 -->
    <div class="bg-(--bg-folder) border-y border-(--border-shelf) py-8 -mx-4 sm:-mx-6 px-4 sm:px-6">
      <div class="grid grid-cols-3 max-w-[1040px] mx-auto">
        <div v-for="stat in stats" :key="stat.label" class="text-center border-l border-(--border-shelf) first:border-l-0 px-2">
          <div class="font-mono text-2xl sm:text-3xl font-bold text-(--text-accent) mb-1">{{ stat.value }}</div>
          <div class="text-xs text-(--text-ink-muted)">{{ stat.label }}</div>
        </div>
      </div>
    </div>

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
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import { fetchArticles } from '@/api/articles'
import { fetchProjects, fetchRepoTimeline, type RepoPoint } from '@/api/projects'

const focusAreas = [
  {
    index: '01',
    title: '資訊組織與本體設計',
    desc: '借鑑 Linked Data 三元組：Scope 是階層分類號、當主詞與受詞，Relation 是述詞且成對可逆。做 FRBR 研究學到的一件事直接用在這裡——模型設計得再嚴謹，找不到就沒有用。',
  },
  {
    index: '02',
    title: '把混亂收斂成結構',
    desc: '同一套資料，三年後重做一次：',
    // 「前身 vs 現在」本來就是對照的形狀，寫成散文反而要讀兩遍才看得出差在哪
    compare: [
      { label: '問題領域', before: '四個各自的 model', after: '一張表＋分類號' },
      { label: '關聯', before: '多型 pivot', after: '帶述詞、成對可逆' },
    ],
  },
  {
    index: '03',
    title: '排程與資料加值',
    desc: '兩代共同的主線——排程打 GitHub API 取回 repo 資料後加值。前身拿它做 topics 檢索，現在餵進知識圖譜，成為 Implementation 那一族的節點。',
  },
]

// 三條主線：原本是文末兩段散文，改成並列清單讓讀者自己看出共通點。
const throughLines = [
  { when: '碩論', what: '比較小說讀者的心智模型與 FRBR：學界設計的結構，離人真正的找法有多遠' },
  { when: '這個站', what: '把自己的技術知識編目成有分類號、有述詞、查得動的圖譜' },
  { when: '白天的工作', what: '接手沒有文件的公文系統，反推業務規則、補出 API 文件、拆解 god class' },
]

// --- About 時間軸 -----------------------------------------------------------
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

// 圖的替代描述。時間軸的重點是節奏（起點、靜默、恢復），不是逐一唸出 16 個 repo 名字，
// 所以這裡講的是同一件事的文字版，而不是把畫面上的元素照抄一遍。
const timelineAlt = computed(() => {
  const t = timeline.value
  const head = repoPoints.value[0]
  const tail = repoPoints.value[repoPoints.value.length - 1]
  if (!t || !head || !tail) return ''
  const range = `${head.ym.replace('-', ' 年 ')} 月到 ${tail.ym.replace('-', ' 年 ')} 月`
  const pause = t.gap ? `，中間 ${t.gap.from} 到 ${t.gap.to} 有一段沒有開新專案的空檔` : ''
  return `專案時間軸：${repoPoints.value.length} 個 GitHub repo 的建立時間，從 ${range}${pause}。`
})

// 專案數／文章數都改打後端 API，載入完成前先用 '—' 佔位，避免顯示會誤導的 0。
// 文章數原本讀 src/data/articles.ts（假資料，固定 5 篇，後台編輯器新增的文章
// 從來不會反映到這裡）——2026-09-23 改成真的算已發布文章數。
const projectCount = ref<string>('—')
fetchProjects()
  .then((projects) => {
    projectCount.value = String(projects.length)
  })
  .catch(() => {
    // 這個數字只是統計展示，載入失敗就維持佔位符號，不用另外顯示錯誤訊息干擾整頁
  })

const articleCount = ref<string>('—')
fetchArticles()
  .then((list) => {
    articleCount.value = String(list.filter((a) => a.status === 1).length)
  })
  .catch(() => {
    // 同上，載入失敗維持佔位符號
  })

const stats = computed(() => [
  { value: articleCount.value, label: '篇文章' },
  { value: projectCount.value, label: '個專案' },
  { value: '2022.06', label: '開發資歷起點' },
])

</script>
