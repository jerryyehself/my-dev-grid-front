<template>
  <!-- 一張卡：關鍵字 → 情境句 → 確認詳情（有連結才有）→ 草圖。
       ≥640 文字在左、草圖在右（兩欄），手機草圖接在文字下面。
       文字三項外面的 div 用 display: contents，手機是同一個直排，≥640 三項都進左欄。 -->
  <li
    :id="`about-${card.id}`"
    class="min-w-0 flex flex-col max-sm:text-center sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,320px)] sm:gap-x-12 sm:content-start"
  >
    <div class="contents">
      <h3
        class="m-0 font-serif font-bold text-[22px] min-[601px]:text-[23px] leading-[1.4] text-(--text-ink-main) sm:col-start-1"
      >
        {{ card.title }}
      </h3>
      <p
        class="mt-2 mb-0 text-[17px] leading-[1.7] text-pretty min-[601px]:min-h-[3.4em] sm:min-h-0 sm:col-start-1"
      >
        {{ card.situation }}
      </p>
      <!-- 沒有連結就整塊不畫，不放「待補」之類的提示字 -->
      <div v-if="card.links.length" class="mt-3 pb-5 sm:col-start-1">
        <p class="m-0 text-sm font-normal tracking-[0.04em] text-(--text-ink-muted)">確認詳情</p>
        <ul class="mt-0.5 p-0 list-none">
          <li
            v-for="link in card.links"
            :key="link.to"
            class="flex flex-wrap items-center gap-x-2.5 max-sm:justify-center"
          >
            <!-- 站外網址（http／https 開頭）用 <a>、開新分頁，尾巴接 ↗（跟圖譜的「前往原始網站 ↗」同一個做法）；
                 其他當站內路徑走 router-link -->
            <a
              v-if="isExternal(link.to)"
              :href="link.to"
              target="_blank"
              rel="noopener noreferrer"
              :class="linkClass"
            >
              {{ link.label }}<span aria-hidden="true">&nbsp;↗</span><span class="sr-only">（另開新分頁）</span>
            </a>
            <router-link v-else :to="link.to" :class="linkClass">
              {{ link.label }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>
    <div
      class="draw m-0 border-t border-(--border-shelf) pt-4 sm:border-t-0 sm:pt-0 sm:col-start-2 sm:row-start-1 sm:row-span-3 sm:self-start sm:w-[min(100%,400px)]"
      :class="{ 'mt-5 sm:mt-0': !card.links.length }"
    >
      <component :is="card.sketch" />
    </div>
  </li>
</template>

<script lang="ts" setup>
import type { AboutCardData } from './aboutCards'

defineProps<{ card: AboutCardData }>()

const isExternal = (to: string) => /^https?:\/\//i.test(to)

const linkClass =
  'inline-block py-2.5 text-balance text-base font-normal leading-[1.45] text-(--text-accent) underline decoration-1 underline-offset-[5px] decoration-[color-mix(in_srgb,currentColor_35%,transparent)] hover:decoration-current'
</script>
