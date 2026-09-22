<script setup lang="ts">
// 文章編輯頁。D-56（登入）落地後，title/body/分類號（type）/Technique與
// Implementation 關聯/發布狀態這幾項後端真的有欄位撐著的東西改成真的存讀。
//
// summary/intro（D-57）：不開獨立欄位，也不開獨立輸入框——內容本來就該寫在
// Body 的 Markdown 裡，用格式帶（例如第一段當作 intro），不是另外存一份。
//
// margins（邊註）/純標籤/文章對文章關聯這三項，後端 documentations 資料表
// 完全沒有對應欄位（entity_relations 表存在，但 DocumentationController
// 沒有 sync 邏輯，文章對文章連結目前寫不進去）——刻意留在本地狀態、不送進
// payload，不假裝存得住，理由跟做法見下面「存檔」那段與畫面上的說明文字。
//
// 本體論上的定位（D-40）：一篇文章就是一筆 Documentation，預設分類號掛
// post（0030），而不是現有那 5 筆的 sourcesite（0010，外部官方文件）——但
// 這頁的分類號選單本來就開放選任何 0000 底下的子分類，不是寫死成 post。
// 所有圖譜連結都必須帶述詞，因為三張 pivot 表與 entity_relations 都有
// relation_id——只存對象不存述詞，這個圖譜就退化成一般的標籤系統了。
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BaseEyebrow from '@/components/BaseEyebrow.vue'
import BaseField from '@/components/BaseField.vue'
import BaseHint from '@/components/BaseHint.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import BaseTextarea from '@/components/BaseTextarea.vue'
import GraphLinkPicker from '@/components/article-editor/GraphLinkPicker.vue'
import MarkdownBody from '@/components/markdown/MarkdownBody.vue'
import { ApiValidationError } from '@/api/client'
import { type ArticleMarginNote } from '@/data/articles'
import { createArticle, fetchArticle, updateArticle, type ArticleRelationDto } from '@/api/articles'
import {
  FAMILY_COLOR,
  fetchRelations,
  fetchScopes,
  fetchTechniqueOptions,
  storageTargetOf,
  type EntityFamily,
  type EntityOption,
  type RelationDto,
  type ScopeDto,
} from '@/api/ontology'

const route = useRoute()
const router = useRouter()

/** 編輯中的一條圖譜關聯。族 + 實體 + 述詞 + 反向述詞,四個都齊了才是一條合法的邊。 */
interface DraftLink {
  family: EntityFamily
  entity: EntityOption
  predicate: string
  reverse: string
}

const FAMILY_HEADING: Record<EntityFamily, string> = {
  technique: '→ TECHNIQUE',
  implementation: '→ IMPLEMENTATION',
  documentation: '→ 其他文章（同型別）',
}

const editingId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? Number(id) : null
})
const isEditing = computed(() => editingId.value !== null)

// --- 可編輯的本地狀態 -------------------------------------------------------
const title = ref('')
const body = ref('')
const bodyMode = ref<'edit' | 'preview'>('edit')
const margins = ref<ArticleMarginNote[]>([])
const tags = ref<string[]>([])
const links = ref<DraftLink[]>([])
const scopeCall = ref('0030')
const published = ref(false)
const dirty = ref(false)
const createdAt = ref<string | null>(null)

const ready = ref(false)
const loadError = ref(false)
const saving = ref(false)
const saveError = ref('')
const fieldErrors = ref<Record<string, string>>({})

let allRelations: RelationDto[] = []

function toDraftLink(
  family: 'technique' | 'implementation',
  item: ArticleRelationDto,
): DraftLink {
  const rel = allRelations.find((r) => r.id === item.relation_id)
  const reverseRel = rel?.reverse_id ? allRelations.find((r) => r.id === rel.reverse_id) : null
  return {
    family,
    entity: { id: item.id, title: item.title, scope: null },
    predicate: rel?.name ?? '（找不到述詞）',
    reverse: reverseRel?.name ?? '（找不到反向述詞）',
  }
}

