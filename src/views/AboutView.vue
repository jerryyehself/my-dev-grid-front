<template>
  <!-- About 頁：照設計稿 canvas HcnHo2yYoWQdFypRg7Y2qU 的 E 版（Catalog.dc.html，版本 25）實作。
       決定與理由見 my-dev-grid-skills/docs/about-visual-redesign-2026-09-29.md（§1 共 19 條）、
       D-58（這頁介紹網站，不介紹作者；拿掉 Timeline 與自我介紹）、D-59（配色）、D-60（字型）。
       整頁由滿版色帶組成，route meta 設了 fullBleed，MainLayout 不套內容欄寬度也不留上下白。
       顏色一律走 token，設計稿裡沒有對應 token 的值才寫成 color-mix()，理由寫在各處註解。 -->
  <div class="w-full">
    <!-- ① 照片橫幅。用 <img> 不用 CSS 背景圖，才能給 alt -->
    <header
      class="relative overflow-hidden bg-(--bg-band-strong) h-[440px] sm:h-[520px] lg:h-[600px] flex flex-col justify-end"
    >
      <img
        :src="heroPhoto"
        alt="木製卡片目錄櫃，一整排帶黃銅標籤框的抽屜"
        class="absolute inset-0 w-full h-full object-cover object-[center_38%]"
      />
      <div :class="[WRAP, 'relative pb-12 lg:pb-[72px]']">
        <div class="flex items-center gap-3.5 mb-[22px]">
          <span class="w-10 h-0.5 bg-(--accent-brass)" aria-hidden="true"></span>
          <span :class="[KICKER, 'text-(--text-on-band)']">ABOUT</span>
        </div>
        <h1
          class="m-0 font-serif font-black text-[44px] sm:text-[64px] lg:text-[92px] leading-[1.12] tracking-[0.02em] text-(--text-on-band)"
        >
          私人藏書<br />公開目錄
        </h1>
        <p
          class="mt-5 lg:mt-7 mb-0 max-w-[620px] text-[17px] lg:text-[19px] leading-[1.7] text-(--text-on-band)"
        >
          文章、技術與專案，編成可以查詢的目錄，彼此以雙向關係連結。
        </p>
      </div>
    </header>

    <!-- ② SCOPE：收了什麼、為什麼這樣編 -->
    <section class="bg-(--bg-paper-light) pt-16 pb-16 lg:pt-[112px] lg:pb-[104px]">
      <div :class="[WRAP, 'grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-10 items-start']">
        <div class="lg:col-span-6 flex flex-col gap-4">
          <div :class="[KICKER, 'text-(--text-accent)']">SCOPE</div>
          <h2 :class="H2">文章、技術、專案<br />一份可查詢的目錄</h2>
          <p class="mt-5 mb-0 text-[18px] leading-[1.75] text-(--text-ink-main)">
            只收我自己寫過的文章、用過的技術、做過的專案。
          </p>
          <p class="m-0 text-[16px] leading-[1.75] text-(--text-ink-body)">
            每一筆都跟相關的其他筆連起來，整個目錄就是一張可以點著走的圖。
          </p>
          <p class="m-0 text-[16px] leading-[1.75] text-(--text-ink-body)">
            這套分類和雙向關係，來自我的圖書資訊學背景，跟圖書館編目錄是同一套想法。
          </p>
        </div>
        <figure class="lg:col-start-8 lg:col-span-5 m-0 lg:mt-2">
          <img
            :src="drawerPhoto"
            alt="一只拉出來的卡片目錄抽屜，裡面排滿索引卡"
            class="block w-full h-[240px] sm:h-[300px] object-cover rounded-[4px] bg-(--bg-folder)"
            :style="{ boxShadow: shadow(8, 14) }"
          />
        </figure>
      </div>
    </section>

    <!-- ③ RELATIONS：雙向關係，用一條真的關係從兩頭示範 -->
    <section class="bg-(--bg-paper-dark) pt-16 pb-16 lg:pt-[104px] lg:pb-[112px]">
      <div :class="[WRAP, 'flex flex-col gap-10 lg:gap-14']">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-5 items-start">
          <div class="lg:col-span-5 flex flex-col gap-4">
            <div :class="[KICKER, 'text-(--text-accent)']">RELATIONS</div>
            <h2 :class="H2">從哪一頭<br />都找得回來</h2>
          </div>
          <p
            class="lg:col-start-7 lg:col-span-6 m-0 lg:mt-[34px] text-[17px] lg:text-[18px] leading-[1.75] text-(--text-ink-main)"
          >
            每篇文章、每項技術、每個專案都登記在目錄裡，彼此的關係也一起登記，而且兩頭都算數：從一篇文章，能找到它寫了哪些技術；從一項技術，也能反查它出現在哪些文章和專案。
          </p>
        </div>

        <!-- 目錄卡：橫線是卡片上的格線，底部圓孔是穿目錄桿的孔，都是裝飾 -->
        <div
          class="relative self-center w-full max-w-[880px] rounded-[6px] px-5 pt-7 pb-14 sm:px-14 sm:pt-9 sm:pb-16 flex flex-col gap-[30px] bg-(--bg-paper-light)"
          :style="{
            backgroundImage: `repeating-linear-gradient(180deg, transparent 0, transparent 39px, ${mix('--text-ink-main', 9)} 39px, ${mix('--text-ink-main', 9)} 40px)`,
            boxShadow: shadow(10, 16, '0 18px 40px'),
          }"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div :class="[MONO, 'font-bold text-[15px] text-(--text-ink-main)']">
              同一條關係，從兩頭看
            </div>
            <div class="flex gap-2" role="group" aria-label="切換從哪一頭看這條關係">
              <button
                v-for="opt in DIRECTIONS"
                :key="opt.value"
                type="button"
                :aria-pressed="dir === opt.value"
                :class="[
                  MONO,
                  'min-h-11 px-[18px] rounded-[6px] text-[15px] font-bold cursor-pointer border transition-colors',
                  dir === opt.value
                    ? 'bg-(--bg-band-strong) border-(--bg-band-strong) text-(--text-on-band)'
                    : 'bg-(--bg-paper-light) text-(--text-ink-main)',
                ]"
                :style="dir === opt.value ? undefined : { borderColor: mix('--text-ink-main', 35) }"
                @click="dir = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div class="min-h-[224px] flex flex-col justify-center">
            <!-- 從文章看：文件 —寫到→ 技術 -->
            <div
              v-if="dir === 'forward'"
              class="flex flex-col items-center gap-3 sm:grid sm:grid-cols-[3fr_5fr_3fr] sm:gap-x-7 sm:items-end"
            >
              <EntryChip
                :code="CLASSES.doc.code"
                :label="CLASSES.doc.name"
                :fill="CLASSES.doc.fill"
                title="這篇文章"
                focus
              />
              <RelationArrow label="寫到" predicate="specs" />
              <EntryChip
                :code="CLASSES.tech.code"
                :label="CLASSES.tech.name"
                :fill="CLASSES.tech.fill"
                title="vue3"
                end
              />
            </div>

            <!-- 從技術看：技術 —被寫到→ 文件、技術 —用在→ 實作。反向是兩條關係，所以是兩支箭頭 -->
            <div
              v-else
              class="flex flex-col items-center gap-3 sm:grid sm:grid-cols-[3fr_5fr_3fr] sm:grid-rows-[auto_auto] sm:gap-x-7 sm:gap-y-[18px] sm:items-end"
            >
              <div class="sm:row-span-2 sm:self-center">
                <EntryChip
                  :code="CLASSES.tech.code"
                  :label="CLASSES.tech.name"
                  :fill="CLASSES.tech.fill"
                  title="vue3"
                  focus
                />
              </div>
              <RelationArrow label="被寫到" predicate="specifiedBy" />
              <EntryChip
                :code="CLASSES.doc.code"
                :label="CLASSES.doc.name"
                :fill="CLASSES.doc.fill"
                title="這篇文章"
                end
              />
              <RelationArrow label="用在" predicate="uses" />
              <EntryChip
                :code="CLASSES.impl.code"
                :label="CLASSES.impl.name"
                :fill="CLASSES.impl.fill"
                title="my-dev-grid"
                end
              />
            </div>
          </div>

          <p
            class="m-0 text-center text-[18px] sm:text-[20px] font-bold leading-[1.6] text-(--text-ink-main)"
            aria-live="polite"
          >
            {{ sentence }}
          </p>
          <div
            class="absolute left-1/2 bottom-[18px] w-[18px] h-[18px] -ml-[9px] rounded-full bg-(--bg-paper-dark)"
            :style="{ boxShadow: `inset 0 1px 2px ${mix('--bg-nav-footer', 35)}` }"
            aria-hidden="true"
          ></div>
        </div>
      </div>
    </section>

    <!-- ④ CLASS NUMBERS：三大類與它們之間的述詞。述詞以後端 RelationSeeder 為準
         （文件→技術 specs、文件→實作 documents、技術→實作 uses，技術當主詞是本專案慣例） -->
    <section
      class="bg-(--bg-band-strong) pt-16 pb-16 lg:pt-24 lg:pb-[104px]"
      style="
        background-image:
          repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.028) 0,
            rgba(255, 255, 255, 0.028) 1px,
            transparent 1px,
            transparent 3px
          ),
          repeating-linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.07) 0,
            rgba(0, 0, 0, 0.07) 1px,
            transparent 1px,
            transparent 3px
          );
      "
    >
      <div :class="[WRAP, 'flex flex-col gap-10']">
        <div class="flex flex-col gap-3.5">
          <div :class="[KICKER, 'text-(--accent-brass)']">CLASS NUMBERS</div>
          <h2
            class="m-0 font-serif font-black text-[30px] sm:text-[34px] lg:text-[40px] leading-[1.3] text-(--text-on-band)"
          >
            目錄分成三大類
          </h2>
        </div>

        <!-- 桌機：三張分類卡排成三角形，連線是雙向箭頭。座標照設計稿的 1088×470 畫框換算成百分比，
             窄一點的桌機（1024 起）等比例縮 -->
        <div class="hidden lg:block relative w-full max-w-[1088px] aspect-[1088/470] self-center">
          <svg
            viewBox="0 0 1088 470"
            class="absolute inset-0 w-full h-full text-(--accent-brass)"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="about-class-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
              </marker>
            </defs>
            <g
              stroke="currentColor"
              stroke-width="2"
              marker-start="url(#about-class-arrow)"
              marker-end="url(#about-class-arrow)"
            >
              <line x1="203" y1="346" x2="466" y2="124" />
              <line x1="260" y1="411" x2="828" y2="411" />
              <line x1="622" y1="124" x2="885" y2="346" />
            </g>
          </svg>
          <ClassCard
            v-for="c in CLASS_LIST"
            :key="c.code"
            :card="c"
            class="absolute w-[22.98%]"
            :style="{ left: c.pos.left, top: c.pos.top }"
          />
          <RelationLabel
            v-for="r in CLASS_RELATIONS"
            :key="r.predicates"
            :relation="r"
            class="absolute -translate-x-1/2 -translate-y-1/2"
            :style="{ left: r.pos.left, top: r.pos.top }"
          />
        </div>

        <!-- 手機與平板：三角形放不下，改成三張卡並排或直排，下面列出三條關係 -->
        <div class="lg:hidden flex flex-col gap-6">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ClassCard v-for="c in CLASS_LIST" :key="c.code" :card="c" />
          </div>
          <ul class="m-0 p-0 list-none flex flex-col gap-3">
            <li
              v-for="r in CLASS_RELATIONS"
              :key="r.predicates"
              class="flex flex-wrap items-center gap-3"
            >
              <span class="text-[15px] text-(--text-on-band)">{{ r.from }} ↔ {{ r.to }}</span>
              <RelationLabel :relation="r" />
            </li>
          </ul>
        </div>

        <div
          class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-8 border-t"
          :style="{ borderColor: mix('--text-on-band', 18) }"
        >
          <span class="text-[16px] text-(--text-on-band)">
            三類之間的關係都是雙向登記的。實際的每一筆資料和連結，在知識圖譜裡看。
          </span>
          <router-link
            to="/graph"
            :class="[
              MONO,
              'self-start sm:self-auto shrink-0 inline-flex items-center min-h-11 px-[22px] rounded-[6px] border-[1.5px] border-(--accent-brass) text-(--accent-brass) font-bold text-[15px] tracking-[0.06em] no-underline hover:bg-(--accent-brass) hover:text-(--bg-band-strong) transition-colors',
            ]"
          >
            看知識圖譜
          </router-link>
        </div>
      </div>
    </section>

    <!-- ⑤ COLOPHON：誰做了什麼。系統設計拆兩半：畫面是 Claude 的，架構與規則是我的 -->
    <section class="bg-(--bg-paper-light) pt-16 pb-16 lg:pt-[104px] lg:pb-[112px]">
      <div :class="[WRAP, 'flex flex-col gap-10 lg:gap-14']">
        <div class="flex flex-col gap-4">
          <div :class="[KICKER, 'text-(--text-accent)']">COLOPHON</div>
          <h2 :class="H2">程式和畫面多半出自 AI<br />架構和規則由我決定</h2>
        </div>

        <!-- 分隔線設計稿是藏青 #162541；用 --text-ink-main（淺色 #202839）是為了深色主題下還看得到 -->
        <div
          class="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-12 border-t-2 border-(--text-ink-main) pt-11 items-start"
        >
          <div class="lg:col-span-4 flex flex-col gap-[18px]">
            <div
              class="font-serif font-black text-[64px] lg:text-[80px] leading-[0.9] text-(--text-accent)"
            >
              人工
            </div>
            <SeparatedList
              :items="HUMAN_ROLES"
              class="text-[18px] leading-[1.8] text-(--text-ink-main)"
            />
            <p class="m-0 text-[16px] leading-[1.75] text-(--text-ink-body)">
              這些由我決定：資料怎麼建模、系統怎麼分層、AI
              之間怎麼分工和交接、成果用什麼規則審核，最後由我驗收。
            </p>
          </div>

          <div class="lg:col-start-6 lg:col-span-7 flex flex-col gap-[18px]">
            <div class="flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <div
                :class="[
                  MONO,
                  'font-bold text-[64px] lg:text-[80px] leading-[0.9] text-(--text-ink-main)',
                ]"
              >
                AI
              </div>
              <div class="text-[16px] leading-[1.6] text-(--text-ink-body)">
                程式和畫面主要由 Claude 做，另外有兩組 plugin 輔助：
              </div>
            </div>

            <div
              class="rounded-[4px] bg-(--bg-paper-light) px-[22px] pt-5 pb-[22px] flex flex-col gap-2"
              :style="{ boxShadow: shadow(10, 10, '0 6px 14px') }"
            >
              <div class="flex items-baseline justify-between gap-3">
                <span class="text-[20px] font-bold text-(--text-ink-main)">Claude</span>
                <span :class="[MONO, 'font-bold text-[13px] text-(--text-ink-muted)']"
                  >主 session · main</span
                >
              </div>
              <span class="text-[15px] leading-[1.7] text-(--text-ink-body)"
                >全專案協調兼 PM，實際動手的部分也最多：</span
              >
              <SeparatedList
                :items="CLAUDE_ROLES"
                class="text-[16px] leading-[1.9] text-(--text-ink-main)"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div
                v-for="p in PLUGINS"
                :key="p.name"
                class="rounded-[4px] bg-(--bg-paper-light) px-[18px] pt-4 pb-[18px] flex flex-col gap-2"
                :style="{ boxShadow: shadow(10, 10, '0 6px 14px') }"
              >
                <div class="flex flex-col gap-0.5">
                  <span class="text-[18px] font-bold text-(--text-ink-main)">{{ p.title }}</span>
                  <span :class="[MONO, 'font-bold text-[13px] text-(--text-ink-muted)']"
                    >plugin · {{ p.name }}</span
                  >
                </div>
                <span class="text-[14px] leading-[1.65] text-(--text-ink-body)">{{ p.desc }}</span>
                <span :class="[MONO, 'font-bold text-[13px] text-(--text-accent)']">
                  附帶 agent：<template v-for="(a, i) in p.agents" :key="a"
                    ><template v-if="i > 0"> · </template
                    ><span class="whitespace-nowrap">{{ a }}</span></template
                  >
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑥ AUTHOR：作者只留一行（D-58），連結用 44px 的圖示按鈕 -->
    <section class="bg-(--bg-band-strong) py-10 lg:py-11">
      <div :class="[WRAP, 'flex flex-wrap items-center gap-x-7 gap-y-3']">
        <span :class="[KICKER, 'text-(--accent-brass)']">AUTHOR</span>
        <span class="text-[18px] font-bold text-(--text-on-band) whitespace-nowrap">Jerry Yeh</span>
        <span class="text-[16px] text-(--text-on-band)">圖書資訊學背景，現在做後端。</span>
        <span class="sm:ml-auto flex gap-3 text-(--accent-brass)">
          <a
            v-for="l in LINKS"
            :key="l.label"
            :href="l.href"
            :aria-label="l.label"
            :title="l.label"
            class="inline-flex items-center justify-center w-11 h-11 rounded-[6px] border hover:bg-(--accent-brass) hover:text-(--bg-band-strong) transition-colors"
            :style="{ borderColor: mix('--accent-brass', 50) }"
            v-bind="l.external ? { target: '_blank', rel: 'noopener' } : {}"
          >
            <svg
              v-if="l.icon === 'github'"
              width="20"
              height="20"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
          </a>
        </span>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, defineComponent, h, type PropType } from 'vue'
