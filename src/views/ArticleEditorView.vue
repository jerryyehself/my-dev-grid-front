<script setup lang="ts">
// 文章編輯頁。目前是「只有視覺、沒有持久化」的狀態,理由寫在下面的 canSave 附近。
//
// 本體論上的定位（D-40）：一篇文章就是一筆 Documentation,scope 掛 post（0030）,
// 而不是現有那 5 筆的 sourcesite（0010,外部官方文件）。所有圖譜連結都必須帶述詞,
// 因為三張 pivot 表與 entity_relations 都有 relation_id——只存對象不存述詞,
// 這個圖譜就退化成一般的標籤系統了。
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { articles, type Article, type ArticleMarginNote, type ArticleSection } from '@/data/articles'
import {
  FAMILY_COLOR,
  fetchScopes,
  fetchTechniqueOptions,
  storageTargetOf,
  type EntityFamily,
  type EntityOption,
  type ScopeDto,
} from '@/api/ontology'
import GraphLinkPicker from '@/components/article-editor/GraphLinkPicker.vue'

const route = useRoute()

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

const source = computed<Article | undefined>(() =>
  articles.find((a) => a.id === String(route.params.id)),
)

// --- 可編輯的本地狀態 -------------------------------------------------------
// 直接改 articles 陣列裡的物件會污染這份共用假資料（同一個 module instance 會被
// 清單頁與詳細頁讀到）,所以進來就先複製一份,離開頁面就丟掉。
const title = ref('')
const summary = ref('')
const intro = ref('')
const sections = ref<ArticleSection[]>([])
const margins = ref<ArticleMarginNote[]>([])
const tags = ref<string[]>([])
const links = ref<DraftLink[]>([])
const scopeCall = ref('0030')
const published = ref(false)
const dirty = ref(false)

watch(
  source,
  (a) => {
    if (!a) return
    title.value = a.title
    summary.value = a.summary
    intro.value = a.intro
    sections.value = a.sections.map((s) => ({ ...s }))
    margins.value = (a.margins ?? []).map((m) => ({ ...m }))
    tags.value = [...a.tags]
    links.value = []
    dirty.value = false
  },
  { immediate: true },
)

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
function addSection() {
  sections.value.push({ heading: '', body: '' })
  touch()
}

function removeSection(i: number) {
  sections.value.splice(i, 1)
  touch()
}

/** 上下移動一格。到頭或到尾就不動,按鈕本身也會停用,不用靠這裡擋。 */
function moveSection(i: number, delta: number) {
  const j = i + delta
  const a = sections.value[i]
  const b = sections.value[j]
  if (!a || !b) return
  sections.value[i] = b
  sections.value[j] = a
  touch()
}

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
// 存不了,而且短期內也存不了,所以按鈕做成停用而不是做成可按但沒反應。
// 兩個各自獨立的原因:
// 1. 後端的 Documentation 只有 title / url / uri / note / status,沒有放內文的欄位,
//    段落與邊註目前在資料庫裡沒有地方可以去（design-artifacts.md 裡列為「尚未決定」）。
// 2. 寫入端點全部在 auth:sanctum 後面,而登入雖然排進 v1（D-34）但還沒做。
// 畫成可按的樣子會是這個專案自己禁止的假訊號——跟當初拿掉導覽列那顆會呼吸的
// 圓點是同一類問題:看起來代表某個狀態,實際上背後什麼都沒有。
const canSave = false
</script>

