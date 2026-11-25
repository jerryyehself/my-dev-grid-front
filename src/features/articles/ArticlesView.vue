<script setup lang="ts">
// 文章清單。D-56 落地後第一次真的接上 /api/documentations——之前這裡讀的是
// src/data/articles.ts 的假資料，跟後台編輯器（已經真的能存）完全斷開：
// 編輯器新增的文章，訪客在這裡從來看不到。
//
// tags：後端沒有自由文字標籤欄位（D-40），這裡改用真的圖譜關聯
// （techniques／implementations 的 title）當篩選依據。
// summary：D-57，不是獨立欄位，取 body 第一段（見 excerptOf）。
// 只列 status===1（已發布）——草稿不該出現在訪客看得到的清單。
import { ref, computed, defineAsyncComponent, onBeforeUnmount, onWatcherCleanup, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { displayDate, fetchArticlesOrDemo, sortArticlesByDateDesc, type ArticleDto } from '@/api/articles'
import { excerptOf } from '@/components/markdown/excerpt'
import AuthOnly from '@/components/AuthOnly.vue'
import ArticleEditLink from '@/components/ArticleEditLink.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseSegmented from '@/components/BaseSegmented.vue'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import LoadFailedNotice from '@/components/LoadFailedNotice.vue'
import { ARTICLES_EMPTY_TEXT, ARTICLES_LOAD_FAILED_TEXT, LOADING_TEXT } from '@/copy/common'
import { hasArticleMindmap } from './mindmap/articleMindmapSource'
import { matchesFinePointer } from './mindmap/useFinePointer'

// 標題懸停心智圖（只有有心智圖的文章才有）。元件與資料都延遲載入：沒滑到這些標題就不下載
const ArticleMindmapHoverTip = defineAsyncComponent(
  () => import('./mindmap/ArticleMindmapHoverTip.vue'),
)

const ready = ref(false)
const loadError = ref(false)
const fallbackError = ref<string | null>(null)
const articles = ref<ArticleDto[]>([])

async function load() {
  ready.value = false
  loadError.value = false
  try {
    // fetchArticlesOrDemo()：正常打真的 API，載入失敗才退回填充內容，
    // 見 api/articles.ts 的說明——跟 Home 頁專案/知識網路小工具同一套 fallback 慣例。
    const { articles: all, loadError: error } = await fetchArticlesOrDemo()
    fallbackError.value = error
    // 後端 index() 依 title 排序（DocumentationController），不是日期——
    // 時間軸要照日期分組，這裡一定要自己重排，不能假設 API 順序就是時間序。
    articles.value = sortArticlesByDateDesc(all.filter((a) => a.status === 1))
    ready.value = true
  } catch {
    loadError.value = true
  }
}
load()

function tagsOf(a: ArticleDto): string[] {
  return [...a.techniques, ...a.implementations].map((t) => t.title)
}

function summaryOf(a: ArticleDto): string {
  return excerptOf(a.body ?? '')
}

// 每篇文章右上角的「編輯」。所在那一列是 mono 大寫小字，這顆是中文，照 D-68 的中文標籤下限用 13px、
// 不套大寫與寬字距
const EDIT_LINK_CLASS =
  'relative z-10 ml-auto font-sans normal-case text-(length:--type-label-size) tracking-[0.05em] text-(--text-ink-muted) hover:text-(--text-accent) transition-colors duration-hover-out hover:duration-hover-in'

// --- 標題懸停心智圖 ---
// 只在游標停在標題「文字」上，或鍵盤 Tab 到標題時出現。標題連結的 ::after 撐滿整列，
// 所以懸停掛在連結裡包著文字的 <span> 上：游標在整列其他地方（::after 的範圍）時，
// 事件的目標是 <a> 本身，不是這個 <span>，不會觸發。<span> 要 relative z-[1]：::after 是定位元素，
// 會疊在沒定位的文字上面，不墊高的話游標停在字上也只碰得到 ::after。<span> 仍在連結裡，點了一樣開文章。
// 滑鼠與焦點分開記：滑鼠移開時，焦點還在標題上就繼續顯示。Esc 收起，直到下一次移入或聚焦。
interface MindmapTipState {
  articleId: number
  anchor: HTMLElement
}
const hoverTip = ref<MindmapTipState | null>(null)
const focusTip = ref<MindmapTipState | null>(null)
const tipDismissed = ref(false)
// 滑鼠與鍵盤可以同時各停在不同篇；以最近一次動作為準，另一邊只在這邊沒有時才補上
const lastTipSource = ref<'hover' | 'focus'>('hover')
const activeTip = computed(() => {
  if (tipDismissed.value) return null
  return lastTipSource.value === 'focus'
    ? (focusTip.value ?? hoverTip.value)
    : (hoverTip.value ?? focusTip.value)
})

function mindmapTipId(articleId: number): string {
  return `article-mindmap-tip-${articleId}`
}

function titleAnchor(event: Event): HTMLElement | null {
  return (event.currentTarget as HTMLElement | null)?.closest('h3') ?? null
}

function onTitleTextEnter(articleId: number, event: MouseEvent) {
  if (!hasArticleMindmap(articleId)) return
  // 觸控裝置點一下也會送 mouseenter；不是能懸停、指標精準的裝置就不顯示（跟內頁分圖與大綱樹同一個條件）
  if (!matchesFinePointer()) return
  const anchor = titleAnchor(event)
  if (!anchor) return
  tipDismissed.value = false
  lastTipSource.value = 'hover'
  hoverTip.value = { articleId, anchor }
}

function onTitleTextLeave(articleId: number) {
  if (hoverTip.value?.articleId === articleId) hoverTip.value = null
}

/** 只有鍵盤聚焦（:focus-visible）才算；滑鼠點下去也會聚焦，但那時已經在開文章了 */
function isKeyboardFocus(el: HTMLElement): boolean {
  try {
    return el.matches(':focus-visible')
  } catch {
    // 不認得 :focus-visible 的瀏覽器：當作鍵盤聚焦，寧可多顯示也不要鍵盤使用者看不到
    return true
  }
}

function onTitleFocus(articleId: number, event: FocusEvent) {
  if (!hasArticleMindmap(articleId)) return
  const link = event.currentTarget as HTMLElement | null
  if (!link || !isKeyboardFocus(link)) return
  const anchor = titleAnchor(event)
  if (!anchor) return
  tipDismissed.value = false
  lastTipSource.value = 'focus'
  focusTip.value = { articleId, anchor }
}

function onTitleBlur(articleId: number) {
  if (focusTip.value?.articleId === articleId) focusTip.value = null
}

function onTipKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') tipDismissed.value = true
}