import heroPhoto from '@/assets/about/card-catalog-hero.jpg'
import drawerPhoto from '@/assets/about/catalog-drawer.jpg'

// 設計稿用 Courier Prime 當分類號／小標的字（index.html 已載入），Tailwind 的 font-mono 是系統等寬字，不是它
const MONO = "font-['Courier_Prime',ui-monospace,monospace]"
const KICKER = `${MONO} font-bold text-[13px] tracking-[0.24em]`
const H2 =
  'm-0 font-serif font-black text-[30px] sm:text-[38px] lg:text-[46px] leading-[1.3] text-(--text-ink-main)'
// 內容欄：設計稿是 1280 寬的畫框、左右各 96px，等於內容 1088px
const WRAP = 'mx-auto w-full max-w-[1088px] px-5 sm:px-8 xl:px-0'

/** 設計稿裡沒有 token 的半透明色，都是某個 token 的透明版本，用 color-mix 從 token 算，換主題時跟著走 */
function mix(token: string, percent: number): string {
  return `color-mix(in srgb, var(${token}) ${percent}%, transparent)`
}
/**
 * 設計稿的藏青陰影（rgba(22,37,65,…)）。用 --bg-nav-footer 算：淺色主題它就是 #162541，
 * 深色主題是近黑的 #040a1a，陰影才不會在深底上變成一圈亮邊
 */
