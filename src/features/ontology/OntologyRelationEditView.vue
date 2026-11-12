<script setup lang="ts">
/**
 * Relation 新增／編輯（規格「本體論編輯規格」第 8 步，v4 補記的細節見下）。
 *
 * **跟 Scope 編輯頁不一樣的兩點，都是 v4 核對程式碼才發現、規格 v3 沒寫清楚的**：
 *
 * 1. `class_number` 沒有後端推導（Scope 的 B1 沒有對應的 Relation 版本）——
 *    `StoreRelationRequest`／`UpdateRelationRequest` 仍是 `required|numeric` 的
 *    一般輸入，這裡要自己用 `deriveRelationClassNumber()` 算好兩碼族別編碼
 *    （主詞族＋受詞族）放進 payload，唯讀顯示不代表不用送。
 * 2. G1 沒有對應的候選端點——`fetchRelationCandidateList()` 撈全部關係回來，
 *    前端自己重算一次 `ReverseIsAvailable`／`ReverseIsSwapped` 的邏輯
 *    （`findReverseCandidates()`）才能顯示候選，不是後端算好給的。後端不限制同一組
 *    主詞受詞只能有一條可配對的述詞，所以候選可能不只一個：只有一個時勾選即可，
 *    多個時另外給下拉讓使用者挑，不替他選。
 *
 * **鎖定（G5）**：一旦這條被任何邊引用，`subject_id`／`object_id`／`name`／
 * `call_number`（連帶 `class_number`）就不能再改，只剩 `note` 可以動——
 * `reverse_id` 不在 `Relation::LOCKED_FIELDS` 裡，鎖定時仍然可以調整反向配對。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseField from '@/components/BaseField.vue'
import BaseHint from '@/components/BaseHint.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import BaseSelect, { type SelectOption } from '@/components/BaseSelect.vue'
import BaseTag from '@/components/BaseTag.vue'
import BaseTextarea from '@/components/BaseTextarea.vue'
import { ApiValidationError } from '@/api/client'
import {
  createRelation,
  deriveRelationClassNumber,
  fetchRelationCandidateList,
  fetchScopeList,
  fetchRelation,
  findReverseCandidates,
  updateRelation,
  type RelationCandidateDto,
  type RelationDetailDto,
  type ScopeListDto,
  type RelationWritePayload,
} from '@/api/ontology'

const NOTE_LIMIT = 255

const route = useRoute()
const router = useRouter()

const editingId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? Number(id) : null
})
const isEditing = computed(() => editingId.value !== null)

const tops = ref<ScopeListDto[]>([])
const allRelations = ref<RelationCandidateDto[]>([])
const existing = ref<RelationDetailDto | null>(null)

const ready = ref(false)
const loadError = ref(false)

const subjectId = ref<number | null>(null)
const objectId = ref<number | null>(null)
const callNumber = ref('')
const name = ref('')
const note = ref('')
const hasReverse = ref(false)
/** 使用者挑的（或載入時既有的）反向對象 id；null = 還沒挑。實際送出的值見 `selectedReverseId`。 */
const reverseChoice = ref<number | null>(null)
/** 載入時詳情的 reverse_id 指向的述詞已不在清單裡(清單不含已刪除的資料)。 */
const reverseDeleted = ref(false)

const saving = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const saveError = ref('')

const subjectOptions = computed<SelectOption[]>(() =>
  tops.value.map((s) => ({ value: s.id, label: s.name, suffix: s.full_call_number })),
)
const objectOptions = subjectOptions

const subjectScope = computed(() => tops.value.find((s) => s.id === subjectId.value) ?? null)
const objectScope = computed(() => tops.value.find((s) => s.id === objectId.value) ?? null)

const classNumber = computed(() =>
  deriveRelationClassNumber(subjectScope.value?.full_call_number, objectScope.value?.full_call_number),
)

const isSymmetric = computed(
  () => subjectId.value !== null && subjectId.value === objectId.value,
)

interface ReverseOption {
  id: number
  name: string
  /** 把自己當作反向（對稱關係）。 */
  self: boolean
}

