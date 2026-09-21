<script setup lang="ts">
/**
 * Scope 一覽（規格「本體論編輯規格」第 6 步）。
 *
 * **版面依照資料本身的形狀分兩層,不是一張平表。** 規格 §05 數過實際分佈:頂層
 * scope 有述詞定義、沒有實體;子 scope 有實體、沒有述詞定義。平鋪成一張 16 列的
 * 表格會把這件事藏起來,而它正是這個資料模型最需要一眼看懂的部分——所以頂層
 * 當分組標題,子類縮排在底下。
 *
 * 這一頁同時是詳情頁(第 4 步)缺的那個入口。在它之前,`/ontology/scopes/:id`
 * 只能用網址直接開,站上沒有任何連結指進來。
 */
import { computed, ref } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseHint from '@/components/BaseHint.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import { fetchScopeList, type ScopeListDto } from '@/api/ontology'

const scopes = ref<ScopeListDto[] | null>(null)
const loadError = ref(false)

async function load() {
  loadError.value = false
  try {
    scopes.value = await fetchScopeList()
  } catch {
    loadError.value = true
  }
}

load()

/**
 * 頂層 + 各自的子類。
 *
 * 後端已經 `orderBy('class_number')->orderBy('call_number')`,所以這裡只要分組,
 * 不要再排一次——再排一次等於前端多持有一份排序規則,哪天後端改了就會不一致。
 *
 * 落單的子類(父層被刪掉但自己還在)刻意**不丟掉**:靜靜少一列比顯示一個奇怪的
 * 分組更難查。它們集中在最後一組,標題直說父層不見了。
 */
const groups = computed(() => {
  const rows = scopes.value ?? []
  const tops = rows.filter((s) => s.parent_class === null)
  const topIds = new Set(tops.map((s) => s.id))

  const grouped = tops.map((top) => ({
    top,
    children: rows.filter((s) => s.parent_class === top.id),
  }))

  const orphans = rows.filter((s) => s.parent_class !== null && !topIds.has(s.parent_class))
  return { grouped, orphans }
})

/** 族別色：分類號首碼 0/1/2 對應 documentation / technique / implementation。 */
function familyDot(fullCallNumber: string | undefined): string {
  switch (fullCallNumber?.[0]) {
    case '0':
      return 'bg-(--node-doc)'
    case '1':
      return 'bg-(--node-tech)'
    case '2':
      return 'bg-(--node-impl)'
    default:
      return 'bg-(--text-ink-muted)'
  }
}
</script>