function shadow(edge: number, blur: number, far = '0 14px 30px'): string {
  return `0 1px 0 ${mix('--bg-nav-footer', edge)}, ${far} ${mix('--bg-nav-footer', blur)}`
}

type Dir = 'forward' | 'backward'
const DIRECTIONS: { value: Dir; label: string }[] = [
  { value: 'forward', label: '從文章看' },
  { value: 'backward', label: '從技術看' },
]
const dir = ref<Dir>('forward')
const sentence = computed(() =>
  dir.value === 'forward'
    ? '從這篇文章，找到它寫到的技術：vue3。'
    : '從 vue3 反查，列出寫到它的文章、用到它的專案，這篇也在裡面。',
)

const CLASSES = {
  doc: {
    code: '0000',
    name: '文件',
    desc: '文章、參考資料',
    fill: '--cat-fill-doc',
    pos: { left: '0%', top: '74.89%' },
  },
  tech: {
    code: '1000',
    name: '技術',
    desc: '語言、框架、工具',
    fill: '--cat-fill-tech',
    pos: { left: '38.51%', top: '0%' },
  },
  impl: {
    code: '2000',
    name: '實作',
    desc: '專案',
    fill: '--cat-fill-impl',
    pos: { left: '77.02%', top: '74.89%' },
  },
}
const CLASS_LIST = [CLASSES.doc, CLASSES.tech, CLASSES.impl]
type ClassDef = (typeof CLASS_LIST)[number]

