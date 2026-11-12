<script setup lang="ts">
// 匯入清單的一列：一個來源檔案、它在站上的狀態，以及這一列要做什麼。
// 能選哪些動作由狀態決定（allowedActions）；invalid、removed、site_deleted、unchanged 只是資訊，
// 沒有動作可選。警告只顯示規則說明與行號，後端不會帶比對到的文字，這裡也不去猜。
import { computed } from 'vue'
import BaseHint from '@/components/BaseHint.vue'
import BaseSegmented from '@/components/BaseSegmented.vue'
import BaseSelect, { type SelectOption } from '@/components/BaseSelect.vue'
import BaseSwitch from '@/components/BaseSwitch.vue'
import type { ImportAction, SourceItem } from './articleImportApi'
import {
  ACTION_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  allowedActions,
  overwritesPublished,
  type RowChoice,
} from './articleImportRules'

const props = defineProps<{
  item: SourceItem
  /** 對應的站上文章標題；載入不到時是 null，只顯示編號。 */
  siteTitle: string | null
  /** 「連結既有文章」可以選的文章。 */
  linkOptions: SelectOption[]
  /** 站上文章清單載入失敗，沒辦法選要連結的文章。 */
  linkUnavailable: boolean
}>()

const choice = defineModel<RowChoice>({ required: true })

const actions = computed(() => allowedActions(props.item.status))
const actionOptions = computed(() =>
  (['none', ...actions.value] as (ImportAction | 'none')[]).map((value) => ({
    value,
    label: ACTION_LABEL[value],
  })),
)

const action = computed<ImportAction | 'none'>({
  get: () => choice.value.action,
  set: (value) => {
    choice.value = { ...choice.value, action: value }
  },
})
const target = computed<number | null>({
  get: () => choice.value.documentationId,
  set: (value) => {
    choice.value = { ...choice.value, documentationId: value }
  },
})
const overwrite = computed<boolean>({
  get: () => choice.value.overwrite,
  set: (value) => {
    choice.value = { ...choice.value, overwrite: value }
  },
})

const displayTitle = computed(() => props.item.title ?? props.item.key ?? props.item.path)
const isConflict = computed(() => props.item.status === 'conflict')
const badgeClass = computed(
  () =>
    ({
      accent: 'border-(--border-shelf) bg-(--bg-folder) text-(--text-accent) font-bold',
      plain: 'border-(--border-shelf) text-(--text-ink-body)',
      muted: 'border-dashed border-(--border-shelf) text-(--text-ink-muted)',
      error: 'border-(--text-error) text-(--text-error) font-bold',
    })[STATUS_TONE[props.item.status]],
)
</script>

<template>
  <li
    class="flex flex-col gap-3 px-4 sm:px-5 py-[18px] border-b border-(--border-shelf) last:border-b-0"
    :data-status="item.status"
  >
    <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 items-start">
      <div class="flex flex-col gap-[5px] min-w-0">
        <span class="text-[15px] font-bold text-(--text-ink-main) break-words">{{ displayTitle }}</span>
        <BaseHint class="!tracking-[0.04em] break-all">
          <template v-if="item.key">{{ item.key }} · </template>{{ item.path }}
        </BaseHint>
        <p v-if="item.documentation_id !== null" class="m-0 text-[13px] text-(--text-ink-body)">
          站上文章：
          <router-link
            :to="{ name: 'article-editor', params: { id: item.documentation_id } }"
            class="font-bold text-(--text-accent) hover:underline"
          >
            {{ siteTitle ?? `#${item.documentation_id}` }}
          </router-link>
          <template v-if="item.published !== null"
            > · {{ item.published ? '已發布' : '草稿' }}</template
          >
        </p>
      </div>
      <span
        class="font-mono text-[11px] tracking-[0.08em] rounded-full border px-[9px] py-[3px] whitespace-nowrap"
        :class="badgeClass"
        data-test="status-badge"
      >
        {{ STATUS_LABEL[item.status] }}
      </span>
    </div>

    <!-- 無法匯入：只顯示原因，沒有動作 -->
    <p v-if="item.status === 'invalid'" class="m-0 text-[13px] text-(--text-error)" data-test="invalid-reason">
      {{ item.reason_message ?? item.reason ?? '這個檔案不能匯入。' }}
    </p>
    <p v-else-if="item.status === 'removed'" class="m-0 text-[13px] text-(--text-ink-muted)">
      來源已經沒有這篇，站上的文章不受影響。
    </p>
    <p v-else-if="item.status === 'site_deleted'" class="m-0 text-[13px] text-(--text-ink-muted)">
      對應的文章在站上已刪除，不會再匯入。
    </p>

    <div v-if="actions.length" class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <BaseSegmented v-model="action" :options="actionOptions" :label="`「${displayTitle}」的處理方式`" />

      <div
        v-if="action === 'link'"
        role="group"
        :aria-label="`「${displayTitle}」要連結的文章`"
        class="sm:min-w-[260px] sm:max-w-[420px] flex flex-col gap-1.5"
      >
        <BaseSelect
          v-model="target"
          :options="linkOptions"
          :disabled="linkUnavailable"
          placeholder="選擇要連結的文章"
        />
        <BaseHint v-if="linkUnavailable" tone="error">站上文章清單載入失敗，無法選擇。</BaseHint>
      </div>

      <BaseSwitch v-if="isConflict && action === 'update'" v-model="overwrite" label="覆蓋站上的修改" />
    </div>

    <p v-if="isConflict && action === 'update'" class="m-0 text-[13px] text-(--text-ink-body)">
      站上的內文在上次匯入之後改過，更新會用來源的內容覆蓋。
    </p>
    <p v-if="overwritesPublished(item, choice)" class="m-0 text-[13px] text-(--text-ink-body)" data-test="published-note">
      這篇已發布，更新後站上會直接換成來源的內容。
    </p>
    <p v-if="action === 'create'" class="m-0 text-[13px] text-(--text-ink-muted)">新增後是草稿，不會自動發布。</p>
    <p v-if="action === 'link'" class="m-0 text-[13px] text-(--text-ink-muted)">
      只把來源記到這篇文章上，標題與內文維持站上的版本。
    </p>

    <!-- 發布前要人工確認的內容：只提醒不阻擋，也不顯示比對到的文字 -->
    <div v-if="item.warnings.length" class="flex flex-col gap-1" data-test="warnings">
      <BaseHint tone="error">發布前請確認</BaseHint>
      <ul class="m-0 p-0 list-none flex flex-col gap-0.5">
        <li
          v-for="(warning, index) in item.warnings"
          :key="index"
          class="text-[13px] text-(--text-error)"
        >
          <template v-if="warning.line !== null">第 {{ warning.line }} 行：</template>{{ warning.message }}
        </li>
      </ul>
    </div>
  </li>
</template>
