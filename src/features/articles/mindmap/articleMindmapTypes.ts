// 文章心智圖的資料格式。前端只吃這一份 JSON，後端怎麼產生（程式、半自動、作者手改）都是同一種。
// 層次規則：最多 2 層（中心 → 分枝 → 概念）。

export const MINDMAP_STRENGTHS = ['primary', 'secondary'] as const
export const MINDMAP_LINK_ORIGINS = ['ontology', 'graph', 'author', 'cooccurrence'] as const
export const MINDMAP_STATUSES = ['draft', 'reviewed'] as const

/** 中心之下最多幾層：分枝是第 1 層，概念是第 2 層。 */
export const MINDMAP_MAX_DEPTH = 2

export type MindmapStrength = (typeof MINDMAP_STRENGTHS)[number]
export type MindmapLinkOrigin = (typeof MINDMAP_LINK_ORIGINS)[number]
export type MindmapStatus = (typeof MINDMAP_STATUSES)[number]

/** 節點出現在文章哪一段：unit_id 是段落標題的錨點（跟內文標題 id 同一個），count 是出現次數。 */
export interface MindmapUnit {
  unit_id: string
  count: number
}

export interface MindmapNode {
  id: string
  /** 中心節點是 null，其他節點指向存在的節點。 */
  parent: string | null
  /** 文章裡實際用的詞（nomen）。 */
  label: string
  /** 對得上圖譜才有，沒有就是 null；有值的節點可連到圖譜。 */
  res_id: number | null
  /**
   * 內文寫法：文章內文裡實際出現、但跟 label 不同的寫法（選填）。只給沒有 res_id 的節點用，
   * 而且每個寫法都必須在這個節點連到的段落裡原樣出現（資料格式驗證看不到內文，由一致性檢查把關）。
   * 有 res_id 的節點不用這欄，內文寫法改登記成那個 res 的 nomen。
   */
  text_forms?: string[]
  /** primary 是主題，secondary 是次要（預設收合）。弱關聯不進這份資料。 */
  strength: MindmapStrength
  /** 0 到 1，決定字級或粗細。 */
  weight: number
  units: MindmapUnit[]
}

/** 樹以外的橫向關係。資料全部保留，前端用開關決定畫不畫（預設不畫）。 */
export interface MindmapLink {
  source: string
  target: string
  /** 有類型就填，只是常一起出現就是 null。 */
  type: string | null
  origin: MindmapLinkOrigin
  /** 0 到 1。 */
  weight: number
}

export interface ArticleMindmap {
  article_id: number
  /** 中心節點的 id。 */
  center: string
  nodes: MindmapNode[]
  links: MindmapLink[]
  /** draft＝程式產生，reviewed＝作者整理過。 */
  status: MindmapStatus
}
