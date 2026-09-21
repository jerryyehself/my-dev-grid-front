<script setup lang="ts">
/**
 * Scope 新增／編輯（規格「本體論編輯規格」第 5、6 步）。
 *
 * **新增與編輯是同一頁,因為後端的 payload 現在真的一樣**——這是 D-51／#61 的直接
 * 成果。在那之前 `class_number` 在 POST 收的是父 scope 的 id、在 PUT 收的是字面
 * 分類號,同一個欄位名兩種語意,前端只能像 Triple 那樣把同一個欄位在兩個表單裡
 * 換成不同的控制項(`AppTripleEdit.vue` 的 number 對 `AppTripleNew.vue` 的 select),
 * 等於把 API 的不一致往前端推。現在兩個動詞送同一份 `ScopeWritePayload`。
 *
 * **仍然不對稱的一點**:`comment` 在 `StoreScopeRequest` 是 `required|max:100`,
 * 在 `UpdateScopeRequest` 只有 `max:100`。所以必填標示跟著動詞走,不是兩邊都標必填——
 * 那會擋掉後端其實允許的操作(把既有分類的說明清空)。
 *
 * **寫入路徑無法端到端驗證**,規格 §08 已經講明:`store`/`update` 在 `auth:sanctum`
 * 後面,而登入(D-34／D-49)還沒做。本機開發用的是「暫時拿掉 auth:sanctum 但絕不
 * 提交」,後端 15 支 `rejects_unauthenticated_request` 測試會在 CI 擋住誤提交。
 * 也就是說:**這一頁的讀取與驗證邏輯測得到,真正送出去那一步測不到。**
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
import BaseTextarea from '@/components/BaseTextarea.vue'
import { ApiValidationError } from '@/api/client'
import {
  createScope,
  fetchScope,
  fetchScopeList,
  previewFullCallNumber,
  updateScope,
  type ScopeListDto,
} from '@/api/ontology'

/** 後端 `comment` 是 `max:100`、`note` 是 `max:255`。數字寫在這裡是因為它是**後端的**約束。 */
const COMMENT_LIMIT = 100
const NOTE_LIMIT = 255

const route = useRoute()
const router = useRouter()

const editingId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? Number(id) : null
})
const isEditing = computed(() => editingId.value !== null)

const tops = ref<ScopeListDto[]>([])
const ready = ref(false)
const loadError = ref(false)

const parentClass = ref<number | null>(null)
const callNumber = ref('')
const name = ref('')
const comment = ref('')
const note = ref('')

const saving = ref(false)
/** 欄位層級的錯誤,key 是後端的欄位名。整頁層級的失敗另外放 `saveError`。 */
const fieldErrors = ref<Record<string, string>>({})
const saveError = ref('')

const parentOptions = computed<SelectOption[]>(() =>
  tops.value.map((s) => ({ value: s.id, label: s.name, suffix: s.full_call_number })),
)

const selectedParent = computed(() => tops.value.find((s) => s.id === parentClass.value) ?? null)

/**
 * G2 的「選完即時顯示推算出來的完整分類號」。
 *
 * 推導照抄後端 `SetCURIEAttribute::getFullCallNumberAttribute()`——就是
 * `class_number . call_number` 的字串相接,沒有分隔符、沒有補零。子類號留空時
 * 預覽只有兩碼,那正是後端會存出來的結果,不要自己補一個 '00' 讓它看起來完整。
 */
const preview = computed(() =>
  selectedParent.value
    ? previewFullCallNumber(selectedParent.value.class_number, callNumber.value)
    : null,
)

async function load() {
  loadError.value = false
  try {
    const rows = await fetchScopeList()
    tops.value = rows.filter((s) => s.parent_class === null)

    if (isEditing.value) {
      const detail = await fetchScope(editingId.value!)
      parentClass.value = detail.parent_class
      callNumber.value = detail.call_number ?? ''
      name.value = detail.name
      comment.value = detail.comment ?? ''
      note.value = detail.note ?? ''
    }
    ready.value = true
  } catch {
    loadError.value = true
  }
}

watch(() => route.fullPath, load, { immediate: true })

/**
 * 換父層時把子類號預填成那一層的下一個可用號碼。
 *
 * `new_child_call_number` 只有 show 端點才給(`withFormHints()`),清單那一批裡
 * 沒有這個 key,所以得對選到的父層單獨打一次。Triple 的 `fetchCallNumberByClass()`
 * 打的是同一支端點、做的是同一件事。
 *
 * **只在新增時預填,而且只在子類號還空著的時候**——編輯既有分類時蓋掉它現在的
 * 號碼等於偷偷改資料;使用者已經自己打了號碼時蓋掉他打的也一樣。
 */
watch(parentClass, async (id) => {
  if (id === null || isEditing.value || callNumber.value.trim() !== '') return
  try {
    const parent = await fetchScope(id)
    if (parent.new_child_call_number && callNumber.value.trim() === '') {
      callNumber.value = parent.new_child_call_number
    }
  } catch {
    // 預填失敗不是錯誤,只是少了個方便——使用者自己填得出來,不要為此擋住表單。
  }
})

const commentOverLimit = computed(() => [...comment.value].length > COMMENT_LIMIT)
const noteOverLimit = computed(() => [...note.value].length > NOTE_LIMIT)

