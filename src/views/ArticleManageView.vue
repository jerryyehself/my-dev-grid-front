<script setup lang="ts">
// 文章管理清單。依設計稿 artifact MxnbUbQypR2ZQdZugRGxCi 的 ArticleList artboard 實作。
//
// D-56（登入）落地後，這裡第一次真的接上 /api/documentations——「新增文章」
// 連去 /articles/new，刪除真的打 DELETE，狀態欄位改讀後端 status（1=已發布，
// 其餘=草稿）。標籤篩選拿掉了：tags 是編輯頁的本地暫存欄位（見 src/api/articles.ts
// 檔頭註解），後端沒有這張表，清單本來就沒有真標籤可以篩。
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { deleteArticle, fetchArticles, type ArticleDto } from '@/api/articles'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseHint from '@/components/BaseHint.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'

const auth = useAuthStore()
const canWrite = computed(() => auth.isAuthenticated)

type Filter = 'all' | 'published' | 'draft'

const filter = ref<Filter>('all')
const query = ref('')

const ready = ref(false)
const loadError = ref(false)
const items = ref<ArticleDto[]>([])
const deletingId = ref<number | null>(null)

async function load() {
  loadError.value = false
  ready.value = false
  try {
    items.value = await fetchArticles()
    ready.value = true
  } catch {
    loadError.value = true
  }
}
load()

function isPublished(a: ArticleDto): boolean {
  return a.status === 1
}

const counts = computed(() => ({
  all: items.value.length,
  published: items.value.filter(isPublished).length,
  draft: items.value.filter((a) => !isPublished(a)).length,
}))

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'published', label: '已發布' },
  { key: 'draft', label: '草稿' },
]

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return items.value.filter((a) => {
    if (filter.value === 'published' && !isPublished(a)) return false
    if (filter.value === 'draft' && isPublished(a)) return false
    if (!q) return true
    return a.title.toLowerCase().includes(q)
  })
})

/** 第三行的摘要。沒有的東西就不寫，不用「0 則」佔位。 */
function summaryLine(a: ArticleDto): string {
  const parts = [`${(a.body ?? '').length} 字`]
  const linked = a.techniques.length + a.implementations.length
  if (linked) parts.push(`關聯 ${linked} 個圖譜實體`)
  return parts.join(' · ')
}

function displayDate(a: ArticleDto): string {
  const raw = a.creation_date ?? a.created_at
  return raw ? raw.slice(0, 10) : '—'
}

