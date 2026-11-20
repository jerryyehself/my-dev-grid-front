import { describe, expect, it } from 'vitest'
import { edgeRelation, edgeRelationText, relationFromNode, routeSegmentVerb } from './graphRelationPhrase'
import { nodeKindLabel } from './graphTypes'

const doc = { domainType: 'documentation' as const, label: 'Vue 官方文件' }
const tech = { domainType: 'technique' as const, label: 'Vue' }
const impl = { domainType: 'implementation' as const, label: 'my-dev-grid' }

describe('relationFromNode', () => {
  it('它應該在詳情卡以對方的類別作為簡短標示', () => {
    expect(relationFromNode('documentation', false)).toBe('文件')
    expect(relationFromNode('technique', false)).toBe('技術')
    expect(relationFromNode('implementation', false)).toBe('實作')
  })

  it('它應該在對方是自己的一個版本時標「版本」', () => {
    expect(relationFromNode('technique', true)).toBe('版本')
  })
})

describe('edgeRelation', () => {
  const js = { domainType: 'technique' as const, label: 'JavaScript' }
  const vue3 = { domainType: 'technique' as const, label: 'Vue 3' }
  const brief = (r: ReturnType<typeof edgeRelation>) => [r.subject.label, r.verb, r.object.label]

  it('它應該在跨類時看類別、不看邊的方向：實作使用技術、文件說明技術、文件記錄實作', () => {
    expect(brief(edgeRelation(tech, impl, 'usedBy'))).toEqual(['my-dev-grid', '使用', 'Vue'])
    expect(brief(edgeRelation(impl, tech, 'uses'))).toEqual(['my-dev-grid', '使用', 'Vue'])
    expect(brief(edgeRelation(tech, doc, 'specs'))).toEqual(['Vue 官方文件', '說明', 'Vue'])
    expect(brief(edgeRelation(doc, impl, null))).toEqual(['Vue 官方文件', '記錄', 'my-dev-grid'])
  })

  it('它應該讓跨類的動詞跟著述詞走：同樣是文件到技術，specs 說明、about 討論', () => {
    const article = { domainType: 'documentation' as const, label: 'Vue 入門筆記' }
    expect(brief(edgeRelation(doc, tech, 'specs'))).toEqual(['Vue 官方文件', '說明', 'Vue'])
    expect(brief(edgeRelation(article, tech, 'about'))).toEqual(['Vue 入門筆記', '討論', 'Vue'])
    // 反向述詞：邊存成技術→文章，主詞仍是文章
    expect(brief(edgeRelation(tech, article, 'subjectOf'))).toEqual(['Vue 入門筆記', '討論', 'Vue'])
    expect(brief(edgeRelation(tech, doc, 'specifiedBy'))).toEqual(['Vue 官方文件', '說明', 'Vue'])
    // 文章討論專案（about 也可以連實作）；documents 才是記錄
    expect(brief(edgeRelation(article, impl, 'about'))).toEqual(['Vue 入門筆記', '討論', 'my-dev-grid'])
    expect(brief(edgeRelation(impl, article, 'subjectOf'))).toEqual(['Vue 入門筆記', '討論', 'my-dev-grid'])
    // 後端拆出來的文件→專案述詞
    expect(brief(edgeRelation(article, impl, 'aboutProject'))).toEqual(['Vue 入門筆記', '討論', 'my-dev-grid'])
    expect(brief(edgeRelation(impl, article, 'projectSubjectOf'))).toEqual(['Vue 入門筆記', '討論', 'my-dev-grid'])
    expect(brief(edgeRelation(article, impl, 'documents'))).toEqual(['Vue 入門筆記', '記錄', 'my-dev-grid'])
    expect(brief(edgeRelation(impl, article, 'documentedBy'))).toEqual(['Vue 入門筆記', '記錄', 'my-dev-grid'])
    // 實作→技術的兩組述詞都標「使用」
    expect(brief(edgeRelation(impl, tech, 'assisted-by'))).toEqual(['my-dev-grid', '使用', 'Vue'])
    expect(brief(edgeRelation(tech, impl, 'assists'))).toEqual(['my-dev-grid', '使用', 'Vue'])
  })

  it('它應該在跨類而述詞不認得、或述詞跟兩端類別對不上時標「相關」，不退回類別預設', () => {
    // 不認得的述詞：不能因為是文件→技術就標成「說明」
    expect(brief(edgeRelation(doc, tech, 'somethingNew'))).toEqual(['Vue 官方文件', '相關', 'Vue'])
    expect(brief(edgeRelation(impl, tech, 'somethingNew'))).toEqual(['my-dev-grid', '相關', 'Vue'])
    // 近似但不同的述詞名稱
    expect(brief(edgeRelation(doc, tech, 'spec'))).toEqual(['Vue 官方文件', '相關', 'Vue'])
    expect(brief(edgeRelation(doc, tech, 'About'))).toEqual(['Vue 官方文件', '相關', 'Vue'])
    expect(brief(edgeRelation(doc, tech, ''))).toEqual(['Vue 官方文件', '相關', 'Vue'])
    // 物件內建的名字不能被當成查得到的述詞
    expect(brief(edgeRelation(doc, tech, 'constructor'))).toEqual(['Vue 官方文件', '相關', 'Vue'])
    expect(brief(edgeRelation(tech, js, 'toString'))).toEqual(['Vue', '相關', 'JavaScript'])
    // 述詞認得，但兩端類別不是它該連的：specs 連到實作、about 連到另一份文件
    expect(brief(edgeRelation(doc, impl, 'specs'))).toEqual(['Vue 官方文件', '相關', 'my-dev-grid'])
    expect(brief(edgeRelation(doc, tech, 'documents'))).toEqual(['Vue 官方文件', '相關', 'Vue'])
    expect(brief(edgeRelation(tech, doc, 'usedBy'))).toEqual(['Vue', '相關', 'Vue 官方文件'])
    expect(brief(edgeRelation(doc, { ...doc, label: '另一份文件' }, 'about'))).toEqual([
      'Vue 官方文件',
      '相關',
      '另一份文件',
    ])
  })

  it('它應該在述詞是空的（舊資料）時，仍照兩端類別給預設動詞', () => {
    expect(brief(edgeRelation(doc, tech, null))).toEqual(['Vue 官方文件', '說明', 'Vue'])
    expect(brief(edgeRelation(tech, impl, null))).toEqual(['my-dev-grid', '使用', 'Vue'])
  })

  it('它應該在同類時看述詞，並在反向述詞時把兩端對調', () => {
    expect(brief(edgeRelation(tech, js, 'requires'))).toEqual(['Vue', '需要', 'JavaScript'])
    expect(brief(edgeRelation(js, tech, 'isRequiredBy'))).toEqual(['Vue', '需要', 'JavaScript'])
    expect(brief(edgeRelation(vue3, tech, 'isVersionOf'))).toEqual(['Vue 3', '版本', 'Vue'])
    expect(brief(edgeRelation(tech, vue3, 'hasVersion'))).toEqual(['Vue 3', '版本', 'Vue'])
  })

  it('它應該在同類而述詞沒對到時標「相關」，照邊原本的方向', () => {
    expect(brief(edgeRelation(tech, js, 'somethingNew'))).toEqual(['Vue', '相關', 'JavaScript'])
    expect(brief(edgeRelation(tech, js, null))).toEqual(['Vue', '相關', 'JavaScript'])
  })
})

