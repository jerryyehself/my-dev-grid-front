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
    const subject = a.domainType === from && b.domainType === to ? a : b.domainType === from && a.domainType === to ? b : null
    if (subject) {
      const object = subject === a ? b : a
      return { sentence: `「${subject.label}」${verb}「${object.label}」`, note: null }
    }
  }
  return {
    sentence: `${a.label} 與 ${b.label}`,
    note: a.domainType === b.domainType ? `兩個${TYPE_LABEL[a.domainType]}之間的關係` : null,
  }
}