async function handleDelete(a: ArticleDto) {
  if (!canWrite.value || deletingId.value !== null) return
  if (!window.confirm(`確定要刪除「${a.title}」？這個動作無法復原。`)) return
  deletingId.value = a.id
  try {
    await deleteArticle(a.id)
    items.value = items.value.filter((item) => item.id !== a.id)
  } catch {
    window.alert('刪除失敗，請稍後再試一次。')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-[18px]">
    <!-- 表頭 -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div class="flex flex-col gap-[7px]">
        <!-- 設計稿這一行跟編輯頁頁首一樣是 letter-spacing:0.2em 的行內覆寫 -->
        <BaseEyebrow class="!tracking-[0.2em]">Manage Articles</BaseEyebrow>
        <h1 class="font-serif text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] text-(--text-ink-main)">
          文章管理
        </h1>
      </div>
      <router-link
        v-if="canWrite"
        :to="{ name: 'article-new' }"
        class="self-start sm:self-auto inline-flex items-center gap-2.5 rounded-full bg-(--text-ink-main) px-[18px] py-[9px] font-mono text-[10px] tracking-[0.28em] uppercase font-bold text-(--bg-paper-light)"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        新增文章
      </router-link>
    </div>

    <!-- 未登入才需要說明,登入後按鈕本身就會動,不用額外文字解釋 -->
    <p
      v-if="!canWrite"
      class="border border-dashed border-(--border-shelf) rounded-[6px] bg-(--bg-folder) px-4 py-3 text-[12.5px] leading-6 text-(--text-ink-body)"
    >
      <span class="font-mono text-[10px] tracking-[0.16em] uppercase text-(--text-accent) font-bold">
        尚未登入
      </span>
      ——新增與刪除文章需要先登入。
    </p>

    <BaseLoadingBlock v-if="!ready && !loadError" height="240px">載入中…</BaseLoadingBlock>
    <BaseLoadingBlock v-else-if="loadError" height="240px" tone="error">
      文章清單載入失敗，重新整理再試一次。
    </BaseLoadingBlock>

    <template v-else>
      <!-- 篩選與搜尋 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex gap-1 self-start border border-(--border-shelf) rounded-full p-[3px]">
          <button
            v-for="f in FILTERS"
            :key="f.key"
            type="button"
            class="rounded-full px-4 py-1.5 font-mono text-[10px] tracking-[0.14em] transition-colors duration-100 ease-out"
            :class="
              filter === f.key
                ? 'bg-(--bg-folder) text-(--text-accent) font-bold'
                : 'text-(--text-ink-muted) hover:text-(--text-ink-main)'
            "
            @click="filter = f.key"
          >
            {{ f.label }} {{ counts[f.key] }}
          </button>
        </div>

        <div class="relative sm:min-w-[220px]">
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            class="absolute left-[14px] top-1/2 -translate-y-1/2 text-(--text-accent) opacity-55 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <BaseInput
            v-model="query"
            placeholder="搜尋標題"
            class="w-full !rounded-full !py-[7px] pl-9 pr-[14px] font-mono !text-[11px]"
          />
        </div>
      </div>

      <!-- 清單 -->
      <div
        v-if="visible.length"
        class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) overflow-hidden"
      >
        <div
          v-for="a in visible"
          :key="a.id"
          class="group grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_86px_72px] gap-x-[18px] gap-y-3 items-center px-4 sm:px-5 py-[18px] border-b border-(--border-shelf) last:border-b-0 transition-colors duration-150 hover:bg-(--bg-folder)"
        >
          <div class="flex flex-col gap-[5px] min-w-0">
            <div class="flex items-center gap-[11px]">
              <BaseHint class="!opacity-100">{{ displayDate(a) }}</BaseHint>
            </div>
            <router-link
              :to="{ name: 'article-detail', params: { id: a.id } }"
              class="text-[15px] font-bold text-(--text-ink-main) hover:text-(--text-accent) transition-colors duration-100 ease-out"
            >
              {{ a.title }}
            </router-link>
            <BaseHint class="!tracking-[0.08em]">{{ summaryLine(a) }}</BaseHint>
          </div>

          <div class="justify-self-start sm:justify-self-auto">
            <span
              class="font-mono text-[10px] tracking-[0.12em] rounded-full border px-[9px] py-[3px]"
              :class="
                isPublished(a)
                  ? 'border-(--border-shelf) bg-(--bg-folder) text-(--text-accent) font-bold'
                  : 'border-dashed border-(--border-shelf) text-(--text-ink-muted)'
              "
            >
              {{ isPublished(a) ? '已發布' : '草稿' }}
            </span>
          </div>

          <!-- 桌機滑過該列才出現,手機沒有 hover,所以常駐並放大成 44px 觸控目標
               （跟編輯頁段落排序鈕同一條規則，設計稿的 note-touch 註記） -->
          <div
            class="col-span-2 sm:col-span-1 flex justify-start sm:justify-end gap-1 sm:gap-3 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          >
            <router-link
              :to="{ name: 'article-editor', params: { id: a.id } }"
              :aria-label="`編輯 ${a.title}`"
              class="w-11 h-11 sm:w-auto sm:h-auto flex items-center justify-center text-(--text-accent) opacity-50 hover:opacity-100 transition-opacity duration-100 ease-out"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
              </svg>
            </router-link>
            <button
              type="button"
              :disabled="!canWrite || deletingId === a.id"
              :aria-label="`刪除 ${a.title}`"
              class="w-11 h-11 sm:w-auto sm:h-auto flex items-center justify-center text-(--text-accent) opacity-50 disabled:opacity-20 disabled:cursor-not-allowed"
              @click="handleDelete(a)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <p
        v-else
        class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-5 py-10 text-center font-mono text-[11px] tracking-[0.12em] text-(--text-ink-muted)"
      >
        {{ query.trim() ? '沒有符合的文章' : '這個分類底下還沒有文章' }}
      </p>

      <BaseHint class="block leading-[1.8]">
        沿用站上清單一致的樣式：細線分隔、hover 用底色變化，編輯與刪除平常收起來，滑過該列才出現。
      </BaseHint>
    </template>
  </div>
</template>
