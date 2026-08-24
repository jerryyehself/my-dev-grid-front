import { describe, it, expect } from 'vitest'
import { esc, toTsSource } from './sync-projects.mjs'

describe('esc', () => {
  it('跳脫單引號，避免產生的 TS 字串壞掉', () => {
    expect(esc("it's a test")).toBe("it\\'s a test")
  })

  it('跳脫反斜線', () => {
    expect(esc('a\\b')).toBe('a\\\\b')
  })

  it('沒有特殊字元時原樣傳回', () => {
    expect(esc('plain text')).toBe('plain text')
  })
})

describe('toTsSource', () => {
  function fakeRepo(overrides = {}) {
    return {
      name: 'example-repo',
      description: 'an example repo',
      created_at: '2026-03-15T00:00:00Z',
      archived: false,
      topics: [],
      language: 'TypeScript',
      ...overrides,
    }
  }

  it('同一年份的多個專案，id 流水號從 01 遞增', () => {
    const src = toTsSource([
      fakeRepo({ name: 'repo-a', created_at: '2026-01-01T00:00:00Z' }),
      fakeRepo({ name: 'repo-b', created_at: '2026-06-01T00:00:00Z' }),
    ])

    expect(src).toContain("id: 'PROJ-2026-01'")
    expect(src).toContain("id: 'PROJ-2026-02'")
  })

  it('不同年份的專案，各自從 01 起算', () => {
    const src = toTsSource([
      fakeRepo({ name: 'repo-a', created_at: '2025-01-01T00:00:00Z' }),
      fakeRepo({ name: 'repo-b', created_at: '2026-01-01T00:00:00Z' }),
    ])

    expect(src).toContain("id: 'PROJ-2025-01'")
    expect(src).toContain("id: 'PROJ-2026-01'")
  })

  it('有 topics 時優先用 topics 當 tags', () => {
    const src = toTsSource([fakeRepo({ topics: ['vue', 'vite'], language: 'JavaScript' })])

    expect(src).toContain("tags: ['vue', 'vite']")
  })

  it('沒有 topics 但有 language 時，退回用 language 當 tags', () => {
    const src = toTsSource([fakeRepo({ topics: [], language: 'Python' })])

    expect(src).toContain("tags: ['Python']")
  })

  it('topics 跟 language 都沒有時，tags 是空陣列', () => {
    const src = toTsSource([fakeRepo({ topics: [], language: null })])

    expect(src).toContain('tags: []')
  })

  it('archived 為 true 時，status 標成 Archived', () => {
    const src = toTsSource([fakeRepo({ archived: true })])

    expect(src).toContain("status: 'Archived'")
    expect(src).toContain("statusType: 'archived'")
  })

  it('archived 為 false 時，status 標成 Active', () => {
    const src = toTsSource([fakeRepo({ archived: false })])

    expect(src).toContain("status: 'Active'")
    expect(src).toContain("statusType: 'active'")
  })

  it('started 從 created_at 切出 YYYY.MM', () => {
    const src = toTsSource([fakeRepo({ created_at: '2026-03-15T00:00:00Z' })])

    expect(src).toContain("started: '2026.03'")
  })

  it('description 缺漏時 desc 是空字串，不是 undefined 字面值', () => {
    const src = toTsSource([fakeRepo({ description: null })])

    expect(src).toContain("desc: ''")
  })
})