<template>
  <BaseLoadingBlock v-if="loadError" height="220px" tone="error"> 讀不到分類清單 </BaseLoadingBlock>
  <BaseLoadingBlock v-else-if="!scopes" height="220px">LOADING</BaseLoadingBlock>

  <div v-else class="w-full">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <BaseEyebrow>本體論 · 分類</BaseEyebrow>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-(--text-ink-main) sm:text-3xl">
          分類一覽
        </h1>
      </div>
      <router-link :to="{ name: 'ontology-scope-new' }">
        <BaseButton variant="primary">新增分類</BaseButton>
      </router-link>
    </div>

    <!-- 用 div 不是 p,避開 base.css 的 `.global-page-wrapper p { text-align: justify }`
         (≥40rem 生效)——那條規則是給文章長文用的,套在這種短說明上會把中文字距
         拉開。詳情頁的同一段註解記的是同一件事。 -->
    <div class="mb-7 max-w-[52ch] text-sm leading-relaxed text-(--text-ink-body)">
      頂層分類持有述詞定義，子分類持有實體。兩層顯示的東西不一樣，所以分組排列而不是平鋪成一張表。
    </div>

    <section v-for="group in groups.grouped" :key="group.top.id" class="mb-8">
      <div class="flex flex-wrap items-baseline gap-2.5 border-b border-(--border-shelf) pb-2">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="familyDot(group.top.full_call_number)"
        />
        <span class="font-mono text-xs font-bold tracking-[0.14em] text-(--text-accent)">{{
          group.top.full_call_number
        }}</span>
        <router-link
          :to="{ name: 'ontology-scope', params: { id: group.top.id } }"
          class="text-base font-bold text-(--text-ink-main) transition-colors hover:text-(--text-accent)"
          >{{ group.top.name }}</router-link
        >
        <BaseHint dim
          >子類 {{ group.children.length }} · 述詞
          {{ (group.top.subject_of_count ?? 0) + (group.top.object_of_count ?? 0) }}</BaseHint
        >
        <router-link
          :to="{ name: 'ontology-scope-edit', params: { id: group.top.id } }"
          class="ml-auto"
        >
          <BaseButton variant="ghost">編輯</BaseButton>
        </router-link>
      </div>

      <ul>
        <li
          v-for="child in group.children"
          :key="child.id"
          class="flex items-baseline gap-2.5 border-b border-(--border-shelf) px-2 py-1.5 odd:bg-(--bg-folder)"
        >
          <router-link
            :to="{ name: 'ontology-scope', params: { id: child.id } }"
            class="flex min-w-0 flex-1 items-baseline gap-2.5 text-sm transition-colors hover:text-(--text-accent)"
          >
            <span
              class="w-14 shrink-0 font-mono text-[11px] tabular-nums text-(--text-ink-muted)"
              >{{ child.full_call_number }}</span
            >
            <span class="shrink-0 font-medium text-(--text-ink-main)">{{ child.name }}</span>
            <span class="min-w-0 flex-1 truncate text-(--text-ink-muted)">{{
              child.comment ?? ''
            }}</span>
          </router-link>
          <!-- 實體筆數放在右邊,0 也要顯示。藏起來的話讀的人分不出「沒有實體」
               跟「這一欄還沒載入」——詳情頁那一排計數是同一個道理。 -->
          <BaseHint dim class="shrink-0 tabular-nums"
            >實體 {{ child.entities_count ?? 0 }}</BaseHint
          >
          <router-link :to="{ name: 'ontology-scope-edit', params: { id: child.id } }">
            <BaseButton variant="ghost">編輯</BaseButton>
          </router-link>
        </li>
      </ul>

      <p
        v-if="!group.children.length"
        class="border-b border-(--border-shelf) bg-(--bg-folder) px-2 py-3 text-sm text-(--text-ink-muted)"
      >
        這個分類底下還沒有子類。
      </p>
    </section>

    <section v-if="groups.orphans.length" class="mb-8">
      <BaseEyebrow size="field">父層不存在的分類 · {{ groups.orphans.length }}</BaseEyebrow>
      <div class="mt-1 mb-2 max-w-[52ch] text-xs leading-relaxed text-(--text-ink-muted)">
        這幾筆的 <code class="font-mono">parent_class</code>
        指向一個清單裡找不到的分類（父層被軟刪除，或資料不一致）。列出來而不是濾掉，是因為靜靜少一列比顯示異常更難查。
      </div>
      <ul class="border-t border-(--border-shelf)">
        <li
          v-for="row in groups.orphans"
          :key="row.id"
          class="flex items-baseline gap-2.5 border-b border-(--border-shelf) px-2 py-1.5 odd:bg-(--bg-folder)"
        >
          <router-link
            :to="{ name: 'ontology-scope', params: { id: row.id } }"
            class="flex min-w-0 flex-1 items-baseline gap-2.5 text-sm transition-colors hover:text-(--text-accent)"
          >
            <span
              class="w-14 shrink-0 font-mono text-[11px] tabular-nums text-(--text-ink-muted)"
              >{{ row.full_call_number }}</span
            >
            <span class="min-w-0 flex-1 truncate font-medium text-(--text-ink-main)">{{
              row.name
            }}</span>
          </router-link>
          <BaseHint dim class="shrink-0">parent_class {{ row.parent_class }}</BaseHint>
        </li>
      </ul>
    </section>
  </div>
</template>
