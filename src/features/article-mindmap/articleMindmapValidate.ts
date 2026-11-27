import {
  MINDMAP_LINK_ORIGINS,
  MINDMAP_MAX_DEPTH,
  MINDMAP_STATUSES,
  MINDMAP_STRENGTHS,
  type ArticleMindmap,
} from './articleMindmapTypes'

type Rec = Record<string, unknown>

function isRec(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== ''
}

function isRatio(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
}

/**
 * 檢查一份資料是不是合格的文章心智圖，回傳問題清單；空陣列就是合格。
 * 不合格就一律當壞資料：缺欄位、型別不對、層次超過 2 層、parent 指到不存在的節點、
 * 有環、有多個中心、連線指到不存在的節點，都會被列出來。
 */
export function validateArticleMindmap(data: unknown): string[] {
  if (!isRec(data)) return ['資料不是物件']
  const errors: string[] = []

  if (!Number.isInteger(data.article_id) || (data.article_id as number) <= 0) {
    errors.push('article_id 必須是正整數')
  }
  if (!(MINDMAP_STATUSES as readonly unknown[]).includes(data.status)) {
    errors.push('status 必須是 draft 或 reviewed')
  }
  if (!isNonEmptyString(data.center)) errors.push('center 必須是非空字串')

  if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
    errors.push('nodes 必須是非空陣列')
    return errors
  }

  // 節點：逐一檢查欄位，同時建 id 表
  const byId = new Map<string, Rec>()
  data.nodes.forEach((raw: unknown, i: number) => {
    if (!isRec(raw)) {
      errors.push(`nodes[${i}] 不是物件`)
      return
    }
    const where = `nodes[${i}]`
    if (!isNonEmptyString(raw.id)) {
      errors.push(`${where}.id 必須是非空字串`)
      return
    }
    if (byId.has(raw.id)) errors.push(`${where}.id 重複：${raw.id}`)
    byId.set(raw.id, raw)
    if (raw.parent !== null && !isNonEmptyString(raw.parent)) {
      errors.push(`${where}.parent 必須是節點 id 或 null`)
    }
    if (!isNonEmptyString(raw.label)) errors.push(`${where}.label 必須是非空字串`)
    if (raw.res_id !== null && !(Number.isInteger(raw.res_id) && (raw.res_id as number) > 0)) {
      errors.push(`${where}.res_id 必須是正整數或 null`)
    }
    if (!(MINDMAP_STRENGTHS as readonly unknown[]).includes(raw.strength)) {
      errors.push(`${where}.strength 必須是 primary 或 secondary`)
    }
    if (!isRatio(raw.weight)) errors.push(`${where}.weight 必須是 0 到 1 的數字`)
    if (!Array.isArray(raw.units)) {
      errors.push(`${where}.units 必須是陣列`)
    } else {
      raw.units.forEach((u: unknown, j: number) => {
        if (
          !isRec(u) ||
          !isNonEmptyString(u.unit_id) ||
          !Number.isInteger(u.count) ||
          (u.count as number) < 1
        ) {
          errors.push(`${where}.units[${j}] 必須是 { unit_id: 非空字串, count: 正整數 }`)
        }
      })
    }
  })

  // 層次：只有一個中心、parent 都存在、沒有環、最多 MINDMAP_MAX_DEPTH 層
  const center = isNonEmptyString(data.center) ? data.center : null
  if (center !== null && !byId.has(center)) errors.push(`center 指到不存在的節點：${center}`)
  for (const [id, n] of byId) {
    if (n.parent === null) {
      if (id !== center) errors.push(`節點 ${id} 沒有 parent，但它不是中心（只能有一個中心）`)
      continue
    }
    if (id === center) {
      errors.push('中心節點的 parent 必須是 null')
      continue
    }
    if (typeof n.parent === 'string' && !byId.has(n.parent)) {
      errors.push(`節點 ${id} 的 parent 指到不存在的節點：${n.parent}`)
      continue
    }
    // 往上走到中心，數層數；走超過節點總數代表有環
    let depth = 0
    let cur: Rec | undefined = n
    while (cur !== undefined && cur.parent !== null && depth <= byId.size) {
      cur = byId.get(cur.parent as string)
      depth++
    }
    if (depth > byId.size) errors.push(`節點 ${id} 的 parent 鏈有環`)
    else if (cur !== undefined && cur.id !== center) errors.push(`節點 ${id} 沒有連回中心`)
    else if (depth > MINDMAP_MAX_DEPTH) {
      errors.push(`節點 ${id} 在第 ${depth} 層，最多只能到第 ${MINDMAP_MAX_DEPTH} 層`)
    }
  }

  // 橫向連線
  if (!Array.isArray(data.links)) {
    errors.push('links 必須是陣列（沒有橫向關係就給空陣列）')
  } else {
    data.links.forEach((raw: unknown, i: number) => {
      const where = `links[${i}]`
      if (!isRec(raw)) {
        errors.push(`${where} 不是物件`)
        return
      }
      for (const end of ['source', 'target'] as const) {
        const v = raw[end]
        if (!isNonEmptyString(v) || !byId.has(v)) errors.push(`${where}.${end} 指到不存在的節點`)
      }
      if (raw.source === raw.target) errors.push(`${where} 連到自己`)
      if (raw.type !== null && !isNonEmptyString(raw.type)) {
        errors.push(`${where}.type 必須是非空字串或 null`)
      }
      if (!(MINDMAP_LINK_ORIGINS as readonly unknown[]).includes(raw.origin)) {
        errors.push(`${where}.origin 必須是 ontology／graph／author／cooccurrence 其中之一`)
      }
      if (!isRatio(raw.weight)) errors.push(`${where}.weight 必須是 0 到 1 的數字`)
    })
  }

  return errors
}

export function isArticleMindmap(data: unknown): data is ArticleMindmap {
  return validateArticleMindmap(data).length === 0
}
