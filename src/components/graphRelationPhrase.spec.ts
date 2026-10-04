import { describe, expect, it } from 'vitest'
import { edgeRelation, edgeRelationText, relationFromNode } from './graphRelationPhrase'

const doc = { domainType: 'documentation' as const, label: 'Vue 官方文件' }
const tech = { domainType: 'technique' as const, label: 'Vue' }
const impl = { domainType: 'implementation' as const, label: 'my-dev-grid' }

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

describe('edgeRelationText', () => {
  it('滑過提示的純文字：名稱（類別） 動詞 → 名稱（類別）', () => {
    expect(edgeRelationText(edgeRelation(tech, impl, 'usedBy'))).toBe(
      'my-dev-grid（實作） 使用 → Vue（技術）',
    )
  })

  it('同類看述詞：版本那端是主詞', () => {
    const vue3 = { domainType: 'technique' as const, label: 'Vue 3' }
    expect(edgeRelationText(edgeRelation(tech, vue3, 'hasVersion'))).toBe(
      'Vue 3（技術） 版本 → Vue（技術）',
    )
  })
})
