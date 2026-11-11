import { describe, it, expect } from 'vitest'
import type { Project } from '@/api/projects'
import { groupProjectsByYear, yearOf } from './groupProjectsByYear'

const project = (id: string, started: string): Project => ({
  id,
  title: `p${id}`,
  desc: '',
  tags: [],
  started,
  repo: `p${id}`,
})

describe('yearOf', () => {
  it.each([
    ['2024.11', '2024'],
    ['1999.01', '1999'],
    ['', ''],
    ['24.11', ''],
    ['abcd.11', ''],
  ])('它應該從開始日期 %j 取出年份 %j', (started, year) => {
    expect(yearOf(started)).toBe(year)
  })
})

describe('groupProjectsByYear', () => {
  it('它應該依開始年份分組，組與組內的順序照傳入的順序', () => {
    const groups = groupProjectsByYear([project('1', '2026.10'), project('2', '2026.06'), project('3', '2024.11')])

    expect(groups.map((g) => [g.year, g.projects.map((p) => p.id)])).toEqual([
      ['2026', ['1', '2']],
      ['2024', ['3']],
    ])
  })

  it('它應該把不相鄰的同一年歸進同一組，不重複出現標頭', () => {
    const groups = groupProjectsByYear([project('1', '2026.10'), project('2', '2025.01'), project('3', '2026.01')])

    expect(groups.map((g) => g.year)).toEqual(['2026', '2025'])
    expect(groups[0]!.projects.map((p) => p.id)).toEqual(['1', '3'])
  })

  it('它應該把沒有開始日期的專案放進年份是空字串的一組', () => {
    const groups = groupProjectsByYear([project('1', '2026.10'), project('2', '')])

    expect(groups.map((g) => g.year)).toEqual(['2026', ''])
  })

  it('它應該在沒有專案時回傳空陣列', () => {
    expect(groupProjectsByYear([])).toEqual([])
  })
})