// 標籤座標同樣是設計稿 1088×470 畫框裡的中心點換算成百分比
const CLASS_RELATIONS = [
  {
    from: '文件',
    to: '技術',
    label: '寫到',
    predicates: 'specs / specifiedBy',
    pos: { left: '30.70%', top: '50%' },
  },
  {
    from: '文件',
    to: '實作',
    label: '記錄',
    predicates: 'documents / documentedBy',
    pos: { left: '50%', top: '87.45%' },
  },
  {
    from: '技術',
    to: '實作',
    label: '用在',
    predicates: 'uses / used',
    pos: { left: '69.30%', top: '50%' },
  },
]
type RelationDef = (typeof CLASS_RELATIONS)[number]

const HUMAN_ROLES = ['資料模型', '系統架構', 'AI 分工與交接', '審核規則', '驗收']
const CLAUDE_ROLES = [
  '需求拆解與排程',
  '前後端程式碼',
  '設計稿與配色',
  '測試與 CI 修正',
  '審核 PR',
  '派工給其他 AI',
  '決策紀錄與文件',
]
const PLUGINS = [
  {
    title: '設計稿還原',
    name: 'mockup-fidelity',
    desc: '判斷新功能要不要先畫設計稿；照稿實作時，逐項比對字級、顏色、間距。',
    agents: ['fidelity-check', 'ux-review'],
  },
  {
    title: '設計稿管理',
    name: 'design-canvas-workflow',
    desc: '設計稿怎麼找、怎麼讀、決定記在哪，不讓設計決定只留在某次對話裡。',
    agents: ['extract-canvas-tokens'],
  },
]
const LINKS = [
  { label: 'GitHub', href: 'https://github.com/jerryyehself', icon: 'github', external: true },
  { label: 'Email', href: 'mailto:jerry40522@gmail.com', icon: 'mail', external: false },
]