async function load() {
  loadError.value = false
  ready.value = false
  try {
    allRelations = await fetchRelations()

    if (isEditing.value) {
      const a = await fetchArticle(editingId.value!)
      title.value = a.title
      body.value = a.body ?? ''
      published.value = a.status === 1
      createdAt.value = a.creation_date ?? a.created_at
      scopeCall.value = a.scope?.full_call_number ?? '0030'
      links.value = [
        ...a.techniques.map((t) => toDraftLink('technique', t)),
        ...a.implementations.map((t) => toDraftLink('implementation', t)),
      ]
    } else {
      title.value = ''
      body.value = ''
      published.value = false
      createdAt.value = null
      scopeCall.value = '0030'
      links.value = []
    }
    // margins/純標籤：後端沒有對應欄位可讀，編輯既有文章時這幾項永遠是空的
    // ——不是漏讀，是真的沒有東西可以讀回來。
    margins.value = []
    tags.value = []
    dirty.value = false
    ready.value = true
  } catch {
    loadError.value = true
  }
}

watch(() => route.fullPath, load, { immediate: true })

function touch() {
  dirty.value = true
}

// --- 分類號 ----------------------------------------------------------------
// 0000 族的子分類從後端撈,不在前端寫死:後端之後多一個子分類,這裡要跟著出現。
const docScopes = ref<ScopeDto[]>([])
const scopeError = ref(false)
fetchScopes()
  .then((all) => {
    docScopes.value = all.filter(
      (s) => s.full_call_number.startsWith('00') && s.full_call_number !== '0000',
    )
  })
  .catch(() => (scopeError.value = true))

// --- 標籤 ------------------------------------------------------------------
// 「tags 的兩種命運」：輸入的標籤先比對既有 Technique,對得上的就該升級成帶述詞的
// 圖譜關聯（例如 Vue3 → 1040 framework）,對不上的（例如 Arch,圖譜裡沒有這個實體）
// 才留成純標籤。這裡不強制攔下來,只把對得上的那些標出來並給一鍵升級。
const techniqueTitles = ref<EntityOption[]>([])
fetchTechniqueOptions()
  .then((r) => (techniqueTitles.value = r))
  .catch(() => {
    /* 後端沒起來就不做升級提示,不用寫死的清單假裝比對過 */
  })

const tagInput = ref('')

function matchedTechnique(tag: string): EntityOption | undefined {
  return techniqueTitles.value.find((t) => t.title.toLowerCase() === tag.toLowerCase())
}

function addTag() {
  const v = tagInput.value.trim()
  if (!v || tags.value.includes(v)) return
  tags.value.push(v)
  tagInput.value = ''
  touch()
}

function removeTag(i: number) {
  tags.value.splice(i, 1)
  touch()
}

// --- 段落與邊註 ------------------------------------------------------------
function addMargin() {
  margins.value.push({ kind: '延伸想法', text: '', color: 'accent' })
  touch()
}

function removeMargin(i: number) {
  margins.value.splice(i, 1)
  touch()
}

// --- 圖譜關聯 --------------------------------------------------------------
const pickerOpen = ref(false)
const presetFamily = ref<EntityFamily | undefined>()
const presetTitle = ref<string | undefined>()

const existingKeys = computed(() => links.value.map((l) => `${l.family}:${l.entity.id}`))

const groupedLinks = computed(() => {
  const groups: { family: EntityFamily; items: DraftLink[] }[] = []
  for (const f of ['technique', 'implementation', 'documentation'] as EntityFamily[]) {
    const items = links.value.filter((l) => l.family === f)
    if (items.length) groups.push({ family: f, items })
  }
  return groups
})

function openPicker(family?: EntityFamily, entityTitle?: string) {
  presetFamily.value = family
  presetTitle.value = entityTitle
  pickerOpen.value = true
}