// 提示框開著時才聽 Esc（游標停在標題上時，焦點不一定在標題連結上）
watch(activeTip, (tip) => {
  if (!tip) return
  window.addEventListener('keydown', onTipKeydown)
  onWatcherCleanup(() => window.removeEventListener('keydown', onTipKeydown))
})
onBeforeUnmount(() => window.removeEventListener('keydown', onTipKeydown))

const viewMode = ref<'timeline' | 'folder'>('timeline')
const VIEW_MODES = [
  { value: 'timeline', label: '時間軸' },
  { value: 'folder', label: '分類夾' },
] as const
const currentTag = ref('')

const allTags = computed(() => {
  const tagsSet = new Set<string>()
  articles.value.forEach((article) => {
    tagsOf(article).forEach((t) => tagsSet.add(t))
  })
  return Array.from(tagsSet)
})

// 時間軸：依 displayDate（YYYY-MM-DD）換算月份分組
const monthLabel = (date: string) => {
  const [year, month] = date.split('-')
  return `${year}年${Number(month)}月`
}

const timelineGroups = computed(() => {
  const groups: { month: string; articles: ArticleDto[] }[] = []
  for (const article of articles.value) {
    const month = monthLabel(displayDate(article))
    const last = groups[groups.length - 1]
    if (last && last.month === month) {
      last.articles.push(article)
    } else {
      groups.push({ month, articles: [article] })
    }
  }
  return groups
})

// 分類夾：依標籤過濾，卡片用鬆散堆疊呈現
const folderArticles = computed(() => {
  if (!currentTag.value) return articles.value
  return articles.value.filter((article) => tagsOf(article).includes(currentTag.value))
})
</script>