// ---- 這頁專用的小元件：只在這裡用，抽成獨立檔案反而要多跳一層才看得懂 ----

/** 切換卡裡的一筆條目：上面是分類號，下面是條目名。focus 是「從哪一頭看」的那一筆，框線改成強調色 */
const EntryChip = defineComponent({
  props: {
    code: { type: String, required: true },
    label: { type: String, required: true },
    fill: { type: String, required: true },
    title: { type: String, required: true },
    focus: Boolean,
    end: Boolean,
  },
  setup(props) {
    return () =>
      h(
        'div',
        { class: ['flex flex-col gap-2 items-center w-fit', props.end ? 'sm:ml-auto' : ''] },
        [
          h(
            'span',
            { class: [MONO, 'font-bold text-[14px]'], style: { color: `var(${props.fill})` } },
            `${props.code} ${props.label}`,
          ),
          h(
            'span',
            {
              class: [
                'text-[20px] sm:text-[22px] font-bold rounded-[6px] px-5 py-3 whitespace-nowrap',
                props.focus
                  ? 'border-2 border-(--text-accent) bg-(--bg-paper-light) text-(--text-ink-main)'
                  : 'border bg-(--bg-folder) text-(--text-ink-body)',
              ],
              style: props.focus ? undefined : { borderColor: mix('--text-ink-main', 30) },
            },
            props.title,
          ),
        ],
      )
  },
})

