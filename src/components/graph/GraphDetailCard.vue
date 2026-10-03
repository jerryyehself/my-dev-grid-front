<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ArticleEditLink from '@/components/ArticleEditLink.vue'
import { articleIdOfGraphNode, graphNodeLink } from '@/components/graphNodeLink'
import { edgeRelation } from '@/components/graphRelationPhrase'
import type { GraphPocSelection } from '@/data/graphPocData'
import {
  detailNodeOf,
  indirectRelationsOf,
  relationGroupsOf,
  type DetailNode,
  type GraphDetailIndex,
} from './graphDetail'
import { TYPE_LABEL } from './graphTypes'

// /graph 點節點／點連線之後的詳情卡（2D、3D 共用同一張）。內容排成表格：選了節點就列出它的
// 直接關係（依關係分組），選了連線就列起點／關係／終點。表格裡的節點名稱都是按鈕，按了改選那個
// 節點（2D 畫布也跟著固定選取，見 GraphPocView）。
// 關係的說法一律走 graphRelationPhrase.ts（看兩端類別，不顯示英文述詞，D-73）。
const props = defineProps<{
  selected: GraphPocSelection
  /** 從 GET /api/graph 建的查詢索引；還沒載入時是 null，表格就先不顯示 */
  index: GraphDetailIndex | null
  /** 間接關聯開關（2D 畫布的顯示設定）是否打開：打開才列選中節點的間接關聯 */
  showIndirect: boolean
}>()
const emit = defineEmits<{ selectNode: [id: string]; close: [] }>()

const nodeSel = computed(() => (props.selected.kind === 'node' ? props.selected : null))
const linkSel = computed(() => (props.selected.kind === 'link' ? props.selected : null))

// 點到的節點連去哪（文章頁、外部網址、專案頁；技術沒有頁面），規則跟首頁知識網路的彈窗共用
const nodeLink = computed(() => (nodeSel.value ? graphNodeLink(nodeSel.value) : null))
// 站上自己的文章才有，給登入後的「編輯這篇」用（同一條規則，見 graphNodeLink.ts）
const articleId = computed(() => (nodeSel.value ? articleIdOfGraphNode(nodeSel.value) : null))

const groups = computed(() =>
  nodeSel.value && props.index ? relationGroupsOf(props.index, nodeSel.value.id) : [],
)
const directCount = computed(() => groups.value.reduce((sum, g) => sum + g.nodes.length, 0))
const indirect = computed(() =>
  nodeSel.value && props.index && props.showIndirect
    ? indirectRelationsOf(props.index, nodeSel.value.id)
    : null,
)

// 連線的兩端：查得到就用索引裡的名稱與類別；索引還沒載入時退回選取時帶的名稱（沒有類別）
const ends = computed(() => {
  const l = linkSel.value
  if (!l) return null
  const source = detailNodeOf(props.index, l.sourceId)
  const target = detailNodeOf(props.index, l.targetId)
  return {
    source,
    target,
    sourceLabel: source?.label ?? l.sourceLabel,
    targetLabel: target?.label ?? l.targetLabel,
  }
})
// 直接關係的起點／關係／終點：起點是主詞那一端（不一定是邊原本的 source），見 edgeRelation
const direct = computed(() => {
  const e = ends.value
  if (!e?.source || !e.target) return null
  const r = edgeRelation(e.source, e.target, linkSel.value?.predicate ?? null)
  return { subject: r.subject as DetailNode, object: r.object as DetailNode, verb: r.verb }
})
// 間接關聯的共同鄰居：從索引查 id（才能點）；查不到就退回畫布給的名稱，只顯示不能點
const via = computed<DetailNode[] | null>(() => {
  const l = linkSel.value
  if (!l?.indirectVia || !props.index) return null
  const hit = props.index.indirect.get(l.sourceId)?.find((x) => x.other === l.targetId)
  if (!hit) return null
  return hit.via
    .map((id) => detailNodeOf(props.index, id))
    .filter((n): n is DetailNode => n != null)
})

// 在卡片裡按了節點名稱：卡片內容整個換掉，原本那顆按鈕跟著消失，鍵盤焦點會掉回 <body>。
// 換完之後把焦點移到新的標題上，鍵盤和螢幕閱讀器的使用者才知道卡片換成誰了。
const title = ref<HTMLElement>()
let focusTitleNext = false
function pick(id: string) {
  focusTitleNext = true
  emit('selectNode', id)
}
watch(
  () => props.selected,
  async () => {
    if (!focusTitleNext) return
    focusTitleNext = false
    await nextTick()
    title.value?.focus({ preventScroll: true })
  },
)