/**
 * G1：可以當作反向的述詞。主詞受詞對調、還沒配對（或已配對給這一筆）的都算；
 * 主詞受詞相同時，編輯既有這一筆還可以指向自己（新增時還沒有 id 可以指）。
 * 主詞受詞同型別不代表語意對稱，所以「自己」只是其中一個選項，不是唯一選項。
 */
const reverseCandidates = computed<ReverseOption[]>(() => {
  if (subjectId.value === null || objectId.value === null) return []
  const others = findReverseCandidates(
    allRelations.value,
    subjectId.value,
    objectId.value,
    editingId.value,
  ).map((r) => ({ id: r.id, name: r.name, self: false }))
  const self =
    isSymmetric.value && editingId.value !== null
      ? [{ id: editingId.value, name: name.value, self: true }]
      : []
  return [...others, ...self]
})

const canToggleReverse = computed(() => reverseCandidates.value.length > 0)

const reverseSelectOptions = computed<SelectOption[]>(() =>
  reverseCandidates.value.map((c) => ({
    value: c.id,
    label: c.self ? `${c.name || '這一條'}（自己，對稱）` : c.name,
  })),
)

/**
 * 實際送出的 reverse_id。勾著時，使用者挑的（或載入時既有的）對象仍是候選就沿用，
 * 不重新猜；只有一個候選時自動採用；多個候選又沒挑，就是 null（不能存檔）。
 */
const selectedReverseId = computed<number | null>(() => {
  if (!hasReverse.value) return null
  const candidates = reverseCandidates.value
  const choice = reverseChoice.value
  if (choice !== null && candidates.some((c) => c.id === choice)) return choice
  return candidates.length === 1 ? candidates[0]!.id : null
})

const reverseSelectModel = computed<number | null>({
  get: () => selectedReverseId.value,
  set: (value) => {
    reverseChoice.value = value
  },
})

const soleReverseCandidate = computed(() =>
  reverseCandidates.value.length === 1 ? reverseCandidates.value[0]! : null,
)

const lockedFields = computed(() => existing.value?.locked_fields ?? [])
const isLocked = (field: string) => lockedFields.value.includes(field)

/** 跟 `OntologyRelationDetailView.vue` 的 `lockReason` 同一段文字，鎖定的理由要在編輯表單裡講一次,不能只給唯讀頁看。 */
const lockReason = computed(() => {
  const r = existing.value
  if (!r || !r.is_referenced) return null
  if (r.referenced_via === 'self') {
    return `這條述詞已經被 ${r.own_edges_count} 條邊引用，主詞、受詞與名稱都不能再改——改掉等於追溯竄改那些邊的意思。只有「註釋」還可以改。`
  }
  return `這條述詞自己沒有任何邊，但它的反向${r.reverse ? `（${r.reverse.name}）` : ''}有 ${r.reverse_edges_count} 條。兩條是同一組配對，改掉這條的主詞受詞，那些邊的反向讀法就會變成另一個意思。只有「註釋」還可以改。`
})

async function load() {
  loadError.value = false
  ready.value = false
  try {
    const [scopes, relations] = await Promise.all([fetchScopeList(), fetchRelationCandidateList()])
    tops.value = scopes.filter((s) => s.parent_class === null)
    allRelations.value = relations

    if (isEditing.value) {
      const detail = await fetchRelation(editingId.value!)
      existing.value = detail
      subjectId.value = detail.subject
      objectId.value = detail.object
      callNumber.value = detail.call_number ?? ''
      name.value = detail.name
      note.value = detail.note ?? ''
      // 反向原值不在候選清單裡(而且不是對稱述詞指向自己)時不照抄:照抄的話,
      // 候選只剩一條會被悄悄改配對到它,沒有候選又會悄悄取消勾選。改成明講原本的
      // 反向已被刪除,維持未勾選,使用者要的話自己勾,再走原本的候選邏輯。
      const reverseMissing =
        detail.reverse_id !== null &&
        detail.reverse_id !== detail.id &&
        !relations.some((r) => r.id === detail.reverse_id)
      reverseDeleted.value = reverseMissing
      hasReverse.value = detail.reverse_id !== null && !reverseMissing
      reverseChoice.value = reverseMissing ? null : detail.reverse_id
    }
    ready.value = true
  } catch {
    loadError.value = true
  }
}