/**
 * 述詞＋箭頭。箭頭用 CSS 畫（線段＋三角形），不用 → 字元：字元箭頭的粗細和垂直位置
 * 會跟著字型走，跟線段對不齊（使用者決定 #11）。手機版改成往下的箭頭。
 * 顏色設計稿是 #162541；用 --text-ink-main 是為了深色主題下箭頭還看得到
 */
const RelationArrow = defineComponent({
  props: {
    label: { type: String, required: true },
    predicate: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h('div', { class: 'flex flex-col items-center gap-1.5 sm:mb-[26px] w-full' }, [
        h('span', { class: 'text-[15px] font-bold text-(--text-ink-main)' }, props.label),
        h('span', { class: [MONO, 'text-[13px] text-(--text-ink-muted)'] }, props.predicate),
        // 桌機：水平
        h('div', { class: 'hidden sm:flex items-center w-full mt-1', 'aria-hidden': 'true' }, [
          h('div', { class: 'flex-1 h-0.5 bg-(--text-ink-main)' }),
          h('div', {
            class:
              'w-0 h-0 border-y-[6px] border-y-transparent border-l-[11px] border-l-(--text-ink-main)',
          }),
        ]),
        // 手機：垂直
        h(
          'div',
          { class: 'flex sm:hidden flex-col items-center h-8 mt-1', 'aria-hidden': 'true' },
          [
            h('div', { class: 'flex-1 w-0.5 bg-(--text-ink-main)' }),
            h('div', {
              class:
                'w-0 h-0 border-x-[6px] border-x-transparent border-t-[11px] border-t-(--text-ink-main)',
            }),
          ],
        ),
      ])
  },
})

