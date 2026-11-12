import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import ArticleDetailView from './ArticleDetailView.vue'
import { STICKY_TOP_PX } from '@/layouts/stickyOffset'
import { ApiHttpError } from '@/api/client'
import type { ArticleDto } from '@/api/articles'

function article(id: number, title: string, creationDate: string, body = `${title} 的內文`): ArticleDto {
  return {
    id,
    type: 3,
    title,
    body,
    status: 1,
    creation_date: creationDate,
    created_at: null,
    updated_at: null,
    scope: null,
    techniques: [],
    implementations: [],
  }
}

// API 依 title 排序回傳，順序跟日期不一致：日期由新到舊應該是 B（11 月）、C（10 月）、A（9 月）
const LIST = [
  article(1, 'A 舊文', '2026-09-01'),
  article(2, 'B 新文', '2026-11-01'),
  article(3, 'C 中間', '2026-10-01', '## 小節\n\n內文'),
]

const fetchArticleOrDemo = vi.fn()
vi.mock('@/api/articles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/articles')>()),
  fetchArticleOrDemo: (id: number) => fetchArticleOrDemo(id),
  fetchArticlesOrDemo: () => Promise.resolve({ articles: LIST, loadError: null }),
}))

const Stub = { template: '<div />' }

async function mountAt(id: number) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/articles', name: 'articles', component: Stub },
      { path: '/articles/:id', name: 'article-detail', component: ArticleDetailView },
      { path: '/articles/:id/edit', name: 'article-editor', component: Stub },
    ],
  })
  router.push(`/articles/${id}`)
  await router.isReady()
  const wrapper = mount(ArticleDetailView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('ArticleDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchArticleOrDemo.mockReset()
  })

  it('它應該讓上一篇／下一篇跟文章列表一樣依日期由新到舊排列', async () => {
    fetchArticleOrDemo.mockResolvedValue({ article: LIST[2], loadError: null })
    const wrapper = await mountAt(3)
    const prev = wrapper.findAll('a').find((a) => a.text().includes('PREV'))!
    const next = wrapper.findAll('a').find((a) => a.text().includes('NEXT'))!

    // 列表順序 B、C、A：C 的上一篇是 B（較新），下一篇是 A（較舊）
    expect(prev.attributes('href')).toBe('/articles/2')
    expect(next.attributes('href')).toBe('/articles/1')
  })

  it('它應該讓邊欄用共用的 STICKY_TOP_PX 當 sticky 的 top', async () => {
    fetchArticleOrDemo.mockResolvedValue({ article: LIST[2], loadError: null })
    const wrapper = await mountAt(3)
    const sidebar = wrapper.find('.lg\\:sticky')

    expect((sidebar.element as HTMLElement).style.top).toBe(`${STICKY_TOP_PX}px`)
  })

  it('它應該讓日期不再套用 opacity-60', async () => {
    fetchArticleOrDemo.mockResolvedValue({ article: LIST[2], loadError: null })
    const wrapper = await mountAt(3)
    const date = wrapper.findAll('span').find((s) => s.text() === '2026-10-01')!

    expect(date.classes()).not.toContain('opacity-60')
  })

  it('它應該在找不到文章時顯示訊息，並附上回文章列表的連結', async () => {
    fetchArticleOrDemo.mockRejectedValue(new ApiHttpError(404, '/api/documentations/999'))
    const wrapper = await mountAt(999)

    expect(wrapper.text()).toContain('找不到這篇文章')
    expect(wrapper.find('a[href="/articles"]').exists()).toBe(true)
  })

  it('它應該只在內文顯示第一段一次，標題下面不再重複', async () => {
    const body = '這是第一段摘要。\n\n## 小節\n\n後面的內容'
    fetchArticleOrDemo.mockResolvedValue({ article: { ...LIST[2], body }, loadError: null })
    const wrapper = await mountAt(3)

    expect(wrapper.text().split('這是第一段摘要。')).toHaveLength(2)
  })
})
