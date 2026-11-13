import type { GraphNodeType } from '@/api/graph'

// 圖譜上「這條線是什麼關係」的簡短標示：/graph 詳情卡（2026-10-03，D-88：用「技術」「版本」這樣
// 的簡短標示，圖形化的內容不該寫成口語句子），2026-10-04 首頁彈窗與滑過提示也改用
// 同一套（使用者選 mockup H 版）。原本首頁用的口語句子（「「Vue」用在「vue-exercise」」）已經拿掉。
//
// 跨類看兩端是哪兩類、再對照述詞；同類只看述詞。完整的述詞中文對照表還沒做：同一個述詞
// 在不同情境下譯法可能不同，要先逐一查來源詞彙的定義（D-73）。
//
// specs 譯「說明」不譯「寫到」：資料裡 specs 的主詞都是官方文件網站（例如 Vue 官方文件 → Vue），
// 意思是「這份文件是這個技術的說明」；文章提到某個技術是 about／subjectOf（schema.org），
// 那是另一種關係，譯「談到」。「論及」太書面（使用者看過「登記」這類字的反應：太文謅謅），
// 所以不選。

const TYPE_LABEL: Record<GraphNodeType, string> = {
  documentation: '文件',
  technique: '技術',
  implementation: '實作',
}

export interface PhraseNode {
  domainType: GraphNodeType
  label: string
}

/** 技術的版本關係（Dublin Core）：isVersionOf 的主詞是版本，hasVersion 的主詞是主技術 */
export const VERSION_OF = 'isVersionOf'
export const HAS_VERSION = 'hasVersion'

/**
 * 節點卡「關係」欄：對方的類別（文件／技術／實作）；對方是自己的一個版本時標「版本」。
 * 從版本那端看主技術，主技術就是一個「技術」，不另外標。
 */
export function relationFromNode(other: GraphNodeType, otherIsVersion: boolean): string {
  return otherIsVersion ? '版本' : TYPE_LABEL[other]
}

export interface EdgeRelation {
  /** 起點：句子的主詞；跨類由類別決定，同類由述詞方向決定 */
  subject: PhraseNode
  object: PhraseNode
  verb: string
}

// 跨類別的述詞：每個述詞自己帶一組「主詞類別／受詞類別」，兩端類別對得上才用它的動詞，
// 兩個方向（正向、反向）的述詞共用同一個動詞，主詞都是同一端：實作使用技術（ER model，#75）、
// 文件說明技術、文件記錄實作、文件談到技術或實作。
// 原本只看兩端類別，文件→技術一律標「說明」，about 的文章也會被標成「說明」。
interface CrossVerb {
  from: GraphNodeType
  to: GraphNodeType
  verb: string
}
const SPECS: CrossVerb = { from: 'documentation', to: 'technique', verb: '說明' }
const DOCUMENTS: CrossVerb = { from: 'documentation', to: 'implementation', verb: '記錄' }
const USES: CrossVerb = { from: 'implementation', to: 'technique', verb: '使用' }
const ABOUT_TECHNIQUE: CrossVerb = { from: 'documentation', to: 'technique', verb: '談到' }
const ABOUT_IMPLEMENTATION: CrossVerb = { from: 'documentation', to: 'implementation', verb: '談到' }

/** 跨類述詞 → 這個述詞允許的（主詞類別、受詞類別）與動詞；about 可以連到技術也可以連到實作 */
const CROSS_PREDICATE: Record<string, CrossVerb[]> = {
  specs: [SPECS],
  specifiedBy: [SPECS],
  documents: [DOCUMENTS],
  documentedBy: [DOCUMENTS],
  uses: [USES],
  usedBy: [USES],
  // assisted-by／assists 與 uses／usedBy 平輩（AI 只提供建議、不直接產出成品），沿用「使用」
  'assisted-by': [USES],
  assists: [USES],
  about: [ABOUT_TECHNIQUE, ABOUT_IMPLEMENTATION],
  subjectOf: [ABOUT_TECHNIQUE, ABOUT_IMPLEMENTATION],
}

// 述詞是空的（舊資料沒有填關係）時，退回只看兩端類別的預設動詞
const CROSS_DEFAULT: CrossVerb[] = [USES, SPECS, DOCUMENTS]

// 同類看述詞；反向述詞把兩端對調，讓起點永遠是主動的那一端
const SAME_CLASS_VERB: Record<string, { verb: string; swap: boolean }> = {
  requires: { verb: '需要', swap: false },
  isRequiredBy: { verb: '需要', swap: true },
  [VERSION_OF]: { verb: '版本', swap: false },
  [HAS_VERSION]: { verb: '版本', swap: true },
}

/** 連線卡「起點／關係／終點」：source/target 是邊原本的方向，predicate 是邊的述詞 */
export function edgeRelation(
  source: PhraseNode,
  target: PhraseNode,
  predicate: string | null,
): EdgeRelation {
  const crossClass = source.domainType !== target.domainType
  if (crossClass) {
    // 述詞有填就只認它自己的動詞：不認得的述詞、或兩端類別跟述詞對不上，一律標「相關」，
    // 不退回類別預設（否則新述詞會被標成別的述詞的意思）
    const candidates = predicate === null
        ? CROSS_DEFAULT
        : Object.hasOwn(CROSS_PREDICATE, predicate)
          ? CROSS_PREDICATE[predicate]!
          : []
    for (const { from, to, verb } of candidates) {
      if (source.domainType === from && target.domainType === to)
        return { subject: source, object: target, verb }
      if (target.domainType === from && source.domainType === to)
        return { subject: target, object: source, verb }
    }
    return { subject: source, object: target, verb: '相關' }
  }
  // hasOwn：述詞是 constructor 這類物件內建的名字時，不能被當成查得到
  const same = predicate && Object.hasOwn(SAME_CLASS_VERB, predicate) ? SAME_CLASS_VERB[predicate] : undefined
  if (same)
    return same.swap
      ? { subject: target, object: source, verb: same.verb }
      : { subject: source, object: target, verb: same.verb }
  return { subject: source, object: target, verb: '相關' }
}

/** 純文字版（滑過提示、彈窗的 title）：「vue-exercise（實作） 使用 → Vue（技術）」 */
export function edgeRelationText({ subject, object, verb }: EdgeRelation): string {
  return `${subject.label}（${TYPE_LABEL[subject.domainType]}） ${verb} → ${object.label}（${TYPE_LABEL[object.domainType]}）`
}
