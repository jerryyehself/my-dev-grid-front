<script setup lang="ts">
// 後台入口（/admin）。寫入相關的頁面原本只能從各頁角落的 AuthOnly 按鈕找到（文章清單的「管理」、
// 分類一覽的「新增分類」…），沒有一個地方能一次看到全部。這頁只放連結與計數，不做任何寫入。
//
// 文案照 copy-language 的「Admin pages」規則（D-81）：功能性就好，但定案的用詞照用（類別、述詞…）。
//
// 計數全部沿用既有的 API 函式，不另外開端點：
// - 文章：fetchArticles()，跟文章管理頁同一支（/scopes 找 post 分類 + /documentations），
//   已發布＝status 1，其餘算草稿，規則也跟管理頁一樣
// - 分類：fetchScopeList()（/scopes），分成頂層與子分類
// - 述詞：fetchRelations()（/relations）
// - 專案：fetchProjects()（/scopes + /implementations?type=project）
// - 技術：fetchTechniqueOptions()（/techniques）
// 專案與技術是後端從 GitHub 自動同步的，站上沒有編輯頁，這裡只顯示數字。
//
// 載入與錯誤：連結不依賴任何資料，一進來就能用；只有數字各自載入。某一項失敗只影響那一格（顯示 —），
// 上方列出是哪個請求失敗——跟 LoadFailedNotice 一樣是給站主看的，直接寫請求與狀態碼。
import { computed, reactive } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ApiHttpError } from '@/api/client'
import { fetchArticles } from '@/api/articles'
import { fetchRelations, fetchScopeList, fetchTechniqueOptions } from '@/api/ontology'
import { fetchProjects } from '@/api/projects'
import BaseButton from '@/components/BaseButton.vue'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseHint from '@/components/BaseHint.vue'

type CountKey = 'articles' | 'scopes' | 'relations' | 'projects' | 'techniques'

interface CountState<T> {
  status: 'loading' | 'ok' | 'error'
  value: T | null
  error: string | null
}

function initial<T>(): CountState<T> {
  return { status: 'loading', value: null, error: null }
}

const counts = reactive({
  articles: initial<{ published: number; draft: number }>(),
  scopes: initial<{ top: number; child: number }>(),
  relations: initial<number>(),
  projects: initial<number>(),
  techniques: initial<number>(),
})

const LABEL: Record<CountKey, string> = {
  articles: '文章',
  scopes: '分類',
  relations: '述詞',
  projects: '專案',
  techniques: '技術',
}

function describeError(e: unknown): string {
  if (e instanceof ApiHttpError) return `${e.method} ${e.path} 回傳 HTTP ${e.status}`
  return `連不上後端 API（${e instanceof Error ? e.message : String(e)}）`
}

async function track<K extends CountKey>(
  key: K,
  load: () => Promise<NonNullable<(typeof counts)[K]['value']>>,
) {
  const state = counts[key] as CountState<unknown>
  try {
    state.value = await load()
    state.status = 'ok'
  } catch (e) {
    state.error = describeError(e)
    state.status = 'error'
  }
}

// 五項互不相依，同時發出去
track('articles', async () => {
  const items = await fetchArticles()
  const published = items.filter((a) => a.status === 1).length
  return { published, draft: items.length - published }
})
track('scopes', async () => {
  const rows = await fetchScopeList()
  const top = rows.filter((s) => s.parent_class === null).length
  return { top, child: rows.length - top }
})
track('relations', async () => (await fetchRelations()).length)
track('projects', async () => (await fetchProjects()).length)
track('techniques', async () => (await fetchTechniqueOptions()).length)

const failures = computed(() =>
  (Object.keys(LABEL) as CountKey[])
    .filter((k) => counts[k].status === 'error')
    .map((k) => `${LABEL[k]}：${counts[k].error}`),
)

/** 可以動手改的三類，一類一列：名稱、計數、清單頁、新增頁。 */
interface EditableRow {
  id: string
  title: string
  busy: boolean
  stats: { label: string; value: string }[]
  list: { to: RouteLocationRaw; label: string }
  create: { to: RouteLocationRaw; label: string }
}