watch(() => route.fullPath, load, { immediate: true })

/** 換主詞／受詞時,原本勾著的反向不一定還適用——沒有候選了就自動取消勾選,不留著一個打不開的狀態。 */
watch([subjectId, objectId], () => {
  if (!canToggleReverse.value) hasReverse.value = false
})

const noteOverLimit = computed(() => [...note.value].length > NOTE_LIMIT)

const canSave = computed(
  () =>
    !saving.value &&
    subjectId.value !== null &&
    objectId.value !== null &&
    classNumber.value !== null &&
    name.value.trim() !== '' &&
    !noteOverLimit.value &&
    !(hasReverse.value && selectedReverseId.value === null),
)

async function save() {
  if (!canSave.value) return
  saving.value = true
  fieldErrors.value = {}
  saveError.value = ''

  const payload: RelationWritePayload = {
    subject_id: subjectId.value!,
    object_id: objectId.value!,
    class_number: classNumber.value!,
    call_number: callNumber.value.trim(),
    name: name.value.trim(),
    note: note.value.trim(),
    reverse_id: selectedReverseId.value,
  }

  try {
    const res = isEditing.value
      ? await updateRelation(editingId.value!, payload)
      : await createRelation(payload)
    router.push({ name: 'ontology-relation', params: { id: res.data.id } })
  } catch (error) {
    if (error instanceof ApiValidationError) {
      fieldErrors.value = error.fieldErrors
      // 422 卻沒有任何欄位錯誤（body 沒有 errors，或解析失敗）：沒有地方可以掛，
      // 用例外自帶的通用訊息補上，不要讓儲存失敗卻什麼都不顯示。
      if (Object.keys(error.fieldErrors).length === 0) saveError.value = error.message
      // 規格 B2 記的情況：後端可能回一個對不上任何輸入欄位的 key（例如 `locked`）,
      // 訊息會渲染不到任何地方變成靜默失敗——收進整頁訊息,寧可重複顯示也不要消失。
      const known = ['subject_id', 'object_id', 'class_number', 'call_number', 'name', 'note', 'reverse_id']
      const unmatched = Object.entries(error.fieldErrors)
        .filter(([field]) => !known.includes(field))
        .map(([, message]) => message)
      if (unmatched.length) saveError.value = unmatched.join('；')
    } else {
      saveError.value = error instanceof Error ? error.message : '儲存失敗'
    }
  } finally {
    saving.value = false
  }
}

function cancel() {
  if (isEditing.value) {
    router.push({ name: 'ontology-relation', params: { id: editingId.value! } })
  } else {
    router.push({ name: 'ontology-scopes' })
  }
}
</script>