<template>
  <div class="w-full">
    <div class="flex items-center justify-between gap-4 mb-6">
      <!-- 管理頁入口，只有登入後才顯示（AuthOnly.vue 說明為什麼）。 -->
      <AuthOnly>
        <router-link
          :to="{ name: 'article-manage' }"
          class="inline-flex items-center gap-1.5 font-mono text-(length:--type-mono-size) tracking-[0.24em] uppercase text-(--text-ink-muted) hover:text-(--text-accent) transition-colors duration-hover-out hover:duration-hover-in"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          管理
        </router-link>
      </AuthOnly>
      <!-- ml-auto：沒登入時左邊的「管理」不存在，justify-between 只剩一個子元素會把切換鈕擠到左邊。
           全站統一的「幾選一」切換（D-66） -->
      <!-- 沒有文章時不顯示排列切換：空頁面上兩顆沒有東西可排的按鈕只會讓人困惑（模擬讀者審查，D-83） -->
      <BaseSegmented v-if="articles.length > 0" v-model="viewMode" :options="VIEW_MODES" label="文章排列方式" class="ml-auto" />
    </div>

    <BaseLoadingBlock v-if="!ready && !loadError" height="240px">{{ LOADING_TEXT }}</BaseLoadingBlock>
    <BaseLoadingBlock v-else-if="loadError" height="240px" tone="error">
      {{ ARTICLES_LOAD_FAILED_TEXT }}
    </BaseLoadingBlock>

    <template v-else>
    <LoadFailedNotice v-if="fallbackError" :message="fallbackError" class="mb-4" />
    <!-- 一篇已發布的文章都沒有時，兩種排列都只剩空白；頁面拿掉副標後連一句中文都沒有（D-83），
         補一句空狀態 -->
    <p v-if="timelineGroups.length === 0" class="py-12 text-center text-(length:--type-caption-size) text-(--text-ink-body)">
      {{ ARTICLES_EMPTY_TEXT }}
    </p>
    <!-- 時間軸：依日期線性掃視 -->
    <div v-else-if="viewMode === 'timeline'" class="relative pl-7">
      <div class="absolute left-[5px] top-1.5 bottom-1.5 w-0.5 bg-(--border-shelf)"></div>

      <template v-for="group in timelineGroups" :key="group.month">
        <div class="relative my-6 first:mt-0">
          <div
            class="absolute -left-7 top-0.5 w-3 h-3 rounded-full bg-(--text-accent) ring-[3px] ring-(--bg-paper-light)"
          ></div>
          <div class="text-(length:--type-label-size) tracking-[0.05em] font-bold text-(--text-accent)">
            {{ group.month }}
          </div>
        </div>

        <article
          v-for="article in group.articles"
          :key="article.id"
          class="relative pb-6 group"
        >
          <div
            class="absolute -left-[24.5px] top-[7px] w-[7px] h-[7px] rounded-full bg-(--text-ink-muted)"
          ></div>
          <div class="flex items-center gap-3 mb-2 text-(length:--type-label-size) leading-(--type-label-leading) tracking-[0.05em]">
            <span class="text-(--text-ink-muted)">{{ displayDate(article) }}</span>
            <span v-if="tagsOf(article).length" class="text-(--text-accent) font-bold">{{ tagsOf(article)[0] }}</span>
            <!-- 登入後才有（ArticleEditLink 內建 AuthOnly）。relative z-10：標題連結的 ::after 撐滿整列，
                 不墊高的話這顆會被蓋住、點下去變成開文章 -->
            <ArticleEditLink :article-id="article.id" :title="article.title" :class="EDIT_LINK_CLASS" />
          </div>
          <!-- 標題是真的連結，::after 撐滿整列，整列都點得到：鍵盤能 Tab 到、能開新分頁、能複製網址。
               以前是 <article @click>，只有滑鼠點得到 -->
          <h3
            class="text-base font-bold text-(--text-ink-main) mb-1.5 group-hover:text-(--text-accent) transition-colors duration-hover-out group-hover:duration-hover-in"
          >
            <RouterLink
              :to="{ name: 'article-detail', params: { id: article.id } }"
              class="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
              :aria-describedby="activeTip?.articleId === article.id ? mindmapTipId(article.id) : undefined"
              @focus="onTitleFocus(article.id, $event)"
              @blur="onTitleBlur(article.id)"
            >
              <span class="relative z-[1]" @mouseenter="onTitleTextEnter(article.id, $event)" @mouseleave="onTitleTextLeave(article.id)">{{ article.title }}</span>
            </RouterLink>
          </h3>
          <ArticleMindmapHoverTip
            v-if="activeTip?.articleId === article.id"
            :article-id="article.id"
            :anchor="activeTip.anchor"
            :tip-id="mindmapTipId(article.id)"
          />
          <p class="text-(--text-ink-body) text-(length:--type-caption-size) leading-(--type-caption-leading) text-left max-w-[620px]">
            {{ summaryOf(article) }}
          </p>
        </article>
      </template>
    </div>

    <!-- 分類夾：依標籤切換
         手機寬度放不下全部標籤時改成橫向捲動、不換行，避免頁籤換成兩行後
         啟用中的頁籤跟下面卡片的邊框接不起來（換行後只有最後一行貼得到卡片） -->
    <div v-else>
      <div
        class="flex mb-[-1px] relative z-10 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div class="flex flex-nowrap gap-x-1 items-end">
          <BaseButton variant="tab" class="shrink-0" :active="!currentTag" @click="currentTag = ''">
            全部
          </BaseButton>

          <BaseButton
            v-for="tag in allTags"
            :key="tag"
            variant="tab"
            class="shrink-0"
            :active="currentTag === tag"
            @click="currentTag = currentTag === tag ? '' : tag"
          >
            {{ tag }}
          </BaseButton>
        </div>
      </div>

      <!-- 原本每張卡片各自旋轉角度、疊出鬆散紙堆的效果拿掉了：這種扭動除了「看起來像一疊
           紙」之外不代表任何資訊，在文章條數一多的清單裡只會讓版面更亂，不是加分——跟
           `.claude/skills/visual-design-language` 記錄的判斷一致（無法自我證成的裝飾元素
           該拿掉，不是想辦法合理化它留下）。改用跟首頁近況板、時間軸同一套
           「線條分隔、不用陰影堆疊」的清單樣式（divide-y 取代逐格 border+shadow+旋轉），
           hover 用背景色變化取代邊框變色，跟全站清單的互動語言一致。 -->
      <div class="border border-(--border-shelf) bg-(--bg-paper-light) rounded-b rounded-tr-md divide-y divide-(--border-shelf)">
        <article
          v-for="article in folderArticles"
          :key="article.id"
          class="relative p-5 sm:p-6 hover:bg-(--bg-folder) transition-colors duration-hover-out hover:duration-hover-in"
        >
          <div class="flex items-center gap-3 mb-2 text-(length:--type-label-size) leading-(--type-label-leading) tracking-[0.05em]">
            <span class="text-(--text-ink-muted)">{{ displayDate(article) }}</span>
            <span v-if="tagsOf(article).length" class="text-(--text-accent) font-bold">{{ tagsOf(article).join(' / ') }}</span>
            <ArticleEditLink :article-id="article.id" :title="article.title" :class="EDIT_LINK_CLASS" />
          </div>
          <h3 class="text-(length:--type-body-size) font-bold text-(--text-ink-main) mb-1.5">
            <RouterLink
              :to="{ name: 'article-detail', params: { id: article.id } }"
              class="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--text-accent)"
              :aria-describedby="activeTip?.articleId === article.id ? mindmapTipId(article.id) : undefined"
              @focus="onTitleFocus(article.id, $event)"
              @blur="onTitleBlur(article.id)"
            >
              <span class="relative z-[1]" @mouseenter="onTitleTextEnter(article.id, $event)" @mouseleave="onTitleTextLeave(article.id)">{{ article.title }}</span>
            </RouterLink>
          </h3>
          <ArticleMindmapHoverTip
            v-if="activeTip?.articleId === article.id"
            :article-id="article.id"
            :anchor="activeTip.anchor"
            :tip-id="mindmapTipId(article.id)"
          />
          <p class="text-(--text-ink-body) text-(length:--type-caption-size) leading-(--type-caption-leading) text-left max-w-[700px]">
            {{ summaryOf(article) }}
          </p>
        </article>

        <div
          v-if="folderArticles.length === 0"
          class="py-16 text-center text-sm text-(--text-ink-muted)"
        >
          這個分類還沒有文章。
        </div>
      </div>
    </div>
    </template>
  </div>
</template>