describe('edgeRelationText', () => {
  it('它應該把 about 的文章寫成「討論」，不寫成「說明」', () => {
    const article = { domainType: 'documentation' as const, label: 'Vue 入門筆記' }
    expect(edgeRelationText(edgeRelation(tech, article, 'subjectOf'))).toBe(
      'Vue 入門筆記（文件） 討論 → Vue（技術）',
    )
  })

  it('它應該讓「關於」連線標「關於」、主詞一律是實作，不管邊存的方向', () => {
    const brief = (r: ReturnType<typeof edgeRelation>) => [r.subject.label, r.verb, r.object.label]
    // 圖譜 API 回的方向是技術 → 實作（subjectOfProject）
    expect(brief(edgeRelation(tech, impl, 'subjectOfProject'))).toEqual(['my-dev-grid', '關於', 'Vue'])
    expect(brief(edgeRelation(impl, tech, 'projectAbout'))).toEqual(['my-dev-grid', '關於', 'Vue'])
    expect(edgeRelationText(edgeRelation(tech, impl, 'subjectOfProject'))).toBe(
      'my-dev-grid（實作） 關於 → Vue（技術）',
    )
    // 「關於」只認實作與技術兩端；文件連過來對不上就標「相關」
    expect(brief(edgeRelation(doc, tech, 'subjectOfProject'))).toEqual(['Vue 官方文件', '相關', 'Vue'])
  })

  it('它應該將滑過提示的純文字寫成「名稱（類別） 動詞 → 名稱（類別）」', () => {
    expect(edgeRelationText(edgeRelation(tech, impl, 'usedBy'))).toBe(
      'my-dev-grid（實作） 使用 → Vue（技術）',
    )
  })

  it('它應該在同類時看述詞，並以版本那端作為主詞', () => {
    const vue3 = { domainType: 'technique' as const, label: 'Vue 3' }
    expect(edgeRelationText(edgeRelation(tech, vue3, 'hasVersion'))).toBe(
      'Vue 3（技術） 版本 → Vue（技術）',
    )
  })
})