function onCreateLink(payload: DraftLink) {
  links.value.push(payload)
  // 升級成關聯之後,同名的純標籤就該消失,不然同一件事會在畫面上出現兩次、
  // 而且其中一次是沒有述詞的那種
  const i = tags.value.findIndex((t) => t.toLowerCase() === payload.entity.title.toLowerCase())
  if (i !== -1) tags.value.splice(i, 1)
  pickerOpen.value = false
  presetFamily.value = undefined
  presetTitle.value = undefined
  touch()
}

function removeLink(link: DraftLink) {
  links.value = links.value.filter((l) => l !== link)
  touch()
}

// --- 存檔 ------------------------------------------------------------------
// 只有 title/body/分類號/technique·implementation 關聯/發布狀態送進 payload——
// margins/純標籤/文章對文章關聯後端沒有對應欄位或還沒接線（entity_relations
// 表存在，但 controller 沒有 sync 邏輯），不假裝存得住；summary/intro 不算在
// 這裡面，因為 D-57 之後它們本來就不是獨立欄位，內容已經在 body 裡了。
const canSave = computed(
  () => !saving.value && title.value.trim() !== '' && body.value.trim() !== '',
)

async function saveWithStatus(statusPublished: boolean) {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  fieldErrors.value = {}

  const type = docScopes.value.find((s) => s.full_call_number === scopeCall.value)?.id
  if (!type) {
    saveError.value = '分類號清單還沒載入完成，稍等一下再試'
    saving.value = false
    return
  }

  const byName = new Map(allRelations.map((r) => [r.name, r.id]))
  const graphLinks = links.value.filter((l) => l.family !== 'documentation')
  const techniques = graphLinks
    .filter((l) => l.family === 'technique')
    .map((l) => ({ id: l.entity.id, relation_id: byName.get(l.predicate)! }))
  const implementations = graphLinks
    .filter((l) => l.family === 'implementation')
    .map((l) => ({ id: l.entity.id, relation_id: byName.get(l.predicate)! }))

  try {
    const res = isEditing.value
      ? await updateArticle(editingId.value!, {
          type,
          title: title.value.trim(),
          body: body.value,
          status: statusPublished ? 1 : 0,
          techniques,
          implementations,
        })
      : await createArticle({
          type,
          title: title.value.trim(),
          body: body.value,
          status: statusPublished ? 1 : 0,
          techniques,
          implementations,
        })
    published.value = statusPublished
    dirty.value = false
    if (!isEditing.value) {
      router.push({ name: 'article-editor', params: { id: res.data.id } })
    }
  } catch (error) {
    if (error instanceof ApiValidationError) {
      fieldErrors.value = error.fieldErrors
    } else {
      saveError.value = error instanceof Error ? error.message : '儲存失敗'
    }
  } finally {
    saving.value = false
  }
}

const saveDraft = () => saveWithStatus(false)
const publish = () => saveWithStatus(true)
</script>

