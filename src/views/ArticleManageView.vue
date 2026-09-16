<script setup lang="ts">
// 文章管理清單。依設計稿 artifact MxnbUbQypR2ZQdZugRGxCi 的 ArticleList artboard 實作。
//
// 跟編輯頁一樣是「只有視覺、沒有持久化」:資料來自 src/data/articles.ts 的假資料,
// 「新增文章」與刪除都停用,理由跟編輯頁的「發布」同一個——後端的 Documentation
// 沒有放內文的欄位,寫入端點也都在 auth:sanctum 後面而登入尚未實作（D-34）。
import { computed, ref } from 'vue'
import { articles, type Article } from '@/data/articles'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseHint from '@/components/BaseHint.vue'
import BaseInput from '@/components/BaseInput.vue'

type Filter = 'all' | 'published' | 'draft'

const filter = ref<Filter>('all')
const query = ref('')

type Status = 'published' | 'draft'

/**
 * 目前每篇文章的發布狀態——全部都是已發布,而且是刻意寫成一個常數而不是
 * 一個「依文章回傳狀態」的函式。
 *
 * 假資料裡沒有 status 欄位;後端的 `Documentation.status` 雖然存在,但整張表
 * 都是硬寫的 1,沒有任何真實變化（跟首頁當初拿掉「孵化中」那一欄同一個情況——
 * 沒有真資料撐得起來的狀態就不要畫）。寫成 per-article 的函式會讓這段程式碼
 * 看起來像「每篇各自有狀態」,那是還不成立的事。
 *
 * 所以「草稿」頁籤目前恆為 0。頁籤上的數字是真的,只是其中一格是空的,
 * 而不是假裝有幾篇。等後端真的有狀態欄位,把這個常數換成讀資料的函式即可。
 */
const CURRENT_STATUS: Status = 'published'

const counts = computed(() => ({
  all: articles.length,
  published: CURRENT_STATUS === 'published' ? articles.length : 0,
  draft: CURRENT_STATUS === 'published' ? 0 : articles.length,
}))

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'published', label: '已發布' },
  { key: 'draft', label: '草稿' },
]

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return articles.filter((a) => {
    if (filter.value !== 'all' && CURRENT_STATUS !== filter.value) return false
    if (!q) return true
    return a.title.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q))
  })
})

/** 第三行的摘要。段落數是真的,邊註與關聯沒有就不寫,不用「0 則」佔位。 */
function summaryLine(a: Article): string {
  const parts = [`${a.sections.length} 個段落`]
  if (a.margins?.length) parts.push(`${a.margins.length} 則邊註`)
  if (a.relatedProjects?.length) parts.push(`關聯 ${a.relatedProjects.join('、')}`)
  return parts.join(' · ')
}

// 跟編輯頁的「發布」同一個理由,見上面的檔頭註解
const canWrite = false
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
      <button
        type="button"
        :disabled="!canWrite"
        class="self-start sm:self-auto inline-flex items-center gap-2.5 rounded-full bg-(--text-ink-main) px-[18px] py-[9px] font-mono text-[10px] tracking-[0.28em] uppercase font-bold text-(--bg-paper-light) disabled:opacity-35 disabled:cursor-not-allowed"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        新增文章
      </button>
    </div>

    <!-- 停用的理由寫出來,不然「新增文章」按不動就只是個死路 -->
    <p
      class="border border-dashed border-(--border-shelf) rounded-[6px] bg-(--bg-folder) px-4 py-3 text-[12.5px] leading-6 text-(--text-ink-body)"
    >
      <span class="font-mono text-[10px] tracking-[0.16em] uppercase text-(--text-accent) font-bold">
        尚不能新增或刪除
      </span>
      ——後端的
      <code class="font-mono text-[11.5px]">Documentation</code>
      沒有放內文的欄位，寫入端點也都在
      <code class="font-mono text-[11.5px]">auth:sanctum</code>
      後面而登入尚未實作。這頁目前只做視覺與篩選。
    </p>

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
          placeholder="搜尋標題或標籤"
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
            <BaseHint class="!opacity-100">{{ a.date }}</BaseHint>
            <span
              class="font-mono text-[10px] tracking-[0.14em] text-(--text-accent) font-bold truncate"
              :class="a.tags.length ? '' : 'opacity-50'"
            >
              // {{ a.tags.length ? a.tags.join(' / ') : '尚未加標籤' }}
            </span>
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
              CURRENT_STATUS === 'published'
                ? 'border-(--border-shelf) bg-(--bg-folder) text-(--text-accent) font-bold'
                : 'border-dashed border-(--border-shelf) text-(--text-ink-muted)'
            "
          >
            {{ CURRENT_STATUS === 'published' ? '已發布' : '草稿' }}
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
            :disabled="!canWrite"
            :aria-label="`刪除 ${a.title}`"
            class="w-11 h-11 sm:w-auto sm:h-auto flex items-center justify-center text-(--text-accent) opacity-50 disabled:opacity-20 disabled:cursor-not-allowed"
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
  </div>
</template>
