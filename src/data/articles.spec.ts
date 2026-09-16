import { describe, it, expect } from 'vitest'
import { articles } from '@/data/articles'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

const proc = unified().use(remarkParse).use(remarkGfm)

describe('假資料的 Markdown 內文', () => {
  it('每篇都有 body 而且 parse 得出結構', () => {
    for (const a of articles) {
      expect(a.body, a.id).toBeTruthy()
      const tree = proc.parse(a.body) as { children: { type: string }[] }
      const types = new Set(tree.children.map((c) => c.type))
      console.log(a.id, '→', [...types].join(', '))
      expect(types.has('heading'), a.id).toBe(true)
    }
  })

  it('整批合起來有涵蓋到 walker 支援的節點型別', () => {
    const seen = new Set<string>()
    const walk = (n: { type: string; children?: unknown[] }) => {
      seen.add(n.type)
      ;((n.children ?? []) as { type: string; children?: unknown[] }[]).forEach(walk)
    }
    for (const a of articles) walk(proc.parse(a.body) as never)
    console.log('涵蓋到的節點型別:', [...seen].sort().join(', '))
    for (const t of ['heading', 'paragraph', 'list', 'listItem', 'code', 'inlineCode', 'strong', 'link', 'table', 'blockquote']) {
      expect(seen.has(t), `缺少 ${t}`).toBe(true)
    }
  })

  it('站內連結指向真的存在的路由', () => {
    const routes = ['/', '/about', '/projects', '/articles', '/articles/manage', '/graph']
    const internal: string[] = []
    const walk = (n: { type: string; url?: string; children?: unknown[] }) => {
      if (n.type === 'link' && n.url?.startsWith('/')) internal.push(n.url)
      ;((n.children ?? []) as never[]).forEach(walk)
    }
    for (const a of articles) walk(proc.parse(a.body) as never)
    console.log('站內連結:', internal.join(', '))
    expect(internal.length).toBeGreaterThan(0)
    for (const u of internal) {
      expect(routes.includes(u) || u.startsWith('/articles/'), `${u} 不是既有路由`).toBe(true)
    }
  })
})
