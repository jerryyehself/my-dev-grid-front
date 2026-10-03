import { describe, expect, it } from 'vitest'
import { edgeRelation, relationFromNode, relationPhrase } from './graphRelationPhrase'

const doc = { domainType: 'documentation' as const, label: 'Vue 官方文件' }
const tech = { domainType: 'technique' as const, label: 'Vue' }
const impl = { domainType: 'implementation' as const, label: 'my-dev-grid' }

describe('relationPhrase', () => {
  it('文件與技術：文件說明技術', () => {
    expect(relationPhrase(doc, tech)).toEqual({
      sentence: '「Vue 官方文件」說明「Vue」',
      note: null,
    })
  })

  it('文件與實作：文件記錄實作', () => {
    expect(relationPhrase(doc, impl).sentence).toBe('「Vue 官方文件」記錄「my-dev-grid」')
  })

  it('技術與實作：技術用在實作', () => {
    expect(relationPhrase(tech, impl).sentence).toBe('「Vue」用在「my-dev-grid」')
  })

  it('句子的方向看類別，不看邊的方向', () => {
    expect(relationPhrase(impl, tech)).toEqual(relationPhrase(tech, impl))
    expect(relationPhrase(tech, doc)).toEqual(relationPhrase(doc, tech))
  })

  it('同類之間不放動詞，補一句是哪一類之間的關係', () => {
    expect(relationPhrase(tech, { domainType: 'technique', label: 'JavaScript' })).toEqual({
      sentence: '「Vue」與「JavaScript」',
      note: '兩個技術之間的關係',
    })
  })
})

describe('relationFromNode', () => {
  it('詳情卡的簡短標示：對方的類別', () => {
    expect(relationFromNode('documentation', false)).toBe('文件')
    expect(relationFromNode('technique', false)).toBe('技術')
    expect(relationFromNode('implementation', false)).toBe('實作')
  })

  it('對方是自己的一個版本時標「版本」', () => {
    expect(relationFromNode('technique', true)).toBe('版本')
  })
})

describe('edgeRelation', () => {
  const js = { domainType: 'technique' as const, label: 'JavaScript' }
  const vue3 = { domainType: 'technique' as const, label: 'Vue 3' }
  const brief = (r: ReturnType<typeof edgeRelation>) => [r.subject.label, r.verb, r.object.label]

  it('跨類看類別、不看邊的方向：實作使用技術、文件說明技術、文件記錄實作', () => {
    expect(brief(edgeRelation(tech, impl, 'usedBy'))).toEqual(['my-dev-grid', '使用', 'Vue'])
    expect(brief(edgeRelation(impl, tech, 'uses'))).toEqual(['my-dev-grid', '使用', 'Vue'])
    expect(brief(edgeRelation(tech, doc, 'specs'))).toEqual(['Vue 官方文件', '說明', 'Vue'])
    expect(brief(edgeRelation(doc, impl, null))).toEqual(['Vue 官方文件', '記錄', 'my-dev-grid'])
  })

  it('同類看述詞，反向述詞把兩端對調', () => {
    expect(brief(edgeRelation(tech, js, 'requires'))).toEqual(['Vue', '需要', 'JavaScript'])
    expect(brief(edgeRelation(js, tech, 'isRequiredBy'))).toEqual(['Vue', '需要', 'JavaScript'])
    expect(brief(edgeRelation(vue3, tech, 'isVersionOf'))).toEqual(['Vue 3', '版本', 'Vue'])
    expect(brief(edgeRelation(tech, vue3, 'hasVersion'))).toEqual(['Vue 3', '版本', 'Vue'])
  })

  it('同類而述詞沒對到：標「相關」，照邊原本的方向', () => {
    expect(brief(edgeRelation(tech, js, 'somethingNew'))).toEqual(['Vue', '相關', 'JavaScript'])
    expect(brief(edgeRelation(tech, js, null))).toEqual(['Vue', '相關', 'JavaScript'])
  })
})
