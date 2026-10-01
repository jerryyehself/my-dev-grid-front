import { describe, expect, it } from 'vitest'
import { relationPhrase } from './graphRelationPhrase'

const doc = { domainType: 'documentation' as const, label: 'Vue 官方文件' }
const tech = { domainType: 'technique' as const, label: 'Vue' }
const impl = { domainType: 'implementation' as const, label: 'my-dev-grid' }

describe('relationPhrase', () => {
  it('文件與技術：文件說明技術', () => {
    expect(relationPhrase(doc, tech)).toEqual({ sentence: '「Vue 官方文件」說明「Vue」', note: null })
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
      sentence: 'Vue 與 JavaScript',
      note: '兩個技術之間的關係',
    })
  })
})
