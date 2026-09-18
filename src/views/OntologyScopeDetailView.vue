<script setup lang="ts">
/**
 * Scope 詳情頁（規格「本體論編輯規格」第 4 步，稿：artifact 5V3BCgRy1M8HvcHypGmeup）。
 *
 * **這一頁的主體會隨層級整個換掉，那不是條件渲染的小技巧，是資料本身的形狀：**
 * 頂層 scope 有述詞定義、沒有實體；子層 scope 有實體、沒有述詞定義。因為 relation
 * 的主詞受詞一律指向頂層 scope，而實體是用子 scope 分類的。所以頂層的主欄放
 * 「述詞定義」，子層的主欄放「兄弟」——不是同一個清單換筆資料。
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseCard from '@/components/BaseCard.vue'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import BaseStatTile from '@/components/BaseStatTile.vue'
import {
  fetchScope,
  fetchScopes,
  type RelationSummaryDto,
  type ScopeDetailDto,
  type ScopeDto,
} from '@/api/ontology'

const route = useRoute()

const scope = ref<ScopeDetailDto | null>(null)
const loadError = ref(false)

/**
 * 全部 scope 的 id → 名稱對照。
 *
 * 為什麼需要它：`subject_of` / `object_of` 裡的 `subject` / `object` 是**id**，
 * 不是巢狀物件——後端刻意只給 `optional($this->subject)->id`。要顯示
 * 「specifiedBy → Documentation」就得自己查。scope 總數是十幾筆，一次撈完
 * 比每一列各打一次 API 便宜得多，也不會變成 N+1。
 */
const scopeNames = ref<Map<number, ScopeDto>>(new Map())

const isTopLevel = computed(() => scope.value?.parent_class === null)

async function load(id: number) {
  loadError.value = false
  scope.value = null
  try {
    const [detail, all] = await Promise.all([fetchScope(id), fetchScopes()])
    scope.value = detail
    scopeNames.value = new Map(all.map((s) => [s.id, s]))
  } catch {
    loadError.value = true
  }
}

watch(
  () => route.params.id,
  (id) => load(Number(id)),
  { immediate: true },
)

