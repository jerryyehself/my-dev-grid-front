import { describe, expect, it } from 'vitest'
import { relationFromNode, relationPhrase, reverseRelationSentence } from './graphRelationPhrase'

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
  it('從技術看出去：說明它的文件、用到它的實作、相關的技術', () => {
    expect(relationFromNode('technique', 'documentation')).toBe('說明它的文件')
    expect(relationFromNode('technique', 'implementation')).toBe('用到它的實作')
    expect(relationFromNode('technique', 'technique')).toBe('相關的技術')
  })

  it('從文件、實作看出去，動詞跟 relationPhrase 的三個一致', () => {
    expect(relationFromNode('documentation', 'technique')).toBe('說明的技術')
    expect(relationFromNode('documentation', 'implementation')).toBe('記錄的實作')
    expect(relationFromNode('implementation', 'documentation')).toBe('記錄它的文件')
    expect(relationFromNode('implementation', 'technique')).toBe('用到的技術')
  })
})

describe('reverseRelationSentence', () => {
  it('技術用在實作，反過來是實作用到技術；兩端順序不影響', () => {
    expect(reverseRelationSentence(tech, impl)).toBe('「my-dev-grid」用到「Vue」')
    expect(reverseRelationSentence(impl, tech)).toBe('「my-dev-grid」用到「Vue」')
  })

  it('說明、記錄、同類之間反過來不自然，不給', () => {
    expect(reverseRelationSentence(doc, tech)).toBeNull()
    expect(reverseRelationSentence(doc, impl)).toBeNull()
    expect(
      reverseRelationSentence(tech, { domainType: 'technique', label: 'JavaScript' }),
    ).toBeNull()
  })
})
