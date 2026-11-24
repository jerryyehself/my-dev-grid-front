<script setup lang="ts">
// 匯入文章（/articles/import，要登入）：列出來源 repo 裡標了 `import: true` 的 Markdown 檔，
// 每一列選要新增、更新或連結既有文章，最後整批一次送出。
//
// 後端整批都成功才寫入：任何一篇不行（清單過期、站上狀態變了）就回 409、什麼都不寫，
// 所以這裡的錯誤處理先要做好——說清楚「沒有任何文章被寫入」並給「重新整理清單」。
// 另外兩種：後端說判斷不出某幾篇的來源版本新舊（409 unverified_commits），使用者逐篇確認後再送；
// 送出後連不上後端或後端出 5xx 則是「結果不明」，要先重新讀清單、核對上一批有沒有寫入（reconcileImport），才能再送。
// 版面沿用文章管理頁（單一框線、細線分隔的清單），沒有另外的設計稿。
import { computed, reactive, ref } from 'vue'
import { fetchArticles, displayDate, sortArticlesByDateDesc, type ArticleDto } from '@/api/articles'
import BaseButton from '@/components/BaseButton.vue'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseHint from '@/components/BaseHint.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import BaseSegmented from '@/components/BaseSegmented.vue'
import { LOADING_TEXT } from '@/copy/common'
import type { SelectOption } from '@/components/BaseSelect.vue'
import {
  fetchArticleSources,
  importArticleSources,
  type ImportRequest,
  type ImportResponse,
  type SourceListing,
} from './articleImportApi'
import ArticleImportRow from './ArticleImportRow.vue'
import {
  ACTION_LABEL,
  allowedActions,
  buildImportRequest,
  defaultChoice,
  describeImportError,
  describeProblem,
  linkableArticleIds,
  reconcileImport,
  rowId,
  selectedCount,
  selectedRowIds,
  selectionProblems,
  type ImportError,
  type ReconcileOutcome,
  type RowChoice,
  type UnverifiedBases,
  type UnverifiedCommit,
} from './articleImportRules'

const listing = ref<SourceListing | null>(null)
const loading = ref(true)
const loadError = ref<ImportError | null>(null)
/** 站上文章：標題對照與「連結既有文章」的選項。載入失敗時是 null，頁面其他部分照常使用。 */
const articles = ref<ArticleDto[] | null>(null)
const choices = reactive<Record<string, RowChoice>>({})

const submitting = ref(false)
const submitError = ref<ImportError | null>(null)
/** 後端已退回的那份請求（JSON）；選擇沒變、清單沒重讀就再送，必然得到同樣的 409／422，所以先擋下 */
const rejectedRequestKey = ref<string | null>(null)
const result = ref<ImportResponse | null>(null)
/** 後端說判斷不出來源版本新舊的項目（列識別 → 要帶回的 commit_sha）。重新讀清單就清掉。 */
const unverified = reactive<UnverifiedBases>({})
/** 判斷不出新舊、站上內容又改過的列（列識別）：確認也過不了，只能重新整理清單，不開放確認。重新讀清單就清掉。 */
const refreshOnlyRows = reactive<Record<string, true>>({})
/** 結果不明（斷線、5xx）的那份請求：核對完之前整頁不能再送出，選擇不同也一樣，因為看不出上一批有沒有寫入。 */
const pendingRequest = ref<ImportRequest | null>(null)
/** 核對上一批的結論；手動重新整理或再次送出時收掉。 */
const reconcileOutcome = ref<ReconcileOutcome | null>(null)

type Filter = 'actionable' | 'all'
const filter = ref<Filter>('actionable')

async function load() {
  loading.value = true
  loadError.value = null
  submitError.value = null
  rejectedRequestKey.value = null
  for (const key of Object.keys(unverified)) delete unverified[key]
  for (const key of Object.keys(refreshOnlyRows)) delete refreshOnlyRows[key]
  try {
    // 站上文章只用來顯示標題與提供連結選項，失敗不擋清單
    const [next, existing] = await Promise.all([
      fetchArticleSources(),
      fetchArticles().then(
        (list) => list,
        () => null,
      ),
    ])
    listing.value = next
    articles.value = existing
    for (const key of Object.keys(choices)) delete choices[key]
    for (const item of next.items) choices[rowId(item)] = defaultChoice(item)
    // 上一批結果不明：用剛讀回的清單核對。讀取失敗時 pendingRequest 留著，整頁維持鎖住
    if (pendingRequest.value) {
      reconcileOutcome.value = reconcileImport(pendingRequest.value, next)
      pendingRequest.value = null
    }
  } catch (e) {
    listing.value = null
    loadError.value = describeImportError(e, 'list')
  } finally {
    loading.value = false
  }
}
load()

