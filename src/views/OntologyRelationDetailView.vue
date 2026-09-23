<script setup lang="ts">
/**
 * Relation 詳情頁（規格「本體論編輯規格」第 4 步，稿：artifact 5V3BCgRy1M8HvcHypGmeup）。
 *
 * **這一頁存在的理由，是 `is_referenced` 這個布林回答不了的那個差別。**
 * `uses` 有 84 條邊、它的反向 `used` 一條都沒有，但兩條都 `is_referenced = true`、
 * 兩條都被鎖住。所以自己的邊與反向的邊要分成兩格數字（規格 B5），而且鎖住的
 * 理由必須寫出來——只掛一個鎖頭圖示，使用者會覺得系統在無理取鬧。
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import BaseStatTile from '@/components/BaseStatTile.vue'
import BaseTag from '@/components/BaseTag.vue'
import {
  fetchRelation,
  fetchRelationEdges,
  fetchScopes,
  type EdgePage,
  type RelationDetailDto,
  type ScopeDto,
} from '@/api/ontology'

const route = useRoute()

const relation = ref<RelationDetailDto | null>(null)
const edges = ref<EdgePage | null>(null)
const loadError = ref(false)
const edgesLoading = ref(false)

/** id → scope。`subject` / `object` 只給 id，名字要自己查（同 Scope 詳情頁）。 */
const scopeNames = ref<Map<number, ScopeDto>>(new Map())

const subjectScope = computed(() =>
  relation.value?.subject === null || relation.value?.subject === undefined
    ? null
    : (scopeNames.value.get(relation.value.subject) ?? null),
)
const objectScope = computed(() =>
  relation.value?.object === null || relation.value?.object === undefined
    ? null
    : (scopeNames.value.get(relation.value.object) ?? null),
)

/** 這條是自己就是自己的反向（對稱關係）。 */
const isSymmetric = computed(
  () => !!relation.value && relation.value.reverse_id === relation.value.id,
)

async function load(id: number) {
  loadError.value = false
  relation.value = null
  edges.value = null
  try {
    const [detail, all] = await Promise.all([fetchRelation(id), fetchScopes()])
    relation.value = detail
    scopeNames.value = new Map(all.map((s) => [s.id, s]))
    await loadEdges(1)
  } catch {
    loadError.value = true
  }
}

async function loadEdges(page: number) {
  if (!relation.value) return
  edgesLoading.value = true
  try {
    edges.value = await fetchRelationEdges(relation.value.id, page)
  } catch {
    edges.value = null
  } finally {
    edgesLoading.value = false
  }
}

watch(
  () => route.params.id,
  (id) => load(Number(id)),
  { immediate: true },
)

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

/**
 * 鎖住的理由，用人看得懂的話講完。
 *
 * `referenced_via` 只有 `self` / `reverse` / `null` 三種值，畫面上要說的是三件
 * 不同的事——尤其 `reverse`：這條自己沒有任何邊卻不能改，因為改掉它的主詞受詞，
 * 反向那些邊的讀法就會變成另一個意思。
 */
const lockReason = computed(() => {
  const r = relation.value
  if (!r || !r.is_referenced) return null
  if (r.referenced_via === 'self') {
    return `這條述詞已經被 ${r.own_edges_count} 條邊引用，主詞、受詞與名稱都不能再改——改掉等於追溯竄改那些邊的意思。只有「註釋」還可以改。`
  }
  return `這條述詞自己沒有任何邊，但它的反向${r.reverse ? `（${r.reverse.name}）` : ''}有 ${r.reverse_edges_count} 條。兩條是同一組配對，改掉這條的主詞受詞，那些邊的反向讀法就會變成另一個意思。只有「註釋」還可以改。`
})
</script>