<template>
  <div v-if="source" class="w-full">
    <!-- 表頭 -->
    <div class="flex flex-col gap-2 pb-3.5">
      <div class="font-mono text-[11px] tracking-[0.2em] uppercase text-(--text-accent) font-bold">
        // Article Editor
      </div>
      <h1 class="text-[26px] sm:text-[34px] font-extrabold tracking-tight text-(--text-ink-main)">
        編輯文章
      </h1>
      <p class="text-[13.5px] sm:text-sm text-(--text-ink-muted)">段落與邊註都可以增減、調換順序</p>
    </div>

    <!-- 動作列 -->
    <div
      class="border-y border-(--border-shelf) bg-(--bg-folder) -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 min-w-0">
        <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted)">/articles/</span>
        <span
          class="font-mono text-xs text-(--text-ink-main) border-b border-dashed border-(--border-shelf) pb-0.5 truncate"
        >
          {{ source.id }}
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="dirty ? 'bg-(--text-accent)' : 'bg-(--text-ink-muted) opacity-40'"
          ></span>
          <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted)">
            {{ dirty ? '尚未儲存' : '未變更' }}
          </span>
        </span>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          :to="{ name: 'article-detail', params: { id: source.id } }"
          class="font-mono text-[10px] tracking-[0.3em] uppercase rounded-full border border-(--border-shelf) px-4 py-2 text-(--text-ink-body) hover:text-(--text-ink-main) transition-colors duration-100 ease-out"
        >
          預覽
        </router-link>
        <button
          type="button"
          :disabled="!canSave"
          class="font-mono text-[10px] tracking-[0.3em] uppercase rounded-full border border-(--border-shelf) px-4 py-2 text-(--text-ink-body) disabled:opacity-35 disabled:cursor-not-allowed"
        >
          存草稿
        </button>
        <button
          type="button"
          :disabled="!canSave"
          class="font-mono text-[10px] tracking-[0.3em] uppercase rounded-full border border-(--text-ink-main) bg-(--text-ink-main) px-4 py-2 font-bold text-(--bg-paper-light) disabled:opacity-35 disabled:cursor-not-allowed"
        >
          發布
        </button>
      </div>
    </div>

    <!-- 為什麼兩顆按鈕是停用的。不寫出來的話,停用就只是個沒有解釋的死路 -->
    <p
      class="border border-dashed border-(--border-shelf) rounded-[6px] bg-(--bg-folder) px-4 py-3 mt-5 text-[12.5px] leading-6 text-(--text-ink-body)"
    >
      <span class="font-mono text-[10px] tracking-[0.16em] uppercase text-(--text-accent) font-bold">
        尚不能儲存
      </span>
      ——後端的
      <code class="font-mono text-[11.5px]">Documentation</code>
      只有 title / url / uri / note / status，沒有放內文的欄位，段落與邊註在資料庫裡還沒有地方可以去；寫入端點也都在
      <code class="font-mono text-[11.5px]">auth:sanctum</code>
      後面而登入尚未實作。這頁目前只做視覺與互動，改動不會被保存。
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-7 lg:gap-9 items-start mt-7">
      <!-- 主欄 -->
      <div class="flex flex-col gap-6 min-w-0">
        <div class="flex flex-col gap-2">
          <label class="font-mono text-[11px] tracking-[0.24em] uppercase text-(--text-accent) font-bold">
            // Title 標題
          </label>
          <input
            v-model="title"
            type="text"
            class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-3.5 py-3 text-lg font-bold text-(--text-ink-main) focus:outline-none focus:border-(--text-accent)"
            @input="touch"
          />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-baseline justify-between gap-3">
            <label class="font-mono text-[11px] tracking-[0.24em] uppercase text-(--text-accent) font-bold">
              // Summary 摘要
            </label>
            <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted) opacity-75">
              清單頁顯示這一段 · {{ summary.length }} 字
            </span>
          </div>
          <textarea
            v-model="summary"
            rows="3"
            class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-3 py-2.5 text-sm leading-7 text-(--text-ink-body) focus:outline-none focus:border-(--text-accent) resize-y"
            @input="touch"
          ></textarea>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-baseline justify-between gap-3">
            <label class="font-mono text-[11px] tracking-[0.24em] uppercase text-(--text-accent) font-bold">
              // Intro 引言
            </label>
            <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted) opacity-75">
              文章頁標題下方的開場
            </span>
          </div>
          <textarea
            v-model="intro"
            rows="3"
            class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-3 py-2.5 text-[15px] leading-7 text-(--text-ink-body) focus:outline-none focus:border-(--text-accent) resize-y"
            @input="touch"
          ></textarea>
        </div>

        <!-- 段落 -->
        <div class="flex flex-col gap-3">
          <div class="flex items-baseline justify-between gap-3">
            <div class="font-mono text-[11px] tracking-[0.24em] uppercase text-(--text-accent) font-bold">
              // Sections 段落
            </div>
            <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted) opacity-75">
              {{ sections.length }} 個段落
            </span>
          </div>

          <div
            v-if="sections.length"
            class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) overflow-hidden"
          >
            <div
              v-for="(section, i) in sections"
              :key="i"
              class="group grid grid-cols-[44px_minmax(0,1fr)_44px] sm:grid-cols-[38px_minmax(0,1fr)_38px] items-start border-b border-(--border-shelf) last:border-b-0"
            >
              <!-- 左側:序號與上下移動。桌機滑過才出現,手機一律常駐 44px 觸控目標 -->
              <div class="flex flex-col items-center gap-1 py-3 bg-(--bg-folder) self-stretch">
                <span class="font-mono text-[10px] text-(--text-ink-muted) opacity-70">
                  {{ String(i + 1).padStart(2, '0') }}
                </span>
                <div
                  class="flex flex-col items-center transition-opacity duration-100 ease-out sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                >
                  <button
                    type="button"
                    :disabled="i === 0"
                    aria-label="上移這個段落"
                    class="w-11 h-11 sm:w-6 sm:h-6 flex items-center justify-center text-(--text-accent) disabled:opacity-25 disabled:cursor-not-allowed"
                    @click="moveSection(i, -1)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :disabled="i === sections.length - 1"
                    aria-label="下移這個段落"
                    class="w-11 h-11 sm:w-6 sm:h-6 flex items-center justify-center text-(--text-accent) disabled:opacity-25 disabled:cursor-not-allowed"
                    @click="moveSection(i, 1)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="px-3.5 py-3.5 flex flex-col gap-2.5 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-(--text-accent) font-bold">//</span>
                  <input
                    v-model="section.heading"
                    type="text"
                    placeholder="段落標題"
                    class="flex-1 min-w-0 text-[15px] font-bold text-(--text-ink-main) bg-transparent border-b border-(--border-shelf) pb-1.5 focus:outline-none focus:border-(--text-accent) placeholder:text-(--text-ink-muted) placeholder:opacity-50"
                    @input="touch"
                  />
                </div>
                <textarea
                  v-model="section.body"
                  rows="3"
                  placeholder="段落內容"
                  class="text-sm leading-7 text-(--text-ink-body) bg-(--bg-folder) border border-(--border-shelf) rounded-[5px] px-3 py-2.5 focus:outline-none focus:border-(--text-accent) placeholder:text-(--text-ink-muted) placeholder:opacity-50 resize-y"
                  @input="touch"
                ></textarea>
              </div>

              <div
                class="flex justify-center pt-3 transition-opacity duration-100 ease-out sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                <button
                  type="button"
                  aria-label="刪除這個段落"
                  class="w-11 h-11 sm:w-6 sm:h-6 flex items-center justify-center text-(--text-accent) opacity-60 hover:opacity-100"
                  @click="removeSection(i)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="flex items-center gap-2.5 border border-dashed border-(--border-shelf) rounded-[6px] px-3.5 py-3 text-(--text-ink-muted) hover:text-(--text-ink-main) hover:border-(--text-accent)/40 transition-colors duration-100 ease-out"
            @click="addSection"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span class="font-mono text-[11px] tracking-[0.18em] uppercase">新增段落</span>
          </button>
        </div>

        <!-- 邊註 -->
        <div class="flex flex-col gap-3">
          <div class="flex items-baseline justify-between gap-3">
            <div class="font-mono text-[11px] tracking-[0.24em] uppercase text-(--text-accent) font-bold">
              // Margins 邊註
            </div>
            <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted) opacity-75">
              顯示在文章右側欄，可留空
            </span>
          </div>

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
              <input
                v-model="note.kind"
                type="text"
                placeholder="標記"
                class="font-mono text-[10px] tracking-[0.18em] uppercase text-(--text-accent) border border-(--border-shelf) rounded-full px-3 py-1.5 bg-transparent w-[120px] focus:outline-none focus:border-(--text-accent)"
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
            <textarea
              v-model="note.text"
              rows="2"
              placeholder="邊註內容"
              class="text-[13px] leading-7 text-(--text-ink-body) bg-(--bg-folder) border border-(--border-shelf) rounded-[5px] px-3 py-2.5 focus:outline-none focus:border-(--text-accent) placeholder:text-(--text-ink-muted) placeholder:opacity-50 resize-y"
              @input="touch"
            ></textarea>
          </div>

          <button
            type="button"
            class="flex items-center gap-2.5 border border-dashed border-(--border-shelf) rounded-[6px] px-3.5 py-3 text-(--text-ink-muted) hover:text-(--text-ink-main) hover:border-(--text-accent)/40 transition-colors duration-100 ease-out"
            @click="addMargin"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span class="font-mono text-[11px] tracking-[0.18em] uppercase">新增邊註</span>
          </button>
        </div>
      </div>

      <!-- 側欄 -->
      <div class="flex flex-col gap-5 min-w-0">
        <!-- 分類號 -->
        <div class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) p-4 flex flex-col gap-3">
          <div class="flex items-baseline justify-between gap-2">
            <div class="font-mono text-[10px] tracking-[0.24em] uppercase text-(--text-accent) font-bold">
              // Scope 分類號
            </div>
            <span class="font-mono text-[10px] text-(--text-ink-muted) opacity-75">Documentation 0000</span>
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

          <p class="font-mono text-[10px] leading-5 text-(--text-ink-muted) opacity-75 border-t border-(--border-shelf) pt-2.5">
            自己寫的文章是 post；sourcesite 留給外部官方文件
          </p>
        </div>

        <!-- 圖譜關聯 -->
        <div class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) p-4 flex flex-col gap-3.5">
          <div class="flex items-baseline justify-between gap-2">
            <div class="font-mono text-[10px] tracking-[0.24em] uppercase text-(--text-accent) font-bold">
              // 圖譜關聯
            </div>
            <span class="font-mono text-[10px] text-(--text-ink-muted) opacity-75">{{ links.length }} 條邊</span>
          </div>

          <div v-for="group in groupedLinks" :key="group.family" class="flex flex-col gap-2">
            <span class="font-mono text-[10px] tracking-[0.12em] text-(--text-ink-muted) opacity-75">
              {{ FAMILY_HEADING[group.family] }}
            </span>
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
                <span v-if="link.entity.scope" class="font-mono text-[10px] text-(--text-ink-muted) opacity-55 shrink-0">
                  {{ link.entity.scope }}
                </span>
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
                <span class="font-mono text-[10px] text-(--text-ink-muted) opacity-60">述詞</span>
                <span
                  class="font-mono text-[10px] tracking-[0.08em] text-(--text-accent) border border-(--border-shelf) rounded-full px-2.5 py-0.5 bg-(--bg-paper-light)"
                >
                  {{ link.predicate }}
                </span>
              </div>
              <p class="font-mono text-[10px] leading-5 text-(--text-ink-muted) opacity-60">
                反向：{{ link.entity.title }} {{ link.reverse }} 這篇文章 · {{ storageTargetOf(link.family) }}
              </p>
            </div>
          </div>

          <p v-if="!links.length" class="font-mono text-[10px] leading-5 text-(--text-ink-muted) opacity-70">
            還沒有任何關聯。一條邊要有對象也要有述詞才算數。
          </p>

          <GraphLinkPicker
            v-if="pickerOpen"
            :existing-keys="existingKeys"
            :preset-family="presetFamily"
            :preset-entity-title="presetTitle"
            @cancel="pickerOpen = false"
            @create="onCreateLink"
          />
          <button
            v-else
            type="button"
            class="flex items-center gap-2.5 border border-dashed border-(--border-shelf) rounded-[5px] px-3 py-2.5 text-(--text-ink-muted) hover:text-(--text-ink-main) hover:border-(--text-accent)/40 transition-colors duration-100 ease-out"
            @click="openPicker()"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span class="font-mono text-[10px] tracking-[0.16em] uppercase">新增關聯</span>
          </button>
        </div>

        <!-- 純標籤 -->
        <div class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) p-4 flex flex-col gap-3">
          <div class="font-mono text-[10px] tracking-[0.24em] uppercase text-(--text-accent) font-bold">
            // 純標籤
          </div>

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

          <input
            v-model="tagInput"
            type="text"
            placeholder="輸入標籤後按 Enter"
            class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-3 py-2 font-mono text-[11px] text-(--text-ink-main) placeholder:text-(--text-ink-muted) placeholder:opacity-60 focus:outline-none focus:border-(--text-accent)"
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
              <span class="font-mono text-[10px] leading-5 text-(--text-ink-muted)">
                點這裡升級成帶述詞的圖譜關聯
              </span>
            </button>
          </template>

          <p class="font-mono text-[10px] leading-5 text-(--text-ink-muted) opacity-75 border-t border-(--border-shelf) pt-2.5">
            對不到圖譜實體的分類詞留在這裡。輸入時會比對既有 Technique：對得上就升級成上面的關聯，對不上才留成純標籤。
          </p>
        </div>

        <!-- 發布資訊 -->
        <div class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) p-4 flex flex-col gap-3.5">
          <div class="font-mono text-[10px] tracking-[0.24em] uppercase text-(--text-accent) font-bold">
            // 發布資訊
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="font-mono text-[10px] text-(--text-ink-muted) opacity-75">日期</span>
            <div class="border border-(--border-shelf) rounded-[6px] bg-(--bg-paper-light) px-2.5 py-2 font-mono text-[13px] text-(--text-ink-main)">
              {{ source.date }}
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="font-mono text-[10px] text-(--text-ink-muted) opacity-75">狀態</span>
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
          </div>
        </div>
      </div>
    </div>
  </div>

  <p v-else class="font-mono text-[13px] text-(--text-ink-muted)">找不到這篇文章。</p>
</template>