<template>
  <BaseLoadingBlock v-if="loadError" height="220px" tone="error"> 讀不到這個述詞 </BaseLoadingBlock>
  <BaseLoadingBlock v-else-if="!ready" height="220px">LOADING</BaseLoadingBlock>

  <div v-else class="w-full max-w-[44rem]">
    <div
      class="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-(--text-ink-muted)"
    >
      <span>本體論</span><span>/</span><span>述詞</span><span>/</span>
      <span class="text-(--text-ink-body)">{{ isEditing ? name : '新增述詞' }}</span>
    </div>

    <BaseCard variant="panel">
      <div class="flex flex-wrap items-center gap-2.5">
        <BaseEyebrow>{{ isEditing ? '編輯述詞' : '新增述詞' }}</BaseEyebrow>
        <BaseTag v-if="existing?.is_referenced" tone="accent">已被引用 · 欄位鎖定</BaseTag>
      </div>

      <BaseCard
        v-if="lockReason"
        variant="panel"
        class="mt-3 border-l-[3px] border-l-(--text-accent)"
      >
        <div class="text-sm leading-relaxed text-(--text-ink-body)">{{ lockReason }}</div>
      </BaseCard>

      <div class="mt-4 flex flex-col gap-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseField label="主詞">
            <BaseSelect
              v-model="subjectId"
              :options="subjectOptions"
              :disabled="isLocked('subject_id')"
              placeholder="選一個頂層分類"
            />
            <BaseHint v-if="fieldErrors.subject_id" tone="error">{{
              fieldErrors.subject_id
            }}</BaseHint>
          </BaseField>

          <BaseField label="受詞">
            <BaseSelect
              v-model="objectId"
              :options="objectOptions"
              :disabled="isLocked('object_id')"
              placeholder="選一個頂層分類"
            />
            <BaseHint v-if="fieldErrors.object_id" tone="error">{{
              fieldErrors.object_id
            }}</BaseHint>
          </BaseField>
        </div>

        <BaseHint v-if="classNumber">
          class {{ classNumber }} · 由主詞受詞的族別算出，隨表單一起送出
        </BaseHint>
        <BaseHint v-else dim>主詞跟受詞都選好之後才算得出類號</BaseHint>

        <BaseField label="名稱" hint="必填 · 不可重複">
          <BaseInput v-model="name" :disabled="isLocked('name')" />
          <BaseHint v-if="fieldErrors.name" tone="error">{{
            fieldErrors.name
          }}</BaseHint>
        </BaseField>

        <BaseField label="子類號" hint="選填 · 數字">
          <BaseInput v-model="callNumber" :disabled="isLocked('call_number')" />
          <BaseHint v-if="fieldErrors.call_number" tone="error">{{
            fieldErrors.call_number
          }}</BaseHint>
        </BaseField>

        <!-- G1：沒有候選就講清楚沒東西可勾，不留一個勾了也沒用的 checkbox；
             候選超過一個時另外給下拉，由使用者挑。 -->
        <BaseField label="反向關係">
          <label class="flex items-center gap-2 text-sm text-(--text-ink-main)">
            <input
              v-model="hasReverse"
              type="checkbox"
              :disabled="!canToggleReverse"
              class="h-4 w-4 accent-(--text-accent) disabled:opacity-40"
            />
            有反向關係
          </label>
          <BaseHint v-if="reverseDeleted && !hasReverse" class="mt-1 block" tone="error">
            原本的反向述詞已被刪除，儲存後這條述詞不再有反向，需要時可重新勾選
          </BaseHint>
          <BaseSelect
            v-if="hasReverse && reverseCandidates.length > 1"
            v-model="reverseSelectModel"
            :options="reverseSelectOptions"
            placeholder="選一條反向述詞"
          />
          <BaseHint v-if="reverseCandidates.length > 1" class="mt-1 block">
            有 {{ reverseCandidates.length }} 條可以配對，勾選後要自己挑一條
          </BaseHint>
          <BaseHint v-else-if="soleReverseCandidate?.self" class="mt-1 block">
            對稱關係，自己就是自己的反向
          </BaseHint>
          <BaseHint v-else-if="soleReverseCandidate" class="mt-1 block">
            候選：{{ soleReverseCandidate.name }}
          </BaseHint>
          <BaseHint v-else-if="isSymmetric" class="mt-1 block" dim>
            主詞受詞相同，是對稱關係——但要先存檔拿到 id 才能把反向指向自己，這裡先不勾
          </BaseHint>
          <BaseHint v-else class="mt-1 block" dim>
            還沒有對調的那一條，要先建立主詞受詞對調的述詞才能勾選
          </BaseHint>
          <BaseHint v-if="fieldErrors.reverse_id" class="mt-1 block" tone="error">{{
            fieldErrors.reverse_id
          }}</BaseHint>
        </BaseField>

        <BaseField label="註釋" :hint="`選填 · 上限 ${NOTE_LIMIT} 字`">
          <BaseTextarea v-model="note" :rows="3" :limit="NOTE_LIMIT" />
          <BaseHint v-if="fieldErrors.note" tone="error">{{
            fieldErrors.note
          }}</BaseHint>
        </BaseField>
      </div>

      <p
        v-if="saveError"
        class="mt-4 border border-(--text-accent) bg-(--bg-folder) px-3 py-2 text-sm text-(--text-accent)"
        role="alert"
      >
        {{ saveError }}
      </p>

      <div class="mt-6 flex items-center gap-3">
        <BaseButton variant="primary" :disabled="!canSave" @click="save">
          {{ saving ? '儲存中' : '儲存' }}
        </BaseButton>
        <BaseButton variant="ghost" @click="cancel">取消</BaseButton>
      </div>
    </BaseCard>
  </div>
</template>