<template>
  <BaseLoadingBlock v-if="loadError" height="220px" tone="error"> 讀不到這個述詞 </BaseLoadingBlock>
  <BaseLoadingBlock v-else-if="!relation" height="220px">LOADING</BaseLoadingBlock>

  <div v-else class="w-full">
    <div
      class="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-(--text-ink-muted)"
    >
      <router-link
        :to="{ name: 'ontology-scopes' }"
        class="border-b border-(--border-shelf) text-(--text-accent) transition-colors hover:border-(--text-accent)"
        >本體論</router-link
      >
      <span>/</span>
      <router-link
        :to="{ name: 'ontology-relations' }"
        class="border-b border-(--border-shelf) text-(--text-accent) transition-colors hover:border-(--text-accent)"
        >述詞</router-link
      >
      <span>/</span>
      <span class="text-(--text-ink-body)">{{ relation.name }}</span>
    </div>

    <BaseEyebrow>述詞定義</BaseEyebrow>

    <div class="mt-2 flex flex-wrap items-baseline gap-3">
      <span class="font-mono text-xs font-bold tracking-[0.14em] text-(--text-accent)">{{
        relation.full_call_number
      }}</span>
      <h1 class="text-2xl font-bold tracking-tight text-(--text-ink-main) sm:text-3xl">
        {{ relation.name }}
      </h1>
      <BaseTag v-if="relation.is_referenced" tone="accent">已被引用 · 欄位鎖定</BaseTag>
      <router-link
        :to="{ name: 'ontology-relation-edit', params: { id: relation.id } }"
        class="ml-auto self-center"
      >
        <BaseButton variant="primary">{{ relation.is_referenced ? '編輯註釋' : '編輯' }}</BaseButton>
      </router-link>
    </div>

    <!-- 三元組那一行。族別色直接用 --node-doc / tech / impl，跟首頁圖譜同一組
         token——那三個顏色是跑過對比驗證器的，不為了這一頁另外挑。 -->
    <div class="mt-4 flex flex-wrap items-center gap-2.5 font-mono text-sm text-(--text-ink-main)">
      <span class="inline-flex items-center gap-1.5">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="familyDot(subjectScope?.full_call_number)"
        />
        {{ subjectScope?.name ?? '—' }}
      </span>
      <span class="text-(--text-ink-muted)">——</span>
      <span
        class="rounded border border-(--border-shelf) bg-(--bg-folder) px-1.5 py-0.5 font-bold text-(--text-accent)"
        >{{ relation.name }}</span
      >
      <span class="text-(--text-ink-muted)">——▶</span>
      <span class="inline-flex items-center gap-1.5">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="familyDot(objectScope?.full_call_number)"
        />
        {{ objectScope?.name ?? '—' }}
      </span>

      <BaseTag v-if="isSymmetric" tone="muted">對稱 · 自己就是反向</BaseTag>
      <router-link
        v-else-if="relation.reverse"
        :to="{ name: 'ontology-relation', params: { id: relation.reverse.id } }"
      >
        <BaseTag tone="muted">反向 · {{ relation.reverse.name }}</BaseTag>
      </router-link>
      <BaseTag v-else tone="muted">沒有反向</BaseTag>
    </div>

    <!-- 用 div 不是 p，是為了閃開 base.css 的 `.global-page-wrapper p { text-align: justify }`
         （≥40rem 生效）。那條規則是給文章長文用的、而且是刻意的，但套在這種
         52ch 寬的短說明上會把中文字距拉開成「本 體 三 大 分 類 之 一」——實際截圖
         才看得出來。改用 utility class 蓋不掉它：`.global-page-wrapper p` 的
         specificity 是 0,1,1，比 `.text-left` 的 0,1,0 高，所以換標籤比加 !important
         乾淨。 -->
    <div
      v-if="relation.note"
      class="mt-3 max-w-[52ch] text-sm leading-relaxed text-(--text-ink-body)"
    >
      {{ relation.note }}
    </div>

    <div
      class="mt-6 grid max-w-md grid-cols-2 gap-px border border-(--border-shelf) bg-(--border-shelf)"
    >
      <BaseStatTile
        label="使用這個述詞的邊"
        :value="relation.own_edges_count"
        :emphasis="relation.own_edges_count > 0"
      />
      <BaseStatTile
        label="反向的邊"
        :value="relation.reverse_edges_count"
        :emphasis="relation.own_edges_count === 0 && relation.reverse_edges_count > 0"
      />
    </div>

    <BaseCard
      v-if="lockReason"
      variant="panel"
      class="mt-4 max-w-[60ch] border-l-[3px] border-l-(--text-accent)"
    >
      <div class="text-sm leading-relaxed text-(--text-ink-body)">{{ lockReason }}</div>
    </BaseCard>

    <BaseEyebrow size="field" class="mt-8"
      >邊 · {{ edges?.total ?? relation.own_edges_count }}</BaseEyebrow
    >

    <BaseLoadingBlock v-if="edgesLoading && !edges" height="120px" class="mt-2">
      LOADING EDGES
    </BaseLoadingBlock>

    <p
      v-else-if="!edges || edges.total === 0"
      class="mt-2 border-y border-(--border-shelf) bg-(--bg-folder) px-2 py-3 text-sm text-(--text-ink-muted)"
    >
      這個述詞還沒有任何邊。<template v-if="relation.reverse && relation.reverse_edges_count > 0">
        它的反向
        <router-link
          :to="{ name: 'ontology-relation', params: { id: relation.reverse.id } }"
          class="text-(--text-accent) underline underline-offset-2"
          >{{ relation.reverse.name }}</router-link
        >
        有 {{ relation.reverse_edges_count }} 條。
      </template>
    </p>

    <template v-else>
      <ul class="mt-2 border-t border-(--border-shelf)" :class="edgesLoading && 'opacity-50'">
        <li
          v-for="edge in edges.data"
          :key="`${edge.source}-${edge.subject_id}-${edge.object_id}`"
          class="grid grid-cols-1 items-baseline gap-x-2.5 border-b border-(--border-shelf) px-2 py-1.5 text-sm odd:bg-(--bg-folder) sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
        >
          <span class="truncate text-(--text-ink-main)">{{ edge.subject_title }}</span>
          <!-- source 是這條邊來自哪一張連結表。留著不是為了好看——同一對實體
               可以被兩張不同的表連起來,不標出來就看不出這一列是哪一條。 -->
          <span class="font-mono text-[10px] tracking-wide text-(--text-ink-muted)">{{
            edge.source
          }}</span>
          <span class="truncate text-(--text-ink-main) sm:text-right">{{ edge.object_title }}</span>
        </li>
      </ul>

      <div
        v-if="edges.last_page > 1"
        class="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-(--text-ink-muted)"
      >
        <span
          >{{ (edges.current_page - 1) * edges.per_page + 1 }}–{{
            Math.min(edges.current_page * edges.per_page, edges.total)
          }}
          / {{ edges.total }}</span
        >
        <div class="flex gap-1">
          <button
            type="button"
            class="rounded border border-(--border-shelf) px-2 py-0.5 transition-colors enabled:hover:border-(--text-accent) disabled:opacity-35"
            :disabled="edges.current_page <= 1 || edgesLoading"
            @click="loadEdges(edges.current_page - 1)"
          >
            ‹
          </button>
          <span class="px-2 py-0.5 text-(--text-ink-body)"
            >{{ edges.current_page }} / {{ edges.last_page }}</span
          >
          <button
            type="button"
            class="rounded border border-(--border-shelf) px-2 py-0.5 transition-colors enabled:hover:border-(--text-accent) disabled:opacity-35"
            :disabled="edges.current_page >= edges.last_page || edgesLoading"
            @click="loadEdges(edges.current_page + 1)"
          >
            ›
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