describe('單一節點的類別名稱（文章／官方文件）', () => {
  it('它應該依子類標：post 是文章、sourcesite 與 document 是官方文件，其餘退回類別名「文件」', () => {
    expect(nodeKindLabel({ domainType: 'documentation', subtype: 'post' })).toBe('文章')
    expect(nodeKindLabel({ domainType: 'documentation', subtype: 'sourcesite' })).toBe('官方文件')
    expect(nodeKindLabel({ domainType: 'documentation', subtype: 'document' })).toBe('官方文件')
    expect(nodeKindLabel({ domainType: 'documentation', subtype: null })).toBe('文件')
    expect(nodeKindLabel({ domainType: 'documentation' })).toBe('文件')
    expect(nodeKindLabel({ domainType: 'documentation', subtype: 'conversation' })).toBe('文件')
    // 只有文件類看子類；其他類別不受影響
    expect(nodeKindLabel({ domainType: 'technique', subtype: 'post' })).toBe('技術')
    expect(nodeKindLabel({ domainType: 'implementation', subtype: null })).toBe('實作')
  })

  it('它應該讓純文字版的類別名稱也依子類（滑過提示、小卡）', () => {
    const post = { domainType: 'documentation' as const, label: '一篇文章', subtype: 'post' }
    const site = { domainType: 'documentation' as const, label: 'Vue 官方文件', subtype: 'sourcesite' }

    expect(edgeRelationText(edgeRelation(post, tech, 'about'))).toBe('一篇文章（文章） 討論 → Vue（技術）')
    expect(edgeRelationText(edgeRelation(site, tech, 'specs'))).toBe('Vue 官方文件（官方文件） 說明 → Vue（技術）')
  })
})

describe('routeSegmentVerb', () => {
  const doc1 = { id: 'documentation-1', domainType: 'documentation' as const, label: 'a' }
  const t1 = { id: 'technique-1', domainType: 'technique' as const, label: 'Vue' }
  const i1 = { id: 'implementation-1', domainType: 'implementation' as const, label: 'x' }

  it('它應該在主詞是前一站時用主動、在後一站時用被動，不管邊存的方向', () => {
    expect(routeSegmentVerb(doc1, t1, { source: doc1.id, target: t1.id, predicate: 'about' })).toBe('討論')
    expect(routeSegmentVerb(doc1, t1, { source: t1.id, target: doc1.id, predicate: 'subjectOf' })).toBe('討論')
    expect(routeSegmentVerb(t1, i1, { source: i1.id, target: t1.id, predicate: 'uses' })).toBe('被使用')
    expect(routeSegmentVerb(i1, t1, { source: i1.id, target: t1.id, predicate: 'uses' })).toBe('使用')
    expect(routeSegmentVerb(t1, doc1, { source: doc1.id, target: t1.id, predicate: 'specs' })).toBe('被說明')
  })

  it('它應該讓「關於」連線從實作走是「關於」，從技術走是「是主題」', () => {
    const edge = { source: t1.id, target: i1.id, predicate: 'subjectOfProject' }
    expect(routeSegmentVerb(i1, t1, edge)).toBe('關於')
    expect(routeSegmentVerb(t1, i1, edge)).toBe('是主題')
  })

  it('它應該在不認得的述詞時標「相關」，沒有主被動之分', () => {
    expect(routeSegmentVerb(doc1, t1, { source: doc1.id, target: t1.id, predicate: 'mystery' })).toBe('相關')
    expect(routeSegmentVerb(t1, doc1, { source: doc1.id, target: t1.id, predicate: 'mystery' })).toBe('相關')
  })
})