/**
 * 送出前的本地擋關。
 *
 * 只擋**後端一定會退**的那幾項(必填、長度),不做後端沒有的規則——唯一性、
 * 子類號重複這類要查資料庫的驗證一律交給後端,前端猜不到也不該猜。
 */
const canSave = computed(
  () =>
    !saving.value &&
    parentClass.value !== null &&
    name.value.trim() !== '' &&
    (!isEditing.value ? comment.value.trim() !== '' : true) &&
    !commentOverLimit.value &&
    !noteOverLimit.value,
)

async function save() {
  if (!canSave.value) return
  saving.value = true
  fieldErrors.value = {}
  saveError.value = ''

  const payload = {
    parent_class: parentClass.value!,
    call_number: callNumber.value.trim(),
    name: name.value.trim(),
    comment: comment.value.trim(),
    note: note.value.trim(),
  }

  try {
    const res = isEditing.value
      ? await updateScope(editingId.value!, payload)
      : await createScope(payload)
    router.push({ name: 'ontology-scope', params: { id: res.data.id } })
  } catch (error) {
    if (error instanceof ApiValidationError) {
      fieldErrors.value = error.fieldErrors
      // 後端可能回一個對不上任何輸入欄位的 key(規格 B2 記的就是這種情況:
      // `locked` 對不上任何欄位,於是訊息渲染不到任何地方,變成靜默失敗)。
      // 把對不上的都收進整頁訊息,寧可重複顯示也不要讓它消失。
      const unmatched = Object.entries(error.fieldErrors)
        .filter(
          ([field]) => !['parent_class', 'call_number', 'name', 'comment', 'note'].includes(field),
        )
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
    router.push({ name: 'ontology-scope', params: { id: editingId.value! } })
  } else {
    router.push({ name: 'ontology-scopes' })
  }
}
</script>

<template>
  <BaseLoadingBlock v-if="loadError" height="220px" tone="error"> 讀不到這個分類 </BaseLoadingBlock>
  <BaseLoadingBlock v-else-if="!ready" height="220px">LOADING</BaseLoadingBlock>

  <div v-else class="w-full max-w-[44rem]">
    <div
      class="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-(--text-ink-muted)"
    >
      <router-link
        :to="{ name: 'ontology-scopes' }"
        class="border-b border-(--border-shelf) text-(--text-accent) transition-colors hover:border-(--text-accent)"
        >本體論</router-link
      >
      <span>/</span>
      <span class="text-(--text-ink-body)">{{ isEditing ? name : '新增分類' }}</span>
    </div>

    <BaseCard variant="panel">
      <BaseEyebrow>{{ isEditing ? '編輯分類' : '新增分類' }}</BaseEyebrow>

      <div class="mt-4 flex flex-col gap-5">
        <!-- G2：只列頂層,選完即時顯示推算出來的完整分類號。 -->
        <BaseField label="父類" hint="必填 · 只能選頂層分類">
          <BaseSelect v-model="parentClass" :options="parentOptions" placeholder="選一個頂層分類" />
          <BaseHint v-if="fieldErrors.parent_class" class="text-(--text-accent)">{{
            fieldErrors.parent_class
          }}</BaseHint>
        </BaseField>

        <BaseField label="子類號" hint="選填 · 數字">
          <BaseInput v-model="callNumber" />
          <!-- 分類號預覽。`class_number` 由後端從父層推導,不是使用者能填的欄位——
               這一行是讓他看見那個推導的結果,而不是讓他去控制它。 -->
          <BaseHint v-if="preview">
            完整分類號 {{ preview }}
            <template v-if="!callNumber.trim()"> · 子類號留空就只有分類號兩碼</template>
          </BaseHint>
          <BaseHint v-else dim>選好父類之後才算得出完整分類號</BaseHint>
          <BaseHint v-if="fieldErrors.call_number" class="text-(--text-accent)">{{
            fieldErrors.call_number
          }}</BaseHint>
        </BaseField>

        <BaseField label="名稱" hint="必填 · 不可重複">
          <BaseInput v-model="name" />
          <BaseHint v-if="fieldErrors.name" class="text-(--text-accent)">{{
            fieldErrors.name
          }}</BaseHint>
        </BaseField>

        <!-- G3：即時字數。必填標示跟著動詞走——後端新增必填、修改不必填。 -->
        <BaseField
          label="範圍說明"
          :hint="isEditing ? `選填 · 上限 ${COMMENT_LIMIT} 字` : `必填 · 上限 ${COMMENT_LIMIT} 字`"
        >
          <BaseTextarea v-model="comment" :rows="2" :limit="COMMENT_LIMIT" />
          <BaseHint v-if="fieldErrors.comment" class="text-(--text-accent)">{{
            fieldErrors.comment
          }}</BaseHint>
        </BaseField>

        <BaseField label="註釋" :hint="`選填 · 上限 ${NOTE_LIMIT} 字`">
          <BaseTextarea v-model="note" :rows="3" :limit="NOTE_LIMIT" />
          <BaseHint v-if="fieldErrors.note" class="text-(--text-accent)">{{
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

      <!-- 誠實揭露,不是免責聲明:寫入端點在 auth:sanctum 後面,而登入還沒做
           (D-34／D-49)。按下去會 401,這不是這一頁的 bug。 -->
      <div class="mt-4 text-xs leading-relaxed text-(--text-ink-muted)">
        寫入需要登入，而登入（D-34／D-49）還沒做——這頁的送出路徑目前無法端到端驗證。
      </div>
    </BaseCard>
  </div>
</template>
