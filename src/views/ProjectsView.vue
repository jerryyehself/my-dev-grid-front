<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import BaseTag from '@/components/BaseTag.vue'
import BaseButton from '@/components/BaseButton.vue'
import { fetchProjects, techniqueLabel, type Project } from '@/api/projects'
import { orderedTechniques, useProjectsFilter } from '@/composables/useProjectsFilter'

const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const load = async () => {
  loading.value = true
  error.value = null
  try {
    projects.value = await fetchProjects()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入專案清單失敗'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const { selectedTags, filterGroups, toggleTag, clearFilter, filteredProjects } =
  useProjectsFilter(projects)

// 首頁近況板點某個專案會帶 ?project=<id> 過來，一進來就選那一筆；以前一律連到 /projects，
// 點 isbn-scanner 卻看到清單第一筆的 idea-trigger
const route = useRoute()
const selectedId = ref(typeof route.query.project === 'string' ? route.query.project : '')
// 圖譜節點連過來帶的是後端 id（?implementation=<id>），要等專案載入後才對得到顯示用編號
const wantedImplementationId = Number(route.query.implementation) || null
const selected = computed(() => projects.value.find((p) => p.id === selectedId.value))
// 詳情裡的技術標籤：照篩選器的分類順序排；目前篩選中的技術加框，選了「Vue」就看得出這個專案用的是 Vue 3
const selectedTechniqueTags = computed(() =>
  selected.value
    ? orderedTechniques(selected.value).map((t) => ({ label: techniqueLabel(t), matched: selectedTags.value.has(t.name) }))
    : [],
)

// 篩選把目前選中的專案擠出清單時，自動切到篩選後清單的第一筆，不留一個選不到的空白詳情面板；
// 資料還沒載入完成（filteredProjects/projects 都是空陣列）時先不設定，等 API 回來再選
watch(
  filteredProjects,
  (list) => {
    if (wantedImplementationId && !selectedId.value) {
      const hit = projects.value.find((p) => p.implementationId === wantedImplementationId)
      if (hit) {
        selectedId.value = hit.id
        return
      }
    }
    if (list.some((p) => p.id === selectedId.value)) return
    const fallback = list[0] ?? projects.value[0]
    if (fallback) selectedId.value = fallback.id
  },
  { immediate: true },
)

// 從首頁近況板或圖譜連過來（帶 ?project／?implementation）時，選中的那筆可能在清單盒子的捲動
// 範圍外，讀者看不出哪一筆被選了（2026-09-30 模擬讀者審查）。資料載入、選定之後捲一次就好，
// 之後使用者自己在清單裡點的不動
let pendingScrollToSelected = Boolean(route.query.project || route.query.implementation)
const listBox = ref<HTMLElement>()
watch([selectedId, filteredProjects], async () => {
  if (!pendingScrollToSelected || !selectedId.value || !filteredProjects.value.length) return
  pendingScrollToSelected = false
  await nextTick()
  listBox.value?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
})
</script>

<template>
  <div class="w-full">
    <div v-if="loading" class="py-16 text-center text-[11px] font-mono text-(--text-ink-body)/40 tracking-widest">
      專案載入中…
    </div>

    <div v-else-if="error" class="py-16 flex flex-col items-center gap-4 text-center">
      <p class="text-[11px] font-mono text-(--text-accent) tracking-widest">載入失敗</p>
      <p class="text-sm text-(--text-ink-body)">{{ error }}</p>
      <BaseButton variant="primary" @click="load">重試</BaseButton>
    </div>

    <template v-else>
      <!-- 標籤篩選器：依後端的技術類別分組（框架／語言／套件工具…），跟下面的主從式列表共用同一份專案資料。
           分類名稱、標籤區塊是同一個 grid row 的兩個 cell，items-baseline 讓名稱文字的基線
           對齊「標籤區塊第一行」文字的基線——這是瀏覽器內建的基線對齊計算，不是用 padding
           猜出來的數字，換幾行都準（之前 items-start + pt-1 那版本是用猜的，實測還是有落差）。
           min-w-0 是必要的：沒有它，標籤 cell 的 flex-wrap 會被瀏覽器預設的
           min-width:auto 撐開成內容原始寬度，標籤不會在格線寬度內換行、直接溢出。
           2026-09-13 用 Claude Design 畫布先確認過真實標籤內容換行後的對齊效果，見
           https://claude.ai/code/artifact/17ede728-b7b3-4b2d-9f0c-7bdd3a1e0490。 -->
      <div class="border border-(--border-shelf) rounded-[10px] bg-(--bg-paper-light) px-[22px] py-[18px] mb-5 grid grid-cols-[64px_1fr] gap-x-3.5 gap-y-4 items-baseline">
        <template v-for="group in filterGroups" :key="group.label">
          <div class="text-[13px] tracking-[0.05em] text-(--text-ink-muted)">
            {{ group.label }}
          </div>
          <div class="flex flex-wrap gap-1.5 min-w-0">
            <!-- 專案數用獨立的小底色標記，不再是名稱後面接一個數字：專案標籤加上版本之後，
                 「Vue 7」「Nuxt 1」會被讀成版本號，跟詳情裡的「Vue 3」「Nuxt 3」互相矛盾
                 （2026-09-30 模擬讀者審查） -->
            <button
              v-for="tag in group.tags"
              :key="tag.label"
              type="button"
              class="inline-flex items-center gap-1.5 pl-[11px] pr-1 py-[3px] rounded-full font-mono text-[11px] border transition-colors cursor-pointer"
              :class="
                tag.selected
                  ? 'border-(--text-accent) text-(--text-accent) bg-(--bg-folder)'
                  : 'border-(--border-shelf) text-(--text-ink-body) hover:border-(--text-accent)/40'
              "
              :aria-pressed="tag.selected"
              :aria-label="`${tag.label}，${tag.count} 個專案`"
              @click="toggleTag(tag.label)"
            >
              {{ tag.label }}
              <span aria-hidden="true" class="rounded-full bg-(--bg-paper-dark) px-1.5 text-(--text-ink-muted) tabular-nums">{{
                tag.count
              }}</span>
            </button>
          </div>
        </template>
        <!-- 說明與「清除篩選」放在面板最後一列：清除鈕原本在面板上方、選了才出現，會把整個面板往下推，
             滑鼠底下的標籤跟著換掉 -->
        <div class="col-span-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 border-t border-(--border-shelf)">
          <p class="m-0 text-[13px] text-(--text-ink-muted)">小圓框裡是專案數。選一個技術會包含它的所有版本，例如選 Vue 也會找到用 Vue 3 的專案。</p>
          <button
            v-if="selectedTags.size > 0"
            type="button"
            class="font-mono text-[11px] text-(--text-accent) font-bold tracking-[0.05em] border-b border-(--text-accent) pb-0.5 cursor-pointer"
            @click="clearFilter"
          >
            清除篩選 ×
          </button>
        </div>
      </div>

      <div v-if="filteredProjects.length === 0" class="py-16 text-center text-sm text-(--text-ink-muted)">
        沒有符合篩選條件的專案。
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] border border-(--border-shelf) rounded-xl overflow-hidden bg-(--bg-paper-light)">
        <!-- 清單固定 max-h-80＋內部捲動：手機版是因為跟詳情面板上下堆疊，清單一長會把
             詳情面板擠到很下面；桌面版原本 md:max-h-none 讓清單自然展開，但跟首頁近況板
             改成固定高度後不一致，改成兩種寬度都套同一個高度上限，全站「清單裝在固定
             高度盒子裡」的慣例統一 -->
        <div ref="listBox" class="max-h-80 overflow-y-auto border-b md:border-b-0 md:border-r border-(--border-shelf)">
          <button
            v-for="proj in filteredProjects"
            :key="proj.id"
            type="button"
            :aria-current="selectedId === proj.id ? 'true' : undefined"
            class="w-full text-left px-4.5 py-4 border-b border-(--border-shelf) last:border-b-0 transition-colors cursor-pointer"
            :class="
              selectedId === proj.id
                ? 'bg-(--bg-active-row) border-l-[3px] border-l-(--text-accent)'
                : 'border-l-[3px] border-l-transparent hover:bg-(--bg-folder)/60'
            "
            @click="selectedId = proj.id"
          >
            <div class="flex items-center justify-between mb-1.5 font-mono text-[11px] text-(--text-ink-muted)">
              <span>{{ proj.id }}</span>
              <span
                v-if="proj.statusType"
                class="font-mono text-[11px] tracking-[0.05em] uppercase font-bold"
                :class="proj.statusType === 'active' ? 'text-(--text-accent)' : 'text-(--text-ink-muted)'"
              >
                {{ proj.status }}
              </span>
            </div>
            <div class="text-sm font-bold text-(--text-ink-main) leading-snug">
              {{ proj.title }}
            </div>
          </button>
          <div v-if="selectedTags.size > 0" class="px-4.5 py-4 font-mono text-[11px] text-(--text-ink-muted) opacity-60">
            {{ filteredProjects.length }} / {{ projects.length }} 個專案符合篩選
          </div>
        </div>

        <div v-if="selected" class="p-6 sm:p-8">
          <div class="flex items-center justify-between mb-5 font-mono text-[11px] tracking-wider text-(--text-ink-muted)">
            <span>{{ selected.id }}</span>
            <BaseTag v-if="selected.statusType" :tone="selected.statusType === 'active' ? 'accent' : 'muted'">
              {{ selected.status }}
            </BaseTag>
          </div>

          <h2 class="text-xl sm:text-2xl font-extrabold text-(--text-ink-main) mb-3.5">
            {{ selected.title }}
          </h2>

          <p v-if="selected.desc" class="text-sm sm:text-[15px] text-(--text-ink-body) leading-relaxed text-left sm:text-justify max-w-2xl mb-6">
            {{ selected.desc }}
          </p>

          <div class="flex flex-wrap gap-2 font-mono text-[11px] mb-6">
            <BaseTag
              v-for="tag in selectedTechniqueTags"
              :key="tag.label"
              :class="tag.matched && 'outline outline-1 outline-(--text-accent) font-semibold'"
              >{{ tag.label }}</BaseTag
            >
          </div>

          <div class="pt-5 border-t border-(--border-shelf) grid grid-cols-3 gap-4">
            <div>
              <div class="font-mono text-[11px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Started</div>
              <div class="text-[13px] text-(--text-ink-main)">{{ selected.started }}</div>
            </div>
            <div>
              <div class="font-mono text-[11px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Role</div>
              <div class="text-[13px] text-(--text-ink-main)">{{ selected.role || '—' }}</div>
            </div>
            <div>
              <div class="font-mono text-[11px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Repo</div>
              <a
                :href="`https://github.com/jerryyehself/${selected.repo}`"
                target="_blank"
                class="text-[13px] text-(--text-ink-main) hover:text-(--text-accent) hover:underline"
              >
                {{ selected.repo }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
