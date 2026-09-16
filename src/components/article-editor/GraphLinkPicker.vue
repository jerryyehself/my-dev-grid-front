<script setup lang="ts">
// 新增一條圖譜關聯的三步驟挑選器：選族 → 選實體 → 選述詞。
//
// 之所以硬性要求第三步，是因為三張 pivot 表與 entity_relations 都帶 relation_id：
// 只選對象不選述詞，存進去的就只是標籤，不是圖譜。所以「建立關聯」在述詞選定之前
// 一律不可按，而且畫面上一直顯示這條邊正反兩個方向長什麼樣子。
import { computed, ref, watch } from 'vue'
import BaseHint from '@/components/BaseHint.vue'
import {
  FAMILY_COLOR,
  FAMILY_LABEL,
  SAME_TYPE_PREDICATES,
  fetchEntityOptions,
  fetchRelations,
  storageTargetOf,
  type EntityFamily,
  type EntityOption,
  type RelationDto,
} from '@/api/ontology'
import BaseCard from '@/components/BaseCard.vue'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseInput from '@/components/BaseInput.vue'

const props = defineProps<{
  /** 已經連過的實體，避免重複建立同一條邊。key 是 `${family}:${id}`。 */
  existingKeys: string[]
  /** 從「這個標籤其實是圖譜實體」那條提示過來時，直接把族與實體帶進來，不用再挑一次。 */
  presetFamily?: EntityFamily
  presetEntityTitle?: string
}>()

const emit = defineEmits<{
  cancel: []
  create: [payload: { family: EntityFamily; entity: EntityOption; predicate: string; reverse: string }]
}>()

const family = ref<EntityFamily>(props.presetFamily ?? 'technique')
const query = ref('')
const picked = ref<EntityOption | null>(null)
const predicate = ref<string | null>(null)

const options = ref<EntityOption[]>([])
const relations = ref<RelationDto[]>([])
const loadError = ref<string | null>(null)

fetchRelations()
  .then((r) => (relations.value = r))
  .catch(() => (loadError.value = '讀不到述詞清單'))

// 換族就整批重抓,順便把已選的實體與述詞清掉——留著上一族的選擇會做出對不上的邊
watch(
  family,
  (f) => {
    picked.value = null
    predicate.value = null
    query.value = ''
    options.value = []
    fetchEntityOptions(f)
      .then((r) => {
        options.value = r
        // 預設實體只在第一次載入這一族時套用:使用者後來自己換族,就不該再被拉回來
        if (props.presetEntityTitle && f === props.presetFamily) {
          const hit = r.find((o) => o.title.toLowerCase() === props.presetEntityTitle?.toLowerCase())
          if (hit) picked.value = hit
        }
      })
      .catch(() => (loadError.value = '讀不到實體清單'))
  },
  { immediate: true },
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = q ? options.value.filter((o) => o.title.toLowerCase().includes(q)) : options.value
  return list.slice(0, 40)
})

const byId = computed(() => new Map(relations.value.map((r) => [r.id, r.name])))

/**
 * 述詞清單依族收斂:連到同型別（文章對文章）只留 SAME_TYPE_PREDICATES,
 * 其餘那些（documents / specs…）語意上都是跨型別的,列出來只會讓人選到存不進去的組合。
 */
const predicateOptions = computed(() => {
  if (family.value === 'documentation') {
    return relations.value.filter((r) => (SAME_TYPE_PREDICATES as readonly string[]).includes(r.name))
  }
  return relations.value.filter((r) => !(SAME_TYPE_PREDICATES as readonly string[]).includes(r.name))
})

const reverseName = computed(() => {
  const r = relations.value.find((x) => x.name === predicate.value)
  if (!r || r.reverse_id === null) return null
  return byId.value.get(r.reverse_id) ?? null
})

const isExisting = (o: EntityOption) => props.existingKeys.includes(`${family.value}:${o.id}`)

const canCreate = computed(() => picked.value !== null && predicate.value !== null && reverseName.value !== null)

function submit() {
  if (!picked.value || !predicate.value || !reverseName.value) return
  emit('create', {
    family: family.value,
    entity: picked.value,
    predicate: predicate.value,
    reverse: reverseName.value,
  })
}
</script>

