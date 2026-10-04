import type { GraphNodeType } from '@/api/graph'

// 圖譜上「這條線是什麼關係」的簡短標示：/graph 詳情卡（2026-10-03 使用者：「用技術 版本 這樣
// 簡短標示說明就好 經過圖形化的東西不該這麼口語」，D-88），2026-10-04 首頁彈窗與滑過提示也改用
// 同一套（使用者選 mockup H 版）。原本首頁用的口語句子（「「Vue」用在「vue-exercise」」）已經拿掉。
//
// 不逐一翻譯述詞：跨類看兩端是哪兩類，同類才看述詞。完整的述詞中文對照表還沒做：同一個述詞
// 在不同情境下譯法可能不同，要先逐一查來源詞彙的定義（D-73）。
//
// specs 譯「說明」不譯「寫到」：資料裡 specs 的主詞都是官方文件網站（例如 Vue 官方文件 → Vue），
// 意思是「這份文件是這個技術的說明」；「寫到」是文章提到某個技術，那是另一種關係。

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

// 跨類只看兩端類別（不看邊的方向）：實作使用技術（ER model，#75）、
// 文件說明技術、文件記錄實作。
const CROSS_VERB: { from: GraphNodeType; to: GraphNodeType; verb: string }[] = [
  { from: 'implementation', to: 'technique', verb: '使用' },
  { from: 'documentation', to: 'technique', verb: '說明' },
  { from: 'documentation', to: 'implementation', verb: '記錄' },
]

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
  for (const { from, to, verb } of CROSS_VERB) {
    if (source.domainType === from && target.domainType === to)
      return { subject: source, object: target, verb }
    if (target.domainType === from && source.domainType === to)
      return { subject: target, object: source, verb }
  }
  const same = predicate ? SAME_CLASS_VERB[predicate] : undefined
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