// 表格裡的節點名稱按鈕。跟連結同色（accent）表示「可以點」；上下留一點高度，手指好點
const NODE_BTN =
  'inline text-left text-(--text-accent) hover:underline underline-offset-2 rounded-sm py-1 cursor-pointer break-words [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--text-accent)'
// 堆疊清單裡的名稱：inline-block，一行放不下時在名稱之間折行，不會把 my-dev-grid-front 從連字號斷開；
// 名稱本身比整行還長時才在名稱裡折（overflow-wrap:anywhere 仍在）
const NODE_BTN_STACKED = NODE_BTN.replace(/^inline /, 'inline-block max-w-full align-baseline ')
// 表格的欄名、列名：中文標籤 13px（D-68 字級下限）
const TH = 'text-left align-top font-normal text-[13px] tracking-[0.05em]'
</script>

<template>
  <!-- [&_p]:m-0：頁面外層的 .global-page-wrapper 給每個 <p>、<h2> 文件排版的上下距離（base.css），
       卡片裡的短標籤、句子不要那些距離，間距由這裡自己決定 -->
  <div
    class="relative text-[14px] leading-relaxed border border-(--border-shelf) rounded-xl px-4 py-3 bg-(--bg-paper-light) [&_p]:m-0 [&_p]:text-left"
  >
    <button
      type="button"
      class="absolute top-1 right-1 w-9 h-9 flex items-center justify-center rounded-lg text-(--text-ink-muted) hover:text-(--text-ink-body) cursor-pointer focus-visible:outline-2 focus-visible:outline-(--text-accent)"
      aria-label="關閉"
      @click="emit('close')"
    >
      ×
    </button>

    <!-- ───── 選了節點：標題＋連結，下面是它的直接關係表 ───── -->
    <template v-if="nodeSel">
      <p class="text-[13px] tracking-[0.05em] text-(--text-accent)">
        {{ TYPE_LABEL[nodeSel.domainType] }}
      </p>
      <h2
        ref="title"
        tabindex="-1"
        class="block m-0 mt-0.5 pr-8 text-[15.5px] font-bold leading-snug tracking-normal text-(--text-ink-main) [overflow-wrap:anywhere] focus:outline-none"
      >
        {{ nodeSel.label }}
      </h2>
      <div class="flex flex-wrap items-center">
        <RouterLink
          v-if="nodeLink?.kind === 'internal'"
          :to="nodeLink.to"
          class="inline-flex items-center min-h-11 pr-3 text-(--text-accent) hover:underline"
          >{{ nodeLink.text }}</RouterLink
        >
        <a
          v-else-if="nodeLink?.kind === 'external'"
          :href="nodeLink.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center min-h-11 pr-3 text-(--text-accent) hover:underline"
          >{{ nodeLink.text }}</a
        >
        <!-- 跟首頁知識網路彈窗同一顆，只給登入的人看 -->
        <ArticleEditLink
          v-if="articleId != null"
          :article-id="articleId"
          :title="nodeSel.label"
          label="編輯這篇"
          class="inline-flex items-center min-h-11 pl-1 text-(--text-ink-muted) hover:text-(--text-accent) hover:underline"
        />
      </div>

      <template v-if="index">
        <!-- 直接關係：上下堆疊（D-88，畫稿 C）。每組一個 dt（類別或「版本」）＋一個 dd（名稱用頓號接），
             手機上不用兩欄；名稱是 inline-block，只在名稱之間折行，不會從連字號中間斷開 -->
        <template v-if="directCount > 0">
          <p class="mt-2 text-[14px] leading-relaxed text-(--text-ink-muted)">
            共 {{ directCount }} 條直接關係
          </p>
          <dl class="mt-2 grid gap-2.5 m-0">
            <div
              v-for="g in groups"
              :key="g.label"
              class="grid gap-0.5 border-t border-(--border-shelf) pt-2"
            >
              <dt :class="[TH, 'text-(--text-ink-body)']">{{ g.label }}</dt>
              <dd class="m-0">
                <template v-for="(n, i) in g.nodes" :key="n.id"
                  ><button type="button" :class="NODE_BTN_STACKED" @click="pick(n.id)">
                    {{ n.label }}</button
                  ><span v-if="i < g.nodes.length - 1" class="text-(--text-ink-body)"
                    >、</span
                  ></template
                >
              </dd>
            </div>
          </dl>
        </template>
        <p v-else class="mt-1 text-(--text-ink-muted)">還沒有直接關係。</p>

        <!-- 間接關聯：只在顯示設定打開「間接關聯」時列出，跟直接關係分開一張表 -->
        <template v-if="indirect">
          <table v-if="indirect.length" class="mt-4 w-full border-collapse table-fixed">
            <caption class="text-left pb-1">
              <span class="block text-[13px] tracking-[0.05em] text-(--text-accent)">間接關聯</span>
              <span class="block text-(--text-ink-muted)"
                >兩邊都連到相同的對象，這是推算出來的，不是直接關係。</span
              >
            </caption>
            <colgroup>
              <col class="w-[42%]" />
              <col />
            </colgroup>
            <thead>
              <tr class="border-b border-(--border-shelf)">
                <th scope="col" :class="[TH, 'py-1 pr-3 text-(--text-ink-muted)']">關聯對象</th>
                <th scope="col" :class="[TH, 'py-1 text-(--text-ink-muted)']">兩邊都連到</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in indirect"
                :key="r.node.id"
                class="border-b border-(--border-shelf) last:border-b-0"
              >
                <th scope="row" class="text-left align-top font-normal py-1 pr-3">
                  <button type="button" :class="NODE_BTN" @click="pick(r.node.id)">
                    {{ r.node.label }}
                  </button>
                </th>
                <td class="align-top py-1">
                  <template v-for="(v, j) in r.via" :key="v.id"
                    ><button type="button" :class="NODE_BTN" @click="pick(v.id)">
                      {{ v.label }}</button
                    ><span v-if="j < r.via.length - 1" class="text-(--text-ink-muted)"
                      >、</span
                    ></template
                  >
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="mt-4 text-(--text-ink-muted)">沒有推算出來的間接關聯。</p>
        </template>
      </template>
    </template>

    <!-- ───── 選了間接關聯的虛線：兩端＋兩邊都連到的節點 ───── -->
    <template v-else-if="linkSel?.indirectVia && ends">
      <p class="text-[13px] tracking-[0.05em] text-(--text-accent)">間接關聯</p>
      <table class="mt-1 w-full border-collapse table-fixed">
        <colgroup>
          <col class="w-[6.5em]" />
          <col />
        </colgroup>
        <tbody>
          <tr class="border-b border-(--border-shelf)">
            <th scope="row" :class="[TH, 'py-1.5 pr-3 text-(--text-ink-muted)']">這兩個</th>
            <td class="align-top py-0.5">
              <span v-for="end in [ends.source, ends.target]" :key="end?.id" class="block">
                <template v-if="end">
                  <button type="button" :class="NODE_BTN" @click="pick(end.id)">
                    {{ end.label }}</button
                  ><span class="ml-2 text-[13px] text-(--text-ink-body)">{{
                    TYPE_LABEL[end.domainType]
                  }}</span>
                </template>
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row" :class="[TH, 'py-1.5 pr-3 text-(--text-ink-muted)']">兩邊都連到</th>
            <td class="align-top py-0.5">
              <template v-if="via"
                ><template v-for="(v, j) in via" :key="v.id"
                  ><button type="button" :class="NODE_BTN" @click="pick(v.id)">{{ v.label }}</button
                  ><span v-if="j < via.length - 1" class="text-(--text-ink-muted)"
                    >、</span
                  ></template
                ></template
              >
              <span v-else class="inline-block py-1">{{ linkSel.indirectVia.join('、') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="mt-2 text-(--text-ink-muted)">這是推算出來的，不是直接關係。</p>
    </template>

    <!-- ───── 選了直接關係的實線：一行「主詞 類別　動詞 →　受詞 類別」（D-88，畫稿 E2′）───── -->
    <template v-else-if="ends">
      <p class="text-[13px] tracking-[0.05em] text-(--text-accent)">直接關係</p>
      <p
        v-if="direct"
        class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px] leading-relaxed"
      >
        <span
          ><button type="button" :class="NODE_BTN" @click="pick(direct.subject.id)">
            {{ direct.subject.label }}</button
          ><span class="ml-2 text-[13px] text-(--text-ink-body)">{{
            TYPE_LABEL[direct.subject.domainType]
          }}</span></span
        >
        <span class="font-bold text-(--text-ink-main)">{{ direct.verb }} →</span>
        <span
          ><button type="button" :class="NODE_BTN" @click="pick(direct.object.id)">
            {{ direct.object.label }}</button
          ><span class="ml-2 text-[13px] text-(--text-ink-body)">{{
            TYPE_LABEL[direct.object.domainType]
          }}</span></span
        >
      </p>
      <!-- 索引還沒載入：查不到類別，也就不知道誰是主詞，只照邊的方向列兩端名稱 -->
      <p v-else class="mt-2 text-[14px] leading-relaxed">
        {{ ends.sourceLabel }} → {{ ends.targetLabel }}
      </p>
    </template>
  </div>
</template>
