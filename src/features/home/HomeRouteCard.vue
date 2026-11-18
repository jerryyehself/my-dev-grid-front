<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { FAMILY_COLOR } from '@/api/ontology'
import { graphNodeLink } from '@/components/graphNodeLink'
import { nodeKindLabel } from '@/features/graph/graphTypes'
import { titleOfRoute, type HomeRoute } from './homeRoute'

// 首頁的第一順位：一條從文章出發的路線（C 版，路線當主角）。每一站是圖上真的節點、每一段是真的關係；
// 同一條路線在下面的圖上亮起來。標題的類別依這條路線實際經過的站組字（homeRoute.ts 的 routeTitle），
// 沒有路線時退回不列類別的寫法，並隱藏換路線按鈕。
const props = defineProps<{
  route: HomeRoute | null
  /** 有不只一條路線可換才顯示「↻ 另一條路線」（見 homeRoute.ts 的 canSwitchRoute） */
  canSwitch: boolean
}>()
defineEmits<{ switch: [] }>()

const title = computed(() => titleOfRoute(props.route))

// 站名可以點的才給連結：文章去文章頁、實作去專案頁，技術站上沒有頁面（規則同圖上的小卡）
const stations = computed(() =>
  (props.route?.stations ?? []).map((s) => {
    const link = graphNodeLink({ id: s.id, domainType: s.type, subtype: s.subtype })
    return {
      ...s,
      kind: nodeKindLabel({ domainType: s.type, subtype: s.subtype }),
      color: FAMILY_COLOR[s.type],
      to: link?.kind === 'internal' ? link.to : null,
    }
  }),
)
</script>

<template>
  <section
    aria-labelledby="home-route-title"
    class="w-full rounded-xl border border-(--border-shelf) bg-(--bg-folder) px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6"
  >
    <div class="flex items-start justify-between gap-3">
      <h2
        id="home-route-title"
        class="m-0 text-(length:--type-label-size) tracking-(--type-label-tracking) font-bold text-(--text-accent) leading-(--type-label-leading) pt-3"
      >
        {{ title }}
      </h2>
      <button
        v-if="canSwitch"
        type="button"
        class="shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-md border border-(--border-shelf) bg-(--bg-paper-light) text-(length:--type-label-size) text-(--text-ink-body) hover:text-(--text-accent) hover:border-(--text-accent) cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
        @click="$emit('switch')"
      >
        <span aria-hidden="true">↻</span>另一條路線
      </button>
    </div>

    <ol
      v-if="route"
      class="mt-3 grid grid-cols-[58px_minmax(0,1fr)] items-baseline gap-x-2 gap-y-0.5 md:flex md:flex-wrap md:items-center md:gap-2"
    >
      <!-- 手機：銜接詞佔 58px 一欄、站在右欄，第一站橫跨整列；li 用 contents 讓它們直接進 grid -->
      <li
        v-for="(s, i) in stations"
        :key="s.id"
        class="contents md:flex md:items-center md:gap-2 md:min-w-0"
      >
        <span
          v-if="i > 0"
          class="shrink-0 text-(length:--type-label-size) tracking-(--type-label-tracking) text-(--text-ink-muted) whitespace-nowrap"
          >{{ route.verbs[i - 1] }} <span aria-hidden="true">▸</span></span
        >
        <component
          :is="s.to ? RouterLink : 'span'"
          :to="s.to ?? undefined"
          class="min-w-0 inline-flex items-baseline gap-2 min-h-11 text-(length:--type-body-size) leading-(--type-ui-leading) text-(--text-ink-main) md:px-3 md:py-2 md:rounded-md md:border md:border-(--border-shelf) md:bg-(--bg-paper-light)"
          :class="[
            i === 0 ? 'max-md:col-span-full' : '',
            s.to ? 'md:hover:border-(--text-accent) transition-colors' : '',
          ]"
        >
          <span class="shrink-0 inline-flex items-center gap-1.5 text-(length:--type-label-size) text-(--text-ink-muted)">
            <span
              aria-hidden="true"
              class="w-2 h-2 rounded-full"
              :style="{ background: s.color }"
            ></span
            >{{ s.kind }}
          </span>
          <span :class="i === 0 ? 'font-semibold' : 'font-normal'" class="[overflow-wrap:anywhere]">{{
            s.type === 'documentation' ? `〈${s.label}〉` : s.label
          }}</span>
        </component>
      </li>
    </ol>

    <!-- 用 div 不用 p：全站 .global-page-wrapper p 有 1.25rem 下邊距（書本段落樣式） -->
    <div v-else class="mt-2 text-[14px] leading-relaxed text-(--text-ink-body)">
      目前尚無從文章延伸的路線。文章與技術、實作建立關係後，路線會顯示在此。
    </div>
  </section>
</template>