/** 手動重新整理：上一次的匯入結果一起收掉。匯入成功後的自動重讀直接呼叫 load()，結果要留著。 */
function refresh() {
  result.value = null
  reconcileOutcome.value = null
  return load()
}

const items = computed(() => listing.value?.items ?? [])
const actionableCount = computed(() => items.value.filter((i) => allowedActions(i.status).length > 0).length)
const filterOptions = computed(() => [
  { value: 'actionable' as const, label: `待處理 ${actionableCount.value}` },
  { value: 'all' as const, label: `全部 ${items.value.length}` },
])
// 沒有任何可處理的列時不顯示篩選，直接列全部
const visibleItems = computed(() =>
  filter.value === 'actionable' && actionableCount.value > 0
    ? items.value.filter((i) => allowedActions(i.status).length > 0)
    : items.value,
)

const titleById = computed(() => new Map((articles.value ?? []).map((a) => [a.id, a.title])))
const linkOptions = computed<SelectOption[]>(() => {
  if (!listing.value || !articles.value) return []
  const free = new Set(
    linkableArticleIds(
      listing.value,
      articles.value.map((a) => a.id),
    ),
  )
  return sortArticlesByDateDesc(articles.value)
    .filter((a) => free.has(a.id))
    .map((a) => ({ value: a.id, label: a.title, suffix: displayDate(a) }))
})

const count = computed(() => (listing.value ? selectedCount(listing.value, choices) : 0))
const problems = computed(() => (listing.value ? selectionProblems(listing.value, choices, unverified) : []))
const problemTexts = computed(() => {
  const byPath = new Map(items.value.map((i) => [i.path, i.title ?? i.key ?? i.path]))
  return problems.value.map((p) => describeProblem(p, (path) => byPath.get(path) ?? path))
})
// 目前選擇組成的請求；選擇有問題、還沒選時是 null
const requestKey = computed(() =>
  listing.value && count.value > 0 && problems.value.length === 0
    ? JSON.stringify(buildImportRequest(listing.value, choices, unverified))
    : null,
)
// 重新整理清單進行中不能送出：此時畫面上的選擇與清單版本即將被換掉
const canSubmit = computed(
  () =>
    count.value > 0 &&
    problems.value.length === 0 &&
    !submitting.value &&
    !loading.value &&
    pendingRequest.value === null &&
    requestKey.value !== rejectedRequestKey.value,
)
// 這幾種失敗都是「整批沒寫入」，重新讀清單再選一次是對的出路；
// 來源暫時不能用（unavailable）重讀也不會好，所以不給。結果不明（uncertain）另有「重新整理清單並核對」
const REFRESHABLE_KINDS: ImportError['kind'][] = ['stale', 'validation', 'unverified']
// 其中 409（清單過期、判斷不出新舊還沒確認）和 422（選擇沒通過驗證）是「同一份請求再送一次必定同樣失敗」；
// 確認之後請求多了 confirm_unverified_base，就是另一份請求，可以再送
const REJECTED_KINDS: ImportError['kind'][] = ['stale', 'validation', 'unverified']

/** 這次 409 列出的項目記下 commit_sha；commit_sha 跟上次不同（站上又被匯入了別的版本）的要重新確認。 */
function markUnverified(commits: UnverifiedCommit[], rowIds: string[]) {
  for (const { index, commit_sha: sha } of commits) {
    const id = rowIds[index]
    if (id === undefined) continue
    if (unverified[id] !== sha && choices[id]) choices[id] = { ...choices[id], confirmUnverified: false }
    unverified[id] = sha
  }
}

async function submit() {
  if (!listing.value || !canSubmit.value) return
  // 送出時的請求與各項對應的列：409 用項目索引指出是哪一項，而送出期間使用者還能改選擇
  const request = buildImportRequest(listing.value, choices, unverified)
  const rowIds = selectedRowIds(listing.value, choices)
  const sentKey = requestKey.value
  submitting.value = true
  submitError.value = null
  result.value = null
  reconcileOutcome.value = null
  try {
    result.value = await importArticleSources(request)
  } catch (e) {
    const error = describeImportError(e, 'import')
    submitError.value = error
    if (REJECTED_KINDS.includes(error.kind)) rejectedRequestKey.value = sentKey
    if (error.kind === 'unverified') markUnverified(error.unverified ?? [], rowIds)
    for (const index of error.refreshOnly ?? []) {
      const id = rowIds[index]
      if (id !== undefined) refreshOnlyRows[id] = true
    }
    if (error.kind === 'uncertain') pendingRequest.value = request
    return
  } finally {
    submitting.value = false
  }
  // 寫入成功：清單上的狀態都變了，重新讀一次（結果摘要留在畫面上）
  await load()
}

// 錯誤區塊列出判斷不出新舊的項目標題，讓人不用在長清單裡找
const unverifiedTitles = computed(() =>
  items.value.filter((i) => rowId(i) in unverified).map((i) => i.title ?? i.key ?? i.path),
)

