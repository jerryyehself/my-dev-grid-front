<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseTag from '@/components/BaseTag.vue'
import BaseButton from '@/components/BaseButton.vue'
import { fetchProjects, type Project } from '@/api/projects'
import { useProjectsFilter } from '@/composables/useProjectsFilter'

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

const selectedId = ref('')
const selected = computed(() => projects.value.find((p) => p.id === selectedId.value))

// 篩選把目前選中的專案擠出清單時，自動切到篩選後清單的第一筆，不留一個選不到的空白詳情面板；
// 資料還沒載入完成（filteredProjects/projects 都是空陣列）時先不設定，等 API 回來再選
watch(
  filteredProjects,
  (list) => {
    if (list.some((p) => p.id === selectedId.value)) return
    const fallback = list[0] ?? projects.value[0]
    if (fallback) selectedId.value = fallback.id
  },
  { immediate: true },
)
</script>

<template>
  <div class="w-full">
    <div v-if="loading" class="py-16 text-center text-[11px] font-mono text-(--text-ink-body)/40 tracking-widest">
      // LOADING_PROJECTS...
    </div>

    <div v-else-if="error" class="py-16 flex flex-col items-center gap-4 text-center">
      <p class="text-[11px] font-mono text-(--text-accent) tracking-widest">// FAILED_TO_LOAD</p>
      <p class="text-sm text-(--text-ink-body)">{{ error }}</p>
      <BaseButton variant="primary" @click="load">重試</BaseButton>
    </div>

    <template v-else>
      <div v-if="selectedTags.size > 0" class="flex justify-end mb-3">
        <button
          type="button"
          class="font-mono text-[11px] text-(--text-accent) font-bold tracking-[0.05em] border-b border-(--text-accent) pb-0.5 cursor-pointer"
          @click="clearFilter"
        >
          清除篩選 ×
        </button>
      </div>

      <!-- 標籤篩選器：依語言／套件／環境／其他分組，跟下面的主從式列表共用同一份專案資料。
           分類名稱、標籤區塊是同一個 grid row 的兩個 cell，items-baseline 讓名稱文字的基線
           對齊「標籤區塊第一行」文字的基線——這是瀏覽器內建的基線對齊計算，不是用 padding
           猜出來的數字，換幾行都準（之前 items-start + pt-1 那版本是用猜的，實測還是有落差）。
           min-w-0 是必要的：沒有它，標籤 cell 的 flex-wrap 會被瀏覽器預設的
           min-width:auto 撐開成內容原始寬度，標籤不會在格線寬度內換行、直接溢出。
           2026-09-13 用 Claude Design 畫布先確認過真實標籤內容換行後的對齊效果，見
           https://claude.ai/code/artifact/17ede728-b7b3-4b2d-9f0c-7bdd3a1e0490。 -->
      <div class="border border-(--border-shelf) rounded-[10px] bg-(--bg-paper-light) px-[22px] py-[18px] mb-5 grid grid-cols-[64px_1fr] gap-x-3.5 gap-y-4 items-baseline">
        <template v-for="group in filterGroups" :key="group.label">
          <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted)">
            {{ group.label }}
          </div>
          <div class="flex flex-wrap gap-1.5 min-w-0">
            <button
              v-for="tag in group.tags"
              :key="tag.label"
              type="button"
              class="px-[11px] py-1 rounded-full font-mono text-[11px] border transition-colors cursor-pointer"
              :class="
                tag.selected
                  ? 'border-(--text-accent) text-(--text-accent) bg-(--bg-folder)'
                  : 'border-(--border-shelf) text-(--text-ink-body) hover:border-(--text-accent)/40'
              "
              @click="toggleTag(tag.label)"
            >
              {{ tag.label }} <span class="opacity-55">{{ tag.count }}</span>
            </button>
          </div>
        </template>
      </div>

      <div v-if="filteredProjects.length === 0" class="py-16 text-center text-[11px] font-mono text-(--text-ink-body)/40 tracking-widest">
        // NO_PROJECTS_FOUND
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] border border-(--border-shelf) rounded-xl overflow-hidden bg-(--bg-paper-light)">
        <!-- 清單固定 max-h-80＋內部捲動：手機版是因為跟詳情面板上下堆疊，清單一長會把
             詳情面板擠到很下面；桌面版原本 md:max-h-none 讓清單自然展開，但跟首頁近況板
             改成固定高度後不一致，改成兩種寬度都套同一個高度上限，全站「清單裝在固定
             高度盒子裡」的慣例統一 -->
        <div class="max-h-80 overflow-y-auto border-b md:border-b-0 md:border-r border-(--border-shelf)">
          <button
            v-for="proj in filteredProjects"
            :key="proj.id"
            type="button"
            class="w-full text-left px-4.5 py-4 border-b border-(--border-shelf) last:border-b-0 transition-colors cursor-pointer"
            :class="
              selectedId === proj.id
                ? 'bg-(--bg-active-row) border-l-[3px] border-l-(--text-accent)'
                : 'border-l-[3px] border-l-transparent hover:bg-(--bg-folder)/60'
            "
            @click="selectedId = proj.id"
          >
            <div class="flex items-center justify-between mb-1.5 font-mono text-[10px] text-(--text-ink-muted)">
              <span>{{ proj.id }}</span>
              <span
                v-if="proj.statusType"
                class="font-mono text-[9px] tracking-[0.05em] uppercase font-bold"
                :class="proj.statusType === 'active' ? 'text-(--text-accent)' : 'text-(--text-ink-muted)'"
              >
                {{ proj.status }}
              </span>
            </div>
            <div class="text-sm font-bold text-(--text-ink-main) leading-snug">
              {{ proj.title }}
            </div>
          </button>
          <div v-if="selectedTags.size > 0" class="px-4.5 py-4 font-mono text-[10px] text-(--text-ink-muted) opacity-60">
            {{ filteredProjects.length }} / {{ projects.length }} 個專案符合篩選
          </div>
        </div>

        <div v-if="selected" class="p-6 sm:p-8">
          <div class="flex items-center justify-between mb-5 font-mono text-[10px] tracking-wider text-(--text-ink-muted)">
            <span>{{ selected.id }}</span>
            <BaseTag v-if="selected.statusType" :tone="selected.statusType === 'active' ? 'accent' : 'muted'">
              {{ selected.status }}
            </BaseTag>
          </div>

          <h2 class="text-xl sm:text-2xl font-extrabold text-(--text-ink-main) mb-3.5">
            {{ selected.title }}
          </h2>

          <p v-if="selected.desc" class="text-sm sm:text-[15px] text-(--text-ink-body) leading-relaxed text-justify max-w-2xl mb-6">
            {{ selected.desc }}
          </p>

          <div class="flex flex-wrap gap-2 font-mono text-[11px] mb-6">
            <BaseTag v-for="tag in selected.tags" :key="tag">{{ tag }}</BaseTag>
          </div>

          <div class="pt-5 border-t border-(--border-shelf) grid grid-cols-3 gap-4">
            <div>
              <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Started</div>
              <div class="text-[13px] text-(--text-ink-main)">{{ selected.started }}</div>
            </div>
            <div>
              <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Role</div>
              <div class="text-[13px] text-(--text-ink-main)">{{ selected.role || '—' }}</div>
            </div>
            <div>
              <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Repo</div>
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
