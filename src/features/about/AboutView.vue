<template>
  <!-- 關於頁：照 v1 定版的設計稿實作（單欄卡片，文字在左、草圖在右；頁首三類卡片線稿；
       草圖都在同一邊，卡片之間只靠留白；描線動畫尊重 prefers-reduced-motion）。
       整頁自己畫表頭與寬度（route meta 設了 hideHeader、fullBleed），顏色一律走 variables.css 的 token。
       字重 300 是設計稿的內文字重，其他頁不受影響。 -->
  <div
    ref="root"
    class="about-page pb-[88px] min-[601px]:pb-[112px] text-[17px] font-light leading-[1.75] text-(--text-ink-body)"
  >
    <div :class="WRAP">
      <header
        class="grid grid-cols-1 gap-x-14 gap-y-6 items-center pt-11 min-[861px]:pt-16 min-[861px]:grid-cols-[minmax(0,1fr)_minmax(0,340px)]"
      >
        <div class="min-w-0 max-sm:text-center">
          <h1
            class="m-0 font-serif font-bold text-[36px] min-[601px]:text-[44px] leading-[1.25] tracking-[0.01em] text-(--text-ink-main)"
          >
            Jerry Yeh
          </h1>
          <p
            class="font-display mt-[18px] mb-0 max-w-[24em] text-[20px] min-[601px]:text-[23px] leading-[1.65] text-(--text-ink-main) text-pretty max-sm:mx-auto max-sm:text-balance max-sm:break-keep"
          >
            <span v-for="phrase in CAREER_PHRASES" :key="phrase" class="min-[601px]:inline-block">{{
              phrase
            }}</span>
          </p>
          <p class="mt-3.5 mb-0 text-sm leading-[1.75] text-(--text-ink-muted)">{{ BYLINE }}</p>
          <p class="mt-6 mb-0 flex flex-wrap gap-3 max-sm:justify-center">
            <a :href="GITHUB_URL" :class="BUTTON">
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                />
              </svg>
              GitHub
            </a>
            <!-- 信箱還沒填（CONTACT_EMAIL 是空字串）就不畫這顆按鈕 -->
            <a v-if="CONTACT_EMAIL" :href="`mailto:${CONTACT_EMAIL}`" :class="BUTTON">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              電子郵件
            </a>
          </p>
        </div>
        <div
          class="draw max-w-[300px] max-sm:mx-auto min-[861px]:max-w-none"
          data-testid="about-hero-art"
        >
          <AboutHeroArt />
        </div>
      </header>

      <section class="pt-16 min-[601px]:pt-[72px]" aria-labelledby="about-ways">
        <h2
          id="about-ways"
          class="m-0 font-serif font-bold text-[28px] min-[601px]:text-[32px] leading-[1.3] text-(--text-accent) text-balance sm:max-w-[880px] sm:mx-auto"
        >
          工作模式與理念
        </h2>
        <ul
          class="mt-8 p-0 list-none grid grid-cols-[minmax(0,1fr)] gap-12 sm:gap-8 sm:max-w-[880px] sm:mx-auto"
        >
          <AboutCard v-for="card in ABOUT_CARDS" :key="card.id" :card="card" />
        </ul>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { BYLINE } from '@/copy/common'
import AboutCard from './AboutCard.vue'
import AboutHeroArt from './AboutHeroArt.vue'
import { ABOUT_CARDS } from './aboutCards'
import { CONTACT_EMAIL, GITHUB_URL } from './aboutConfig'
import { useDrawOnScroll } from './useDrawOnScroll'
import './aboutSketch.css'

// 內容欄：寬 1120（含左右內距），內距 12／16／24（<360／<640／≥640），跟導覽列與 MainLayout 同一組
const WRAP = 'mx-auto w-full max-w-[1120px] px-3 min-[360px]:px-4 sm:px-6'

// 頁首按鈕（GitHub、電子郵件）
const BUTTON =
  'inline-flex items-center gap-2 min-h-11 px-4 border border-(--text-ink-body) rounded-md text-base leading-[1.75] font-normal text-(--text-ink-main) no-underline transition-[background-color,color] duration-hover-out hover:duration-hover-in hover:bg-(--text-ink-main) hover:text-(--bg-page) motion-reduce:transition-none'

// 職涯句分成幾個詞組：桌機每組不拆行（inline-block），手機接成一般文字
const CAREER_PHRASES = [
  '圖書資訊學出身，',
  '兩年程式教學、三年後端工程師。',
  '習慣先替東西分類、',
  '找出彼此的關係，再寫成程式。',
]

const root = ref<HTMLElement | null>(null)
useDrawOnScroll(root)
</script>