<template>
  <BaseCard variant="panel" class="sm:p-5 space-y-5">
    <div class="space-y-1.5">
      <BaseEyebrow size="field">新增圖譜關聯</BaseEyebrow>
      <p class="text-[12.5px] leading-6 text-(--text-ink-body)">
        pivot 表帶 relation_id，所以關聯一定要選述詞——只選對象等於只是標籤，不是圖譜。
      </p>
    </div>

    <p v-if="loadError" class="font-mono text-[11px] text-(--text-accent)">
      {{ loadError }}——後端沒起來的話這裡沒有替代資料可用，不會改用寫死的清單。
    </p>

    <!-- 1 · 族 -->
    <div class="space-y-2">
      <BaseHint class="block tracking-[0.12em]">1 · 要連到哪一族</BaseHint>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(label, key) in FAMILY_LABEL"
          :key="key"
          type="button"
          class="font-mono text-[10px] tracking-[0.1em] rounded-full border px-3 py-1.5 transition-colors duration-100 ease-out"
          :class="
            family === key
              ? 'border-(--text-accent) bg-(--bg-folder) text-(--text-accent) font-bold'
              : 'border-(--border-shelf) text-(--text-ink-muted) hover:text-(--text-ink-main)'
          "
          @click="family = key as EntityFamily"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <!-- 2 · 實體 -->
    <div class="space-y-2">
      <div class="flex items-baseline justify-between gap-3">
        <BaseHint class="block tracking-[0.12em]">2 · 挑實體</BaseHint>
        <BaseHint class="block">{{ filtered.length }} 筆</BaseHint>
      </div>
      <BaseInput v-model="query" placeholder="搜尋…" class="w-full text-[13px]" />
      <div class="max-h-[190px] overflow-y-auto border border-(--border-shelf) rounded-[5px] divide-y divide-(--border-shelf)">
        <button
          v-for="o in filtered"
          :key="o.id"
          type="button"
          :disabled="isExisting(o)"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 ease-out disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-(--bg-folder)"
          :class="picked?.id === o.id ? 'bg-(--bg-folder)' : ''"
          @click="picked = o"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :style="{ backgroundColor: FAMILY_COLOR[family] }"
          ></span>
          <span class="text-[13px] font-bold text-(--text-ink-main) truncate">{{ o.title }}</span>
          <BaseHint v-if="o.scope" dim class="shrink-0">
            {{ o.scope }}
          </BaseHint>
          <BaseHint v-if="isExisting(o)" class="ml-auto shrink-0">已連</BaseHint>
          <svg
            v-else-if="picked?.id === o.id"
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
            class="ml-auto shrink-0 text-(--text-accent)"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
        <p v-if="!filtered.length" class="px-3 py-3 font-mono text-[11px] text-(--text-ink-muted)">沒有符合的實體</p>
      </div>
    </div>

    <!-- 3 · 述詞 -->
    <div class="space-y-2">
      <BaseHint class="block tracking-[0.12em]">
        3 · 這篇文章跟它是什麼關係
      </BaseHint>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="r in predicateOptions"
          :key="r.id"
          type="button"
          class="font-mono text-[10px] tracking-[0.08em] rounded-full border px-2.5 py-1 transition-colors duration-100 ease-out"
          :class="
            predicate === r.name
              ? 'border-(--text-accent) bg-(--bg-folder) text-(--text-accent) font-bold'
              : 'border-(--border-shelf) text-(--text-ink-muted) hover:text-(--text-ink-main)'
          "
          @click="predicate = r.name"
        >
          {{ r.name }}
        </button>
      </div>
    </div>

    <!-- 這條邊長什麼樣子。正反兩向都畫出來,因為述詞成對可逆是這套本體論的核心 -->
    <div class="border border-(--border-shelf) rounded-[5px] bg-(--bg-folder) p-3 space-y-2">
      <BaseEyebrow size="field">會寫進圖譜的這條邊</BaseEyebrow>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
        <span class="text-(--text-ink-main) font-bold">這篇文章</span>
        <BaseHint dim>0030 post</BaseHint>
        <span class="font-mono text-[11px] text-(--text-accent) font-bold">
          {{ predicate ?? '—' }}
        </span>
        <span class="text-(--text-ink-main) font-bold">{{ picked?.title ?? '—' }}</span>
        <BaseHint v-if="picked?.scope" dim>
          {{ picked.scope }}
        </BaseHint>
      </div>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-(--text-ink-body)">
        <BaseHint>反向</BaseHint>
        <span>{{ picked?.title ?? '—' }}</span>
        <span class="font-mono text-[11px] text-(--text-accent)">{{ reverseName ?? '—' }}</span>
        <span>這篇文章</span>
      </div>
      <BaseHint class="block leading-5">
        存進 {{ storageTargetOf(family) }}
      </BaseHint>
    </div>

    <div class="flex items-center justify-end gap-2">
      <button
        type="button"
        class="font-mono text-[10px] tracking-[0.3em] uppercase rounded-full border border-(--border-shelf) px-4 py-2 text-(--text-ink-body) hover:text-(--text-ink-main) transition-colors duration-100 ease-out"
        @click="emit('cancel')"
      >
        取消
      </button>
      <button
        type="button"
        :disabled="!canCreate"
        class="font-mono text-[10px] tracking-[0.3em] uppercase rounded-full border border-(--text-ink-main) bg-(--text-ink-main) px-4 py-2 font-bold text-(--bg-paper-light) transition-opacity duration-100 ease-out disabled:opacity-35 disabled:cursor-not-allowed"
        @click="submit"
      >
        建立關聯
      </button>
    </div>
  </BaseCard>
</template>