/** 述詞另一端的 scope 名字。查不到就回 null，不要編一個出來。 */
function otherEnd(relation: RelationSummaryDto, end: 'subject' | 'object'): ScopeDto | null {
  const id = relation[end]
  return id === null ? null : (scopeNames.value.get(id) ?? null)
}

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
  <BaseLoadingBlock v-if="loadError" height="220px" tone="error"> 讀不到這個分類 </BaseLoadingBlock>
  <BaseLoadingBlock v-else-if="!scope" height="220px">LOADING</BaseLoadingBlock>

  <div v-else class="w-full">
    <!-- 麵包屑。只連到「確實存在的頁面」——本體論一覽（規格第 6 步）還沒做，
         所以那一層是純文字，不是一個連到 404 的連結。 -->
    <div
      class="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-(--text-ink-muted)"
    >
      <span class="inline-block h-2 w-2 rounded-full" :class="familyDot(scope.full_call_number)" />
      <span>本體論</span>
      <template v-if="scope.parent">
        <span>/</span>
        <router-link
          :to="{ name: 'ontology-scope', params: { id: scope.parent.id } }"
          class="border-b border-(--border-shelf) text-(--text-accent) transition-colors hover:border-(--text-accent)"
          >{{ scope.parent.name }}</router-link
        >
      </template>
      <span>/</span>
      <span class="text-(--text-ink-body)">{{ scope.name }}</span>
    </div>

    <BaseEyebrow>{{
      isTopLevel ? '頂層分類' : `子分類 · 隸屬 ${scope.parent?.name ?? '—'}`
    }}</BaseEyebrow>

    <div class="mt-2 flex flex-wrap items-baseline gap-3">
      <span class="font-mono text-xs font-bold tracking-[0.14em] text-(--text-accent)">{{
        scope.full_call_number
      }}</span>
      <h1 class="text-2xl font-bold tracking-tight text-(--text-ink-main) sm:text-3xl">
        {{ scope.name }}
      </h1>
    </div>

    <!-- 用 div 不是 p，是為了閃開 base.css 的 `.global-page-wrapper p { text-align: justify }`
         （≥40rem 生效）。那條規則是給文章長文用的、而且是刻意的，但套在這種
         52ch 寬的短說明上會把中文字距拉開成「本 體 三 大 分 類 之 一」——實際截圖
         才看得出來。改用 utility class 蓋不掉它：`.global-page-wrapper p` 的
         specificity 是 0,1,1，比 `.text-left` 的 0,1,0 高，所以換標籤比加 !important
         乾淨。 -->
    <div
      v-if="scope.comment"
      class="mt-3 max-w-[52ch] text-sm leading-relaxed text-(--text-ink-body)"
    >
      {{ scope.comment }}
    </div>

    <!-- 那一排計數。0 要顯示，不能藏——頂層的實體筆數就是 0（實體掛在子類上），
         藏起來讀的人會以為還沒載入完。BaseStatTile 用降對比處理這件事。 -->
    <div
      class="mt-6 grid grid-cols-2 gap-px border border-(--border-shelf) bg-(--border-shelf) sm:grid-cols-5"
    >
      <BaseStatTile label="子類" :value="scope.children_count ?? 0" />
      <BaseStatTile label="兄弟" :value="scope.siblings_count ?? 0" />
      <BaseStatTile label="作為主詞" :value="scope.subject_of_count ?? 0" />
      <BaseStatTile label="作為受詞" :value="scope.object_of_count ?? 0" />
      <BaseStatTile label="實體筆數" :value="scope.entities_count ?? 0" :emphasis="!isTopLevel" />
    </div>

    <div class="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-2">
      <!-- 左欄：頂層看子類，子層看兄弟。兩者都是「同一層的其他分類」，可以點進去。 -->
      <section>
        <BaseEyebrow size="field">{{
          isTopLevel ? `子類 · ${scope.children_count ?? 0}` : `兄弟 · ${scope.siblings_count ?? 0}`
        }}</BaseEyebrow>

        <!-- 兄弟清單**不含自己**，而且計數也不含——後端兩邊都排除了（見
             ScopeResource 的 siblings 與 siblingsCountExcludingSelf），
             `ScopeCountsTest` 有一支測試守著兩者一致。稿子原本畫成「清單保留
             自己並標示、計數不含」，那會讓前端得把自己補回去，等於憑空多一列
             資料庫沒有回的東西——依後端為準，稿子那一點作廢。 -->
        <ul class="mt-2 border-t border-(--border-shelf)">
          <li
            v-for="row in isTopLevel ? scope.children : scope.siblings"
            :key="row.id"
            class="border-b border-(--border-shelf) odd:bg-(--bg-folder)"
          >
            <router-link
              :to="{ name: 'ontology-scope', params: { id: row.id } }"
              class="flex items-baseline gap-2.5 px-2 py-1.5 text-sm transition-colors hover:bg-(--bg-active-row)"
            >
              <span
                class="w-14 shrink-0 font-mono text-[11px] tabular-nums text-(--text-ink-muted)"
                >{{ row.full_call_number }}</span
              >
              <span class="min-w-0 flex-1 truncate font-medium text-(--text-ink-main)">{{
                row.name
              }}</span>
            </router-link>
          </li>
        </ul>

        <p
          v-if="!(isTopLevel ? scope.children : scope.siblings)?.length"
          class="mt-2 border-y border-(--border-shelf) bg-(--bg-folder) px-2 py-3 text-sm text-(--text-ink-muted)"
        >
          {{ isTopLevel ? '這個分類底下還沒有子類。' : '這一層只有這一個分類，沒有兄弟。' }}
        </p>
      </section>

      <!-- 右欄：頂層看述詞定義，子層看實體。 -->
      <section v-if="isTopLevel">
        <BaseEyebrow size="field"
          >述詞定義 · 作為主詞 {{ scope.subject_of_count ?? 0 }}</BaseEyebrow
        >
        <ul class="mt-2 border-t border-(--border-shelf)">
          <li
            v-for="relation in scope.subject_of"
            :key="relation.id"
            class="border-b border-(--border-shelf) odd:bg-(--bg-folder)"
          >
            <router-link
              :to="{ name: 'ontology-relation', params: { id: relation.id } }"
              class="flex items-baseline gap-2.5 px-2 py-1.5 text-sm transition-colors hover:bg-(--bg-active-row)"
            >
              <span
                class="w-14 shrink-0 font-mono text-[11px] tabular-nums text-(--text-ink-muted)"
                >{{ relation.full_call_number }}</span
              >
              <span class="min-w-0 flex-1 truncate font-medium text-(--text-ink-main)">
                {{ relation.name }}
                <span class="font-normal text-(--text-ink-muted)">→</span>
                <span
                  class="ml-0.5 inline-block h-2 w-2 rounded-full align-baseline"
                  :class="familyDot(otherEnd(relation, 'object')?.full_call_number)"
                />
                {{ otherEnd(relation, 'object')?.name ?? '—' }}
              </span>
            </router-link>
          </li>
        </ul>

        <BaseEyebrow size="field" class="mt-6"
          >述詞定義 · 作為受詞 {{ scope.object_of_count ?? 0 }}</BaseEyebrow
        >
        <!-- 稿子原本畫成一個切換器（主詞一頁、受詞一頁），標成待決。改成兩段
             並排列出，理由是這一頁最多各 8 條，切換器省下的高度換來一次點擊，
             而且會把「這個分類兩個方向各有幾條」這個對照藏起來。 -->
        <ul class="mt-2 border-t border-(--border-shelf)">
          <li
            v-for="relation in scope.object_of"
            :key="relation.id"
            class="border-b border-(--border-shelf) odd:bg-(--bg-folder)"
          >
            <router-link
              :to="{ name: 'ontology-relation', params: { id: relation.id } }"
              class="flex items-baseline gap-2.5 px-2 py-1.5 text-sm transition-colors hover:bg-(--bg-active-row)"
            >
              <span
                class="w-14 shrink-0 font-mono text-[11px] tabular-nums text-(--text-ink-muted)"
                >{{ relation.full_call_number }}</span
              >
              <span class="min-w-0 flex-1 truncate font-medium text-(--text-ink-main)">
                <span
                  class="mr-0.5 inline-block h-2 w-2 rounded-full align-baseline"
                  :class="familyDot(otherEnd(relation, 'subject')?.full_call_number)"
                />
                {{ otherEnd(relation, 'subject')?.name ?? '—' }}
                <span class="font-normal text-(--text-ink-muted)">→</span>
                {{ relation.name }}
              </span>
            </router-link>
          </li>
        </ul>
      </section>

      <section v-else>
        <BaseEyebrow size="field">屬於這個分類的實體 · {{ scope.entities_count ?? 0 }}</BaseEyebrow>
        <BaseCard variant="panel" class="mt-2">
          <div class="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-(--text-ink-body)">
            <span>文件 {{ scope.documentations_count ?? 0 }}</span>
            <span>技術 {{ scope.techniques_count ?? 0 }}</span>
            <span>實作 {{ scope.implementations_count ?? 0 }}</span>
          </div>
          <!-- **只給數字，沒有清單，而這是後端的現況不是偷懶。** 規格 B4 要的就是
               計數；`/api/scopes/{id}` 完全沒有回實體本身。要列出來需要一支帶分頁、
               依 scope 過濾的端點，那是規格第 6 步的事。這裡寧可寫清楚也不要拿
               `/api/techniques` 整批撈回來再前端過濾——那在 20 筆時看起來沒問題，
               資料長大就是把整個資料表下載到瀏覽器。 -->
          <div class="mt-3 text-xs leading-relaxed text-(--text-ink-muted)">
            清單還沒有端點可以打。<code class="font-mono">/api/scopes/{id}</code> 只回計數（規格
            B4），要逐筆列出需要一支依分類過濾、帶分頁的端點。
          </div>
        </BaseCard>
      </section>
    </div>
  </div>
</template>
