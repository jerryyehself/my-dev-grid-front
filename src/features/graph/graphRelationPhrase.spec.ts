import { describe, expect, it } from 'vitest'
import { edgeRelation, edgeRelationText, relationFromNode } from './graphRelationPhrase'

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

  it('它應該讓跨類的動詞跟著述詞走：同樣是文件到技術，specs 說明、about 談到', () => {
    const article = { domainType: 'documentation' as const, label: 'Vue 入門筆記' }
    expect(brief(edgeRelation(doc, tech, 'specs'))).toEqual(['Vue 官方文件', '說明', 'Vue'])
    expect(brief(edgeRelation(article, tech, 'about'))).toEqual(['Vue 入門筆記', '談到', 'Vue'])
    // 反向述詞：邊存成技術→文章，主詞仍是文章
    expect(brief(edgeRelation(tech, article, 'subjectOf'))).toEqual(['Vue 入門筆記', '談到', 'Vue'])
    expect(brief(edgeRelation(tech, doc, 'specifiedBy'))).toEqual(['Vue 官方文件', '說明', 'Vue'])
    // 文章談到專案（about 也可以連實作）；documents 才是記錄
    expect(brief(edgeRelation(article, impl, 'about'))).toEqual(['Vue 入門筆記', '談到', 'my-dev-grid'])
    expect(brief(edgeRelation(impl, article, 'subjectOf'))).toEqual(['Vue 入門筆記', '談到', 'my-dev-grid'])
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
  it('它應該把 about 的文章寫成「談到」，不寫成「說明」', () => {
    const article = { domainType: 'documentation' as const, label: 'Vue 入門筆記' }
    expect(edgeRelationText(edgeRelation(tech, article, 'subjectOf'))).toBe(
      'Vue 入門筆記（文件） 談到 → Vue（技術）',
    )
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
