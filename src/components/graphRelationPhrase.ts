import type { GraphNodeType } from '@/api/graph'

// 首頁知識網路「這條線是什麼關係」的白話說明（2026-10-01 使用者決定）。
//
// 不逐一翻譯述詞，而是看兩端是哪兩類，沿用 About 頁的三個動詞：文件說明技術、文件記錄實作、
// 技術用在實作。句子的方向由類別決定，不看邊的 source/target，所以後端述詞方向改不改都讀得通。
// 完整的述詞中文對照表還沒做：同一個述詞在不同情境下譯法可能不同，要先逐一查來源詞彙的定義（D-73）。
//
// specs 譯「說明」不譯「寫到」：資料裡 specs 的主詞都是官方文件網站（例如 Vue 官方文件 → Vue），
// 意思是「這份文件是這個技術的說明」；「寫到」是文章提到某個技術，那是另一種關係。
const CROSS_CLASS: { from: GraphNodeType; to: GraphNodeType; verb: string }[] = [
  { from: 'documentation', to: 'technique', verb: '說明' },
  { from: 'documentation', to: 'implementation', verb: '記錄' },
  { from: 'technique', to: 'implementation', verb: '用在' },
]

const TYPE_LABEL: Record<GraphNodeType, string> = {
  documentation: '文件',
  technique: '技術',
  implementation: '實作',
}

export interface PhraseNode {
  domainType: GraphNodeType
  label: string
}

export interface RelationPhrase {
  /** 彈窗標題、滑過的提示都用這句 */
  sentence: string
  /** 同類之間沒有動詞可用，補一句是哪一類之間的關係；跨類的句子本身就說完了 */
  note: string | null
}

export function relationPhrase(a: PhraseNode, b: PhraseNode): RelationPhrase {
  for (const { from, to, verb } of CROSS_CLASS) {
    const subject =
      a.domainType === from && b.domainType === to
        ? a
        : b.domainType === from && a.domainType === to
          ? b
          : null
    if (subject) {
      const object = subject === a ? b : a
      return { sentence: `「${subject.label}」${verb}「${object.label}」`, note: null }
    }
  }
  return {
    sentence: `「${a.label}」與「${b.label}」`,
    note: a.domainType === b.domainType ? `兩個${TYPE_LABEL[a.domainType]}之間的關係` : null,
  }
}

// /graph 詳情卡用的簡短標示（2026-10-03 使用者：「用技術 版本 這樣簡短標示說明就好
// 經過圖形化的東西不該這麼口語」，D-88）。首頁彈窗、滑過提示仍用上面的 relationPhrase。

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

// 跨類只看兩端類別（跟 relationPhrase 一樣不看邊的方向）：實作使用技術（ER model，#75）、
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