const editableRows = computed<EditableRow[]>(() => [
  {
    id: 'articles',
    title: '文章',
    busy: counts.articles.status === 'loading',
    stats: [
      { label: '已發布', value: show(counts.articles, (v) => v.published) },
      { label: '草稿', value: show(counts.articles, (v) => v.draft) },
    ],
    list: { to: { name: 'article-manage' }, label: '文章管理' },
    create: { to: { name: 'article-new' }, label: '新增文章' },
  },
  {
    id: 'scopes',
    title: '分類',
    busy: counts.scopes.status === 'loading',
    stats: [
      { label: '頂層', value: show(counts.scopes, (v) => v.top) },
      { label: '子分類', value: show(counts.scopes, (v) => v.child) },
    ],
    list: { to: { name: 'ontology-scopes' }, label: '分類一覽' },
    create: { to: { name: 'ontology-scope-new' }, label: '新增分類' },
  },
  {
    id: 'relations',
    title: '述詞',
    busy: counts.relations.status === 'loading',
    stats: [{ label: '總數', value: show(counts.relations, (v) => v) }],
    list: { to: { name: 'ontology-relations' }, label: '述詞一覽' },
    create: { to: { name: 'ontology-relation-new' }, label: '新增述詞' },
  },
])

/** 一格數字的顯示：載入中「…」、失敗「—」，不拿 0 頂替（0 是真的有意義的值）。 */
function show<T>(state: CountState<T>, pick: (v: T) => number): string {
  if (state.status === 'loading') return '…'
  if (state.status === 'error' || state.value === null) return '—'
  return String(pick(state.value))
}
</script>

<template>
  <div class="w-full flex flex-col gap-[18px]">
    <!-- 表頭，跟文章管理頁同一套 -->
    <div class="flex flex-col gap-[7px]">
      <BaseEyebrow class="!tracking-[0.2em]">Admin</BaseEyebrow>
      <h1 class="font-serif text-[26px] sm:text-[30px] font-extrabold tracking-[-0.02em] text-(--text-ink-main)">
        管理
      </h1>
    </div>

    <!-- 用 div 不是 p，h2 加 m-0：避開 .global-page-wrapper 給文章長文用的段落／標題預設間距
         （分類一覽頁的同一段註解記的是同一件事） -->
    <div v-if="failures.length" role="alert" class="text-[14px] text-(--text-error)">
      計數載入失敗（連結不受影響）：{{ failures.join('；') }}
    </div>

    <!-- 可編輯的三類。清單樣式跟文章管理頁一致：一個框、細線分隔，不用一格一格的卡片陰影 -->
    <div class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) overflow-hidden">
      <section
        v-for="row in editableRows"
        :key="row.id"
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-[18px] border-b border-(--border-shelf) last:border-b-0"
        :aria-labelledby="`admin-${row.id}`"
      >
        <div class="flex flex-col gap-1 min-w-0">
          <h2 :id="`admin-${row.id}`" class="m-0 text-[15px] font-bold text-(--text-ink-main)">{{ row.title }}</h2>
          <div class="flex flex-wrap gap-x-4 text-[13px] text-(--text-ink-body)" :aria-busy="row.busy">
            <span v-for="stat in row.stats" :key="stat.label">
              {{ stat.label }} <span class="font-mono tabular-nums font-bold">{{ stat.value }}</span>
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <router-link :to="row.list.to">
            <BaseButton variant="ghost">{{ row.list.label }}</BaseButton>
          </router-link>
          <router-link :to="row.create.to">
            <BaseButton variant="primary">{{ row.create.label }}</BaseButton>
          </router-link>
        </div>
      </section>
    </div>

    <!-- 自動同步的兩類：只有數字，沒有編輯入口。用虛線框跟上面「可以動手改」的實線框分開，
         同 BaseButton add 變體的語彙——虛線＝這裡不是一般的可編輯項目 -->
    <section
      class="border border-dashed border-(--border-shelf) rounded-[6px] px-4 sm:px-5 py-4 flex flex-col gap-2"
      aria-labelledby="admin-synced"
    >
      <h2 id="admin-synced" class="m-0 text-[13px] tracking-[0.05em] font-bold text-(--text-ink-muted)">
        從 GitHub 自動同步
      </h2>
      <div class="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-(--text-ink-body)">
        <span :aria-busy="counts.projects.status === 'loading'">
          專案 <span class="font-mono tabular-nums font-bold">{{ show(counts.projects, (v) => v) }}</span>
        </span>
        <span :aria-busy="counts.techniques.status === 'loading'">
          技術 <span class="font-mono tabular-nums font-bold">{{ show(counts.techniques, (v) => v) }}</span>
        </span>
      </div>
      <BaseHint class="leading-[1.8]">
        專案與技術由後端從 GitHub repo 自動同步，站上不提供編輯。
      </BaseHint>
    </section>
  </div>
</template>
