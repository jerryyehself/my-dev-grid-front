<script setup lang="ts">
import { computed } from 'vue'
import type { Project } from '@/api/projects'
import { techniqueLabel } from '@/api/techniqueLabel'
import { techIconOf } from './projectTechIcons'
import { orderedTechniques } from './useProjectsFilter'

// 桌機版右欄詳情。設計稿：沒有框、沒有標題上方的標籤；
// 三組（標題＋描述／技術標籤／STARTED＋REPO）組內 8～16、組間 40，不靠分隔線。
// 型字只有 36/44（標題）、16/28（描述）、16/24（值）、13/20（小標籤）四種。
const props = defineProps<{ project: Project }>()

// 技術標籤照篩選器的分類順序排。有品牌圖示的畫成「圖示＋名稱」，沒有的是文字標籤，接在後面一行
const techniques = computed(() =>
  orderedTechniques(props.project).map((t) => ({
    label: techniqueLabel(t.name, t.version),
    icon: techIconOf(t.name),
  })),
)
const withLogo = computed(() => techniques.value.filter((t) => t.icon))
const textOnly = computed(() => techniques.value.filter((t) => !t.icon))

const labelClass = 'text-[13px] leading-5 tracking-[0.05em] text-(--text-ink-muted)'
const isArchived = computed(() => props.project.statusType === 'archived')

// 品牌色的相對亮度很低（接近黑色）時，在深色主題會看不見
function isNearBlack(hex: string): boolean {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! < 0.03
}
</script>

<template>
  <div class="min-w-0 pt-4">
    <div>
      <!-- 站上通用的 .global-page-wrapper h2／p 有自己的字級、邊距、對齊，這裡的 utility 要明確蓋過 -->
      <h2
        class="mt-2 mb-0 block text-[36px] leading-[44px] font-bold tracking-[-0.01em] break-words text-(--text-ink-main) font-serif"
      >
        {{ project.title }}
      </h2>
      <p v-if="project.desc" class="m-0 mt-4 max-w-[544px] text-left text-base leading-7 text-(--text-ink-body)">
        {{ project.desc }}
      </p>
    </div>

    <div v-if="techniques.length" class="mt-10">
      <ul v-if="withLogo.length" class="m-0 flex list-none flex-wrap gap-x-6 gap-y-3 p-0">
        <li
          v-for="tech in withLogo"
          :key="tech.label"
          class="inline-flex h-7 items-center gap-2 text-[13px] leading-5 tracking-[0.04em] text-(--text-ink-body)"
        >
          <!-- 第三方 logo 用品牌原色、不改圖；品牌色接近黑色的（GitHub Pages、JSON）在深色主題改用文字色，
               對應品牌本身提供的反白版本。路徑資料來自 simple-icons，用 <path :d> 畫，不經過 v-html -->
          <svg
            class="tech-logo size-4 shrink-0"
            :class="isNearBlack(tech.icon!.hex) && 'tech-logo--dark-brand'"
            :style="{ '--brand': `#${tech.icon!.hex}` }"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path :d="tech.icon!.path" />
          </svg>
          {{ tech.label }}
        </li>
      </ul>
      <ul v-if="textOnly.length" class="m-0 flex list-none flex-wrap gap-2 p-0" :class="withLogo.length > 0 && 'mt-4'">
        <li
          v-for="tech in textOnly"
          :key="tech.label"
          class="inline-flex h-7 items-center rounded-[4px] bg-(--bg-folder) px-3 text-[13px] leading-5 tracking-[0.04em] text-(--text-ink-body)"
        >
          {{ tech.label }}
        </li>
      </ul>
    </div>

    <!-- 封存的專案多一欄 STATUS；進行中的專案不標（active 是預設，標了是噪音） -->
    <dl
      class="m-0 mt-10 grid gap-x-10"
      :class="isArchived ? 'grid-cols-[128px_auto_auto] justify-start' : 'grid-cols-[128px_minmax(0,1fr)]'"
    >
      <div>
        <dt :class="labelClass">STARTED</dt>
        <dd class="m-0 mt-1 text-base leading-6 text-(--text-ink-main)">{{ project.started || '—' }}</dd>
      </div>
      <div class="min-w-0">
        <dt :class="labelClass">REPO</dt>
        <dd class="m-0 mt-1 text-base leading-6 [overflow-wrap:anywhere]">
          <a
            :href="`https://github.com/jerryyehself/${project.repo}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-(--text-ink-main) hover:text-(--text-accent) hover:underline"
          >
            {{ project.repo }}
          </a>
        </dd>
      </div>
      <div v-if="isArchived">
        <dt :class="labelClass">STATUS</dt>
        <dd class="m-0 mt-1 text-base leading-6 font-semibold text-(--text-ink-main) uppercase">{{ project.status }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.tech-logo {
  fill: var(--brand);
}
:global(html.theme-terminal .tech-logo--dark-brand) {
  fill: currentColor;
}
</style>