<template>
  <BaseLoadingBlock v-if="loadError" height="220px" tone="error">讀不到這篇文章</BaseLoadingBlock>
  <BaseLoadingBlock v-else-if="!ready" height="220px">LOADING</BaseLoadingBlock>

  <div v-else class="w-full">
    <!-- 表頭 -->
    <div class="flex flex-col gap-2 pb-3.5">
      <!-- 設計稿裡這一行是 .lbl 唯一一處 letter-spacing:0.2em 的行內覆寫（頁首比欄位標題鬆一點），
           用 ! 是因為字距跟元件的預設是同一個 property，不加的話誰贏取決於 Tailwind 產生 CSS 的順序 -->
      <BaseEyebrow class="!tracking-[0.2em]">Article Editor</BaseEyebrow>
      <h1 class="font-serif text-[26px] sm:text-[34px] font-extrabold tracking-tight text-(--text-ink-main)">
        {{ isEditing ? '編輯文章' : '新增文章' }}
      </h1>
      <p class="text-[13.5px] sm:text-sm text-(--text-ink-muted)">內文用 Markdown，邊註可以增減</p>
    </div>

    <!-- 動作列 -->
    <div
      class="border-y border-(--border-shelf) bg-(--bg-folder) -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 min-w-0">
        <BaseHint>/articles/</BaseHint>
        <span
          class="font-mono text-xs text-(--text-ink-main) border-b border-dashed border-(--border-shelf) pb-0.5 truncate"
        >
          {{ isEditing ? editingId : '新文章' }}
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="dirty ? 'bg-(--text-accent)' : 'bg-(--text-ink-muted) opacity-40'"
          ></span>
          <BaseHint>
            {{ dirty ? '尚未儲存' : '未變更' }}
          </BaseHint>
        </span>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          v-if="isEditing"
          :to="{ name: 'article-detail', params: { id: editingId! } }"
          class="font-mono text-[10px] tracking-[0.3em] uppercase rounded-full border border-(--border-shelf) px-4 py-2 text-(--text-ink-body) hover:text-(--text-ink-main) transition-colors duration-100 ease-out"
        >
          預覽
        </router-link>
        <button
          type="button"
          :disabled="!canSave"
          class="font-mono text-[10px] tracking-[0.3em] uppercase rounded-full border border-(--border-shelf) px-4 py-2 text-(--text-ink-body) disabled:opacity-35 disabled:cursor-not-allowed"
          @click="saveDraft"
        >
          {{ saving ? '儲存中…' : '存草稿' }}
        </button>
        <button
          type="button"
          :disabled="!canSave"
          class="font-mono text-[10px] tracking-[0.3em] uppercase rounded-full border border-(--text-ink-main) bg-(--text-ink-main) px-4 py-2 font-bold text-(--bg-paper-light) disabled:opacity-35 disabled:cursor-not-allowed"
          @click="publish"
        >
          {{ saving ? '儲存中…' : '發布' }}
        </button>
      </div>
    </div>

    <p
      v-if="saveError"
      class="border border-(--text-accent) bg-(--bg-folder) px-4 py-3 mt-5 text-[12.5px] leading-6 text-(--text-accent)"
      role="alert"
    >
      {{ saveError }}
    </p>

    <!-- 誠實揭露哪些欄位真的會存、哪些還不會，不是免責聲明 -->
    <p
      class="border border-dashed border-(--border-shelf) rounded-[6px] bg-(--bg-folder) px-4 py-3 mt-5 text-[12.5px] leading-6 text-(--text-ink-body)"
    >
      <span class="font-mono text-[10px] tracking-[0.16em] uppercase text-(--text-accent) font-bold">
        部分欄位還沒接後端
      </span>
      ——Title／內文／分類號／Technique・Implementation 圖譜關聯／發布狀態已經真的會存進資料庫；
      邊註／純標籤／跟其他文章的關聯（entity_relations 表存在，但寫入邏輯還沒接）
      這三項後端目前沒有對應欄位，先留在這頁本地讓你打字用，重新整理或離開這頁就會消失。
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-7 lg:gap-9 items-start mt-7">
      <!-- 主欄 -->
      <div class="flex flex-col gap-6 min-w-0">
        <BaseField label="Title 標題">
          <BaseInput v-model="title" class="font-serif px-3.5 py-3 text-xl font-bold" @input="touch" />
          <BaseHint v-if="fieldErrors.title" class="block text-(--text-accent)">{{ fieldErrors.title }}</BaseHint>
        </BaseField>

        <!-- 內文。從「一堆段落」換成一個 Markdown 欄位（D-46）。
             原本這裡是段落卡片清單，每張有標題、內文、上下移動、刪除——那個模型
             讓內文只能是純文字（渲染端是 {{ }} 插值），粗體、程式碼、清單、連結
             一個都放不了。排序按鈕也一併拿掉:Markdown 裡搬動段落就是搬動文字，
             而且改成顯式錨點之後搬動不會像原本那樣默默改掉錨點的指向。 -->
        <div class="flex flex-col gap-3">
          <BaseField label="Body 內文" :hint="`Markdown · ${body.length} 字`">
            <div class="flex gap-1 self-start border border-(--border-shelf) rounded-full p-[3px]">
              <button
                v-for="m in (['edit', 'preview'] as const)"
                :key="m"
                type="button"
                class="rounded-full px-4 py-1.5 font-mono text-[10px] tracking-[0.14em] transition-colors duration-100 ease-out"
                :class="
                  bodyMode === m
                    ? 'bg-(--bg-folder) text-(--text-accent) font-bold'
                    : 'text-(--text-ink-muted) hover:text-(--text-ink-main)'
                "
                @click="bodyMode = m"
              >
                {{ m === 'edit' ? '編輯' : '預覽' }}
              </button>
            </div>
          </BaseField>

          <!-- 預覽用切換而不是並排即時預覽:並排的話每按一個鍵都要重新 parse 整篇，
               那是所有 Markdown 編輯器都要 debounce 的原因。切換模式時才 parse，
               問題根本不會發生，而且手機也放得下 -->
          <BaseTextarea
            v-if="bodyMode === 'edit'"
            v-model="body"
            :rows="20"
            placeholder="用 Markdown 寫。## 標題、**粗體**、`code`、- 清單、| 表格 |、[連結](/graph)"
            class="font-mono !text-[13px] !leading-7"
            @input="touch"
          />
          <div
            v-else
            class="border border-(--border-shelf) rounded-[5px] bg-(--bg-paper-light) px-4 py-3 min-h-[200px]"
          >
            <MarkdownBody v-if="body.trim()" :source="body" />
            <BaseHint v-else class="block">還沒有內容</BaseHint>
          </div>

          <BaseHint v-if="fieldErrors.body" class="block text-(--text-accent)">{{ fieldErrors.body }}</BaseHint>
          <BaseHint class="block leading-5">
            不另外開 Summary／Intro 欄位（D-57）：第一段就是清單頁摘要跟文章頁開場，
            直接寫在這裡。
          </BaseHint>
          <BaseHint class="block leading-5">
            站內連結用相對路徑（例如 <code class="font-mono">[圖譜](/graph)</code>）會渲染成
            RouterLink，點下去不會整頁重載；站外連結自動開新分頁。
          </BaseHint>
        </div>

        <!-- 邊註 -->
        <div class="flex flex-col gap-3">
          <BaseField label="Margins 邊註（本地暫存）" hint="顯示在文章右側欄，可留空" />

          <div
            v-for="(note, i) in margins"
            :key="i"
            class="group border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) p-3.5 flex flex-col gap-2.5"
          >
            <div class="flex items-center gap-2.5">
              <div
                class="w-[3px] self-stretch rounded-sm"
                :style="{ backgroundColor: note.color === 'accent' ? 'var(--text-accent)' : 'var(--text-ink-muted)' }"
              ></div>
              <BaseInput
                v-model="note.kind"
                placeholder="標記"
                class="font-mono text-[10px] tracking-[0.18em] uppercase !text-(--text-accent) !rounded-full !bg-transparent w-[120px] !px-3 !py-1.5"
                @input="touch"
              />
              <div class="ml-auto flex items-center gap-1.5">
                <button
                  v-for="c in (['accent', 'muted'] as const)"
                  :key="c"
                  type="button"
                  :aria-label="c === 'accent' ? '用強調色' : '用次要色'"
                  class="w-[18px] h-[18px] rounded-full transition-shadow duration-100 ease-out"
                  :style="{
                    backgroundColor: c === 'accent' ? 'var(--text-accent)' : 'var(--text-ink-muted)',
                    opacity: note.color === c ? 1 : 0.35,
                    boxShadow:
                      note.color === c
                        ? '0 0 0 2px var(--bg-paper-light), 0 0 0 3.5px var(--text-accent)'
                        : 'none',
                  }"
                  @click="((note.color = c), touch())"
                ></button>
              </div>
              <button
                type="button"
                aria-label="刪除這則邊註"
                class="w-11 h-11 sm:w-6 sm:h-6 flex items-center justify-center text-(--text-accent) transition-opacity duration-100 ease-out opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-60 sm:group-focus-within:opacity-60"
                @click="removeMargin(i)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
            <BaseTextarea
              v-model="note.text"
              :rows="2"
              placeholder="邊註內容"
              class="text-[13px] leading-7"
              @input="touch"
            />
          </div>

          <BaseButton variant="add" type="button" @click="addMargin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新增邊註
          </BaseButton>
        </div>
      </div>

      <!-- 側欄 -->
      <div class="flex flex-col gap-5 min-w-0">
        <!-- 分類號 -->
        <BaseCard variant="panel" class="gap-3">
          <div class="flex items-baseline justify-between gap-2">
            <BaseEyebrow size="field">Scope 分類號</BaseEyebrow>
            <BaseHint>Documentation 0000</BaseHint>
          </div>

          <p v-if="scopeError" class="font-mono text-[10px] leading-5 text-(--text-accent)">
            讀不到分類號清單——後端沒起來時這裡不會改用寫死的四個選項。
          </p>

          <div class="flex flex-col gap-1">
            <button
              v-for="s in docScopes"
              :key="s.id"
              type="button"
              class="flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors duration-100 ease-out"
              :class="
                scopeCall === s.full_call_number
                  ? 'bg-(--bg-folder) border border-(--text-accent)'
                  : 'border border-transparent text-(--text-ink-muted) hover:text-(--text-ink-main)'
              "
              @click="((scopeCall = s.full_call_number), touch())"
            >
              <span
                class="font-mono text-[11px]"
                :class="scopeCall === s.full_call_number ? 'text-(--text-accent) font-bold' : 'opacity-55'"
              >
                {{ s.full_call_number }}
              </span>
              <span
                class="text-[13px]"
                :class="scopeCall === s.full_call_number ? 'font-bold text-(--text-ink-main)' : ''"
              >
                {{ s.name }}
              </span>
              <svg
                v-if="scopeCall === s.full_call_number"
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                class="ml-auto text-(--text-accent)"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>

          <BaseHint class="block leading-5 border-t border-(--border-shelf) pt-2.5">
            自己寫的文章是 post；sourcesite 留給外部官方文件
          </BaseHint>
        </BaseCard>

        <!-- 圖譜關聯 -->
        <BaseCard variant="panel" class="gap-3.5">
          <div class="flex items-baseline justify-between gap-2">
            <BaseEyebrow size="field">圖譜關聯</BaseEyebrow>
            <BaseHint>{{ links.length }} 條邊</BaseHint>
          </div>

          <div v-for="group in groupedLinks" :key="group.family" class="flex flex-col gap-2">
            <BaseHint>
              {{ FAMILY_HEADING[group.family] }}
              <span v-if="group.family === 'documentation'">（本地暫存，還存不進去）</span>
            </BaseHint>
            <div
              v-for="link in group.items"
              :key="`${link.family}:${link.entity.id}`"
              class="border border-(--border-shelf) rounded-[5px] bg-(--bg-folder) px-2.5 py-2.5 flex flex-col gap-1.5"
            >
              <div class="flex items-center gap-2">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :style="{ backgroundColor: FAMILY_COLOR[link.family] }"
                ></span>
                <span class="text-[13px] font-bold text-(--text-ink-main) truncate">
                  {{ link.entity.title }}
                </span>
                <BaseHint v-if="link.entity.scope" dim class="shrink-0">
                  {{ link.entity.scope }}
                </BaseHint>
                <button
                  type="button"
                  :aria-label="`移除跟 ${link.entity.title} 的關聯`"
                  class="ml-auto shrink-0 text-(--text-accent) opacity-40 hover:opacity-100 transition-opacity duration-100 ease-out"
                  @click="removeLink(link)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div class="flex items-center gap-1.5">
                <BaseHint dim>述詞</BaseHint>
                <span
                  class="font-mono text-[10px] tracking-[0.08em] text-(--text-accent) border border-(--border-shelf) rounded-full px-2.5 py-0.5 bg-(--bg-paper-light)"
                >
                  {{ link.predicate }}
                </span>
              </div>
              <BaseHint dim class="block leading-5">
                反向：{{ link.entity.title }} {{ link.reverse }} 這篇文章 · {{ storageTargetOf(link.family) }}
              </BaseHint>
            </div>
          </div>

          <BaseHint v-if="!links.length" class="block leading-5">
            還沒有任何關聯。一條邊要有對象也要有述詞才算數。
          </BaseHint>

          <GraphLinkPicker
            v-if="pickerOpen"
            :existing-keys="existingKeys"
            :preset-family="presetFamily"
            :preset-entity-title="presetTitle"
            @cancel="pickerOpen = false"
            @create="onCreateLink"
          />
          <BaseButton v-else variant="add" type="button" class="!text-[10px] !py-2.5" @click="openPicker()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新增關聯
          </BaseButton>
        </BaseCard>

        <!-- 純標籤 -->
        <BaseCard variant="panel" class="gap-3">
          <BaseEyebrow size="field">純標籤（本地暫存）</BaseEyebrow>

          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="(tag, i) in tags"
              :key="tag"
              class="inline-flex items-center gap-1.5 border border-(--border-shelf) bg-(--bg-folder) rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-(--text-ink-body)"
            >
              {{ tag }}
              <button type="button" :aria-label="`移除標籤 ${tag}`" class="opacity-45 hover:opacity-100" @click="removeTag(i)">
                ×
              </button>
            </span>
          </div>

          <BaseInput
            v-model="tagInput"
            placeholder="輸入標籤後按 Enter"
            class="font-mono text-[11px]"
            @keydown.enter.prevent="addTag"
          />

          <!-- 對得上 Technique 的標籤:這種其實是圖譜實體,留在純標籤區等於自降一級 -->
          <template v-for="tag in tags" :key="`hint-${tag}`">
            <button
              v-if="matchedTechnique(tag)"
              type="button"
              class="text-left border border-(--text-accent)/35 rounded-[5px] bg-(--bg-folder) px-2.5 py-2 flex flex-col gap-1 hover:border-(--text-accent) transition-colors duration-100 ease-out"
              @click="openPicker('technique', tag)"
            >
              <span class="font-mono text-[10px] tracking-[0.1em] text-(--text-accent) font-bold">
                {{ tag }} 對得上 {{ matchedTechnique(tag)?.scope ?? 'Technique' }}
              </span>
              <BaseHint class="leading-5">
                點這裡升級成帶述詞的圖譜關聯
              </BaseHint>
            </button>
          </template>

          <BaseHint class="block leading-5 border-t border-(--border-shelf) pt-2.5">
            對不到圖譜實體的分類詞留在這裡。輸入時會比對既有 Technique：對得上就升級成上面的關聯，對不上才留成純標籤。
          </BaseHint>
        </BaseCard>

        <!-- 發布資訊 -->
        <BaseCard variant="panel" class="gap-3.5">
          <BaseEyebrow size="field">發布資訊</BaseEyebrow>
          <div class="flex flex-col gap-1.5">
            <BaseHint>建立日期</BaseHint>
            <div class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-2.5 py-2 font-mono text-[13px] text-(--text-ink-main)">
              {{ createdAt ?? '尚未儲存' }}
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <BaseHint>狀態</BaseHint>
            <div class="flex gap-1 border border-(--border-shelf) rounded-full p-1">
              <button
                v-for="opt in [{ v: false, label: '草稿' }, { v: true, label: '已發布' }]"
                :key="opt.label"
                type="button"
                class="flex-1 text-center font-mono text-[10px] tracking-[0.1em] py-1.5 rounded-full transition-colors duration-100 ease-out"
                :class="
                  published === opt.v
                    ? 'bg-(--bg-folder) text-(--text-accent) font-bold'
                    : 'text-(--text-ink-muted) hover:text-(--text-ink-main)'
                "
                @click="((published = opt.v), touch())"
              >
                {{ opt.label }}
              </button>
            </div>
            <BaseHint class="block leading-5">
              這個切換只影響下一次按「存草稿」／「發布」時要送哪個狀態，本身不會單獨觸發存檔。
            </BaseHint>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