const resultCounts = computed(() => {
  const tally = { create: 0, update: 0, link: 0 }
  for (const row of result.value?.data ?? []) tally[row.action]++
  return tally
})

const shortSha = computed(() => listing.value?.commit_sha.slice(0, 7) ?? '')
</script>

<template>
  <div class="w-full flex flex-col gap-[18px]">
    <!-- 表頭，跟文章管理頁同一套 -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div class="flex flex-col gap-[7px]">
        <BaseEyebrow class="!tracking-[0.2em]">Import Articles</BaseEyebrow>
        <h1 class="font-serif text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] text-(--text-ink-main)">
          匯入文章
        </h1>
      </div>
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <router-link :to="{ name: 'article-manage' }">
          <BaseButton variant="ghost">文章管理</BaseButton>
        </router-link>
        <BaseButton variant="primary" :disabled="loading || submitting" @click="refresh">重新整理清單</BaseButton>
      </div>
    </div>

    <p class="m-0 text-(length:--type-label-size) leading-[1.8] text-(--text-ink-body)">
      列出來源裡標了 <code class="font-mono">import: true</code> 的 Markdown 檔。新增的文章一律是草稿；整批一起寫入，任何一篇不行就全部不寫。
    </p>

    <!-- 匯入結果。aria-live 區塊要一直都在，結果插進裡面螢幕報讀器才會唸（跟區塊同時出現很多不會唸，見 AuthNotice）。
         空的時候用負的上邊距抵掉 flex gap 多出來的一格，畫面跟沒有這個區塊時一樣。 -->
    <div aria-live="polite" class="empty:-mt-[18px]" data-test="result-live">
      <section
        v-if="result"
        class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-4 sm:px-5 py-4 flex flex-col gap-3"
        aria-labelledby="import-result"
        data-test="result"
      >
        <h2 id="import-result" class="m-0 text-[15px] font-bold text-(--text-ink-main)">
          已匯入 {{ result.data.length }} 篇
          <span class="text-(length:--type-label-size) font-normal text-(--text-ink-body)">
            （新增 {{ resultCounts.create }}、更新 {{ resultCounts.update }}、連結 {{ resultCounts.link }}）
          </span>
        </h2>
        <ul class="m-0 p-0 list-none flex flex-col gap-2">
          <li v-for="row in result.data" :key="row.key" class="flex flex-col gap-0.5 text-(length:--type-label-size)">
            <div class="flex flex-wrap items-baseline gap-x-2">
              <span class="font-mono text-[11px] tracking-[0.08em] text-(--text-ink-muted)">{{ ACTION_LABEL[row.action] }}</span>
              <router-link
                :to="{ name: 'article-editor', params: { id: row.documentation_id } }"
                class="font-bold text-(--text-accent) hover:underline"
              >
                {{ row.title }}
              </router-link>
              <span class="text-(--text-ink-muted)">{{ row.published ? '已發布' : '草稿' }}</span>
            </div>
            <div v-if="row.warnings.length" class="flex flex-col gap-0.5" data-test="result-warnings">
              <BaseHint tone="error">發布前請確認</BaseHint>
              <ul class="m-0 p-0 list-none text-(--text-error)">
                <li v-for="(warning, index) in row.warnings" :key="index">
                  <template v-if="warning.line !== null">第 {{ warning.line }} 行：</template>{{ warning.message }}
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </section>
      <!-- 結果不明之後核對的結論：跟匯入結果同一個 aria-live 區塊，同一套樣式 -->
      <section
        v-else-if="reconcileOutcome"
        class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-4 sm:px-5 py-4 flex flex-col gap-3"
        aria-labelledby="reconcile-title"
        :data-reconcile="reconcileOutcome.kind"
        data-test="reconcile"
      >
        <template v-if="reconcileOutcome.kind === 'applied'">
          <h2 id="reconcile-title" class="m-0 text-[15px] font-bold text-(--text-ink-main)">
            上一批已經寫入 {{ reconcileOutcome.items.length }} 篇
          </h2>
          <p class="m-0 text-(length:--type-label-size) leading-[1.8] text-(--text-ink-body)">
            清單上這幾篇都已經是送出的那一版，不用重送。
          </p>
          <ul class="m-0 p-0 list-none flex flex-col gap-1">
            <li v-for="item in reconcileOutcome.items" :key="item.key" class="text-(length:--type-label-size)">
              <router-link
                :to="{ name: 'article-editor', params: { id: item.documentationId } }"
                class="font-bold text-(--text-accent) hover:underline"
              >
                {{ item.title }}
              </router-link>
            </li>
          </ul>
        </template>
        <template v-else-if="reconcileOutcome.kind === 'not_applied'">
          <h2 id="reconcile-title" class="m-0 text-[15px] font-bold text-(--text-ink-main)">上一批看起來沒有寫入</h2>
          <p class="m-0 text-(length:--type-label-size) leading-[1.8] text-(--text-ink-body)">
            清單上的狀態跟送出前一樣，但上一次的請求也可能還沒處理完。再重新整理一次、確認沒有變動後，可以重新選擇再送出。
          </p>
        </template>
        <template v-else>
          <h2 id="reconcile-title" class="m-0 text-[15px] font-bold text-(--text-ink-main)">看不出上一批有沒有寫入</h2>
          <p class="m-0 text-(length:--type-label-size) leading-[1.8] text-(--text-ink-body)">
            清單上的狀態跟送出前對不上（來源可能有新版本，或別處也在匯入）。請逐列檢查狀態，再決定要不要重送。
          </p>
        </template>
      </section>
    </div>

    <BaseLoadingBlock v-if="loading && !listing" height="240px">{{ LOADING_TEXT }}</BaseLoadingBlock>

    <div
      v-else-if="loadError"
      role="alert"
      class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-5 py-8 flex flex-col items-start gap-3"
      data-test="load-error"
    >
      <p class="m-0 text-[14px] text-(--text-error)">清單載入失敗。{{ loadError.message }}</p>
      <p v-if="pendingRequest" class="m-0 text-(length:--type-label-size) text-(--text-ink-body)" data-test="pending-note">
        上一批送出的結果還沒核對，清單讀回來之後會自動核對；核對之前不能再送出。
      </p>
      <BaseButton variant="primary" :disabled="loading" @click="refresh">重新整理清單</BaseButton>
    </div>

    <template v-else-if="listing">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <BaseHint class="!tracking-[0.04em] break-all">
          來源 {{ listing.repo }} · 版本 {{ shortSha }} · 讀取於 {{ listing.fetched_at }}
        </BaseHint>
        <BaseSegmented
          v-if="actionableCount > 0"
          v-model="filter"
          :options="filterOptions"
          label="清單篩選"
          class="self-start"
        />
      </div>

      <ul
        v-if="visibleItems.length"
        class="m-0 p-0 list-none border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) overflow-hidden"
      >
        <ArticleImportRow
          v-for="item in visibleItems"
          :key="rowId(item)"
          :model-value="choices[rowId(item)] ?? defaultChoice(item)"
          :item="item"
          :site-title="item.documentation_id === null ? null : (titleById.get(item.documentation_id) ?? null)"
          :link-options="linkOptions"
          :link-unavailable="articles === null"
          :unverified="rowId(item) in unverified"
          :refresh-only="rowId(item) in refreshOnlyRows"
          @update:model-value="(value) => (choices[rowId(item)] = value)"
        />
      </ul>
      <p
        v-else
        class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-5 py-10 text-center text-(length:--type-label-size) text-(--text-ink-muted)"
      >
        來源裡沒有標了 import: true 的 Markdown 檔。
      </p>

      <!-- 送出列 -->
      <div class="flex flex-col gap-3 border-t border-(--border-shelf) pt-4">
        <ul v-if="count > 0 && problemTexts.length" class="m-0 p-0 list-none flex flex-col gap-1" data-test="problems">
          <li v-for="text in problemTexts" :key="text" class="text-(length:--type-label-size) text-(--text-error)">{{ text }}</li>
        </ul>

        <div v-if="submitError" role="alert" class="flex flex-col items-start gap-2" data-test="submit-error">
          <p class="m-0 text-[14px] text-(--text-error)">{{ submitError.message }}</p>
          <ul v-if="submitError.kind === 'unverified' && unverifiedTitles.length" class="m-0 pl-5 text-(length:--type-label-size) text-(--text-error)" data-test="unverified-list">
            <li v-for="title in unverifiedTitles" :key="title">{{ title }}</li>
          </ul>
          <BaseButton v-if="REFRESHABLE_KINDS.includes(submitError.kind)" variant="primary" :disabled="loading" @click="refresh">
            重新整理清單
          </BaseButton>
          <BaseButton v-else-if="submitError.kind === 'uncertain'" variant="primary" :disabled="loading" @click="refresh">
            重新整理清單並核對
          </BaseButton>
        </div>

        <div class="flex items-center justify-between gap-3">
          <span class="text-(length:--type-label-size) text-(--text-ink-body)">已選 {{ count }} 項</span>
          <button
            type="button"
            :disabled="!canSubmit"
            class="inline-flex items-center gap-2.5 rounded-full bg-(--text-ink-main) px-[18px] py-[9px] font-mono text-[11px] tracking-[0.2em] font-bold text-(--bg-paper-light) cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            data-test="submit"
            @click="submit"
          >
            {{ submitting ? '匯入中…' : `匯入 ${count} 篇` }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