/**
 * 分類卡：黃銅框＋分類號色帶＋類名。黃銅框的漸層設計稿是 #d9b06a→#a87a35，
 * 這裡用 --accent-brass 往亮、往暗各推一階（淺色主題約 #d1a968→#a57e3f），換主題時跟著走。
 * 分類號是白字放在 --cat-fill-* 上——那組顏色就是針對白字 4.5:1 驗證過的，兩個主題同值
 */
const ClassCard = defineComponent({
  props: { card: { type: Object as PropType<ClassDef>, required: true } },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'box-border border-[3px] border-(--accent-brass) rounded-[3px] p-1',
          style: {
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--accent-brass), white 15%), color-mix(in srgb, var(--accent-brass), black 18%))',
            boxShadow: '0 6px 14px rgba(0, 0, 0, 0.3)',
          },
        },
        [
          h('div', { class: 'bg-(--bg-paper-light) flex flex-col' }, [
            h(
              'div',
              {
                class: [MONO, 'px-4 py-1.5 font-bold text-[18px] tracking-[0.12em] text-white'],
                style: { background: `var(${props.card.fill})` },
              },
              props.card.code,
            ),
            h('div', { class: 'px-4 pt-3 pb-3.5 flex flex-col gap-1' }, [
              h(
                'span',
                { class: 'font-serif font-black text-[26px] text-(--text-ink-main)' },
                props.card.name,
              ),
              h('span', { class: 'text-[15px] text-(--text-ink-body)' }, props.card.desc),
            ]),
          ]),
        ],
      )
  },
})

/** 三類之間的述詞標籤，放在色帶上 */
const RelationLabel = defineComponent({
  props: { relation: { type: Object as PropType<RelationDef>, required: true } },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class:
            'inline-flex flex-col items-center gap-0.5 whitespace-nowrap rounded-[6px] border px-3.5 py-2 bg-(--bg-band-strong)',
          style: { borderColor: mix('--accent-brass', 55) },
        },
        [
          h('span', { class: 'text-[16px] font-bold text-(--text-on-band)' }, props.relation.label),
          h(
            'span',
            { class: [MONO, 'text-[13px] text-(--accent-brass)'] },
            props.relation.predicates,
          ),
        ],
      )
  },
})

/** 用「｜」隔開的清單，每一項不斷行 */
const SeparatedList = defineComponent({
  props: { items: { type: Array as PropType<string[]>, required: true } },
  setup(props) {
    return () =>
      h(
        'div',
        props.items.flatMap((item, i) => [
          ...(i > 0
            ? [h('span', { class: 'text-(--text-accent)', 'aria-hidden': 'true' }, '｜')]
            : []),
          h('span', { class: 'whitespace-nowrap' }, item),
        ]),
      )
  },
})
</script>
