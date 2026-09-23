<script setup lang="ts">
/**
 * Relation 一覽（規格「本體論編輯規格」第 8 步剩下的那一半）。
 *
 * 在這頁之前，唯一能到達某條 Relation 詳情頁的路徑是從它 subject 那個頂層 Scope
 * 的詳情頁點述詞定義清單進去——沒有一個地方能一次看到全部 15 條，也沒有「新增
 * 述詞」以外的入口能看到已有哪些述詞、哪些還沒配對反向。
 *
 * 15 條攤平成一張表就夠，不需要像 Scope 一覽那樣分組——Relation 沒有巢狀階層，
 * `class_number` 本身（主詞族＋受詞族）已經是排序依據。
 */
import { computed, ref } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseHint from '@/components/BaseHint.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import { fetchRelationCandidateList, fetchScopes, type RelationCandidateDto, type ScopeDto } from '@/api/ontology'

const relations = ref<RelationCandidateDto[] | null>(null)
const scopeNames = ref<Map<number, ScopeDto>>(new Map())
const loadError = ref(false)

async function load() {
  loadError.value = false
  try {
    const [rels, scopes] = await Promise.all([fetchRelationCandidateList(), fetchScopes()])
    relations.value = rels
    scopeNames.value = new Map(scopes.map((s) => [s.id, s]))
  } catch {
    loadError.value = true
  }
}

load()

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

function scopeName(id: number | null): string {
  return id === null ? '—' : (scopeNames.value.get(id)?.name ?? '—')
}

function scopeCallNumber(id: number | null): string | undefined {
  return id === null ? undefined : scopeNames.value.get(id)?.full_call_number
}

const rows = computed(() => relations.value ?? [])
</script>

<template>
  <BaseLoadingBlock v-if="loadError" height="220px" tone="error"> 讀不到述詞清單 </BaseLoadingBlock>
  <BaseLoadingBlock v-else-if="!relations" height="220px">LOADING</BaseLoadingBlock>

  <div v-else class="w-full">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <BaseEyebrow>本體論 · 述詞</BaseEyebrow>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-(--text-ink-main) sm:text-3xl">
          述詞一覽
        </h1>
      </div>
      <router-link :to="{ name: 'ontology-relation-new' }">
        <BaseButton variant="primary">新增述詞</BaseButton>
      </router-link>
    </div>

    <div class="mb-7 max-w-[52ch] text-sm leading-relaxed text-(--text-ink-body)">
      每一條述詞連著主詞與受詞兩個頂層分類，成對可逆——反向那一條有沒有配好，直接看「反向」那一欄。
    </div>

    <ul class="border-t border-(--border-shelf)">
      <li
        v-for="rel in rows"
        :key="rel.id"
        class="flex flex-wrap items-baseline gap-2.5 border-b border-(--border-shelf) px-2 py-2 odd:bg-(--bg-folder)"
      >
        <router-link
          :to="{ name: 'ontology-relation', params: { id: rel.id } }"
          class="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-sm transition-colors hover:text-(--text-accent)"
        >
          <span class="inline-flex items-center gap-1.5 shrink-0">
            <span class="h-2 w-2 rounded-full" :class="familyDot(scopeCallNumber(rel.subject))" />
            {{ scopeName(rel.subject) }}
          </span>
          <span class="font-normal text-(--text-ink-muted)">——</span>
          <span class="shrink-0 font-mono font-bold text-(--text-accent)">{{ rel.name }}</span>
          <span class="font-normal text-(--text-ink-muted)">——▶</span>
          <span class="inline-flex items-center gap-1.5 shrink-0">
            <span class="h-2 w-2 rounded-full" :class="familyDot(scopeCallNumber(rel.object))" />
            {{ scopeName(rel.object) }}
          </span>
        </router-link>

        <BaseHint dim class="shrink-0">
          反向 {{ rel.reverse_id ? '已配對' : '未配對' }}
        </BaseHint>

        <router-link :to="{ name: 'ontology-relation-edit', params: { id: rel.id } }">
          <BaseButton variant="ghost">編輯</BaseButton>
        </router-link>
      </li>
    </ul>

    <p
      v-if="!rows.length"
      class="border-b border-(--border-shelf) bg-(--bg-folder) px-2 py-3 text-sm text-(--text-ink-muted)"
    >
      還沒有任何述詞。
    </p>
  </div>
</template>
