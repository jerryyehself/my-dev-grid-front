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
    const sidebar = wrapper.find('.min-\\[1240px\\]\\:sticky')

    expect((sidebar.element as HTMLElement).style.top).toBe(`${STICKY_TOP_PX}px`)
  })

  it('它應該把註腳渲染成註釋清單，並收起的目錄（窄螢幕用）與左欄目錄指向同一組標題', async () => {
    fetchArticleOrDemo.mockResolvedValue({
      article: article(4, 'D 有註腳', '2026-08-01', '## 小節\n\n內文[^1]\n\n[^1]: 註釋內容'),
      loadError: null,
    })
    const wrapper = await mountAt(4)

    expect(wrapper.find('section h3').text()).toBe('註釋')
    expect(wrapper.find('button[data-fn-number="1"]').exists()).toBe(true)
    // 目錄有兩份：≥1240px 的左欄、較窄時正文上方的 <details>；內容必須一樣
    const hrefs = (root: ReturnType<typeof wrapper.findAll>) => root.map((a) => a.attributes('href'))
    expect(hrefs(wrapper.findAll('details a'))).toEqual(['#小節'])
    expect(hrefs(wrapper.findAll('.min-\\[1240px\\]\\:sticky a'))).toEqual(['#小節'])
    expect(wrapper.find('details summary').text()).toContain('1 節')
  })

  describe('版面順序（DOM 順序要等於畫面順序）', () => {
    const withProjects = (id: number) => ({
      ...article(id, 'E 有專案', '2026-08-02', '## 小節\n\n內文'),
      implementations: [{ id: 7, title: '專案甲', relation_id: 1 }],
    })
    const before = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

    it('它應該讓左欄（目錄、相關專案）在正文前面，正文在窄版的相關專案前面', async () => {
      fetchArticleOrDemo.mockResolvedValue({ article: withProjects(5), loadError: null })
      const wrapper = await mountAt(5)
      const root = wrapper.element as HTMLElement
      const left = root.querySelector('.min-\\[1240px\\]\\:sticky')!
      const body = root.querySelector('.markdown-body')!
      const narrowRelated = root.querySelector('.min-\\[1240px\\]\\:hidden:not(details)')!

      // 目錄連結（≥1240px 時鍵盤焦點會經過）在正文的第一個可聚焦元素前面
      expect(before(left.querySelector('a')!, body)).toBe(true)
      expect(left.textContent).toContain('Related Projects')
      expect(before(body, narrowRelated)).toBe(true)
      expect(narrowRelated.textContent).toContain('專案甲')
      // 左欄不再用 order 換位置
      expect(left.className).not.toContain('order-first')
    })

    it('它應該讓左欄只在 ≥1240px 顯示、窄版的相關專案只在 <1240px 顯示，兩邊的斷點沒有縫隙也不重疊', async () => {
      fetchArticleOrDemo.mockResolvedValue({ article: withProjects(5), loadError: null })
      const wrapper = await mountAt(5)
      const root = wrapper.element as HTMLElement
      const left = root.querySelector('.min-\\[1240px\\]\\:sticky')!
      const narrowRelated = root.querySelector('.min-\\[1240px\\]\\:hidden:not(details)')!

      // 同一個 1240：左欄在 <1240 隱藏（max-[1240px] 編成 width < 1240px，1240 本身不隱藏），
      // 窄版相關專案在 ≥1240 隱藏（min-[1240px] 編成 width >= 1240px）
      expect(left.classList.contains('max-[1240px]:hidden')).toBe(true)
      expect(narrowRelated.classList.contains('min-[1240px]:hidden')).toBe(true)
      // 不能殘留 1239 這種差一的斷點（width < 1239px 會在 1239 留一像素的縫）
      expect(root.querySelectorAll('[class*="1239"]')).toHaveLength(0)
    })

    it('它應該在沒有相關專案時兩處都不畫相關專案', async () => {
      fetchArticleOrDemo.mockResolvedValue({ article: LIST[2], loadError: null })
      const wrapper = await mountAt(3)
      expect(wrapper.text()).not.toContain('Related Projects')
    })
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
})
