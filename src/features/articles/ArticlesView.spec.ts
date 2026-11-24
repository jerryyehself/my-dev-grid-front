import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import ArticlesView from './ArticlesView.vue'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ArticleDto } from '@/api/articles'
import { loadArticleMindmap } from './mindmap/articleMindmapSource'

// 文章清單每篇的「編輯」只給登入的人看：訪客看到的清單不能多出任何寫入入口（AuthOnly.vue）。

function article(id: number, title: string): ArticleDto {
  return {
    id,
    type: 3,
    title,
    body: `${title} 的內文`,
    status: 1,
    creation_date: '2026-09-20',
    created_at: null,
    updated_at: null,
    scope: null,
    techniques: [],
    implementations: [],
  }
}

vi.mock('@/api/articles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/articles')>()),
  fetchArticlesOrDemo: () =>
    Promise.resolve({
      articles: [article(6, '建置工具問答'), article(7, '首頁設計決策'), article(MINDMAP_ID, '有心智圖的那篇')],
      loadError: null,
    }),
}))

// 有心智圖的文章 id（跟 fixture 一致）；vi.mock 會被提到最上面，所以用 vi.hoisted 先定好
const { MINDMAP_ID } = vi.hoisted(() => ({ MINDMAP_ID: 14 }))

const Stub = { template: '<div />' }

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/articles', name: 'articles', component: Stub },
      { path: '/articles/manage', name: 'article-manage', component: Stub },
      { path: '/articles/:id', name: 'article-detail', component: Stub },
      { path: '/articles/:id/edit', name: 'article-editor', component: Stub },
    ],
  })
  router.push('/articles')
  await router.isReady()
  const wrapper = mount(ArticlesView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

const editHrefs = (wrapper: Awaited<ReturnType<typeof mountView>>) =>
  wrapper.findAll('a').map((a) => a.attributes('href')).filter((h) => h?.endsWith('/edit'))

describe('ArticlesView 的編輯連結', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('它應該在沒登入時照常顯示清單，但沒有任何編輯連結', async () => {
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('建置工具問答')
    expect(editHrefs(wrapper)).toEqual([])
  })

  it('它應該在登入後讓每篇都有一個連到自己編輯頁的「編輯」', async () => {
    useAuthStore().token = 'test-token'
    const wrapper = await mountView()
    expect(editHrefs(wrapper).sort()).toEqual(['/articles/14/edit', '/articles/6/edit', '/articles/7/edit'])
  })
})

describe('ArticlesView 的標題懸停心智圖', () => {
  let canHover = true

  beforeEach(async () => {
    setActivePinia(createPinia())
    canHover = true
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(hover: hover)' ? canHover : false }))
    // 先把心智圖資料與延遲載入的元件載好，觸發後 flushPromises 等得到
    await loadArticleMindmap(MINDMAP_ID)
    await import('./mindmap/ArticleMindmapHoverTip.vue')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  type Wrapper = Awaited<ReturnType<typeof mountView>>
  const titleLink = (wrapper: Wrapper, title: string) => wrapper.findAll('h3 a').find((a) => a.text() === title)!
  const titleText = (wrapper: Wrapper, title: string) => titleLink(wrapper, title).get('span')

  async function settle() {
    await vi.waitFor(async () => {
      await flushPromises()
    })
    await flushPromises()
  }

  it('它應該在游標停在有心智圖的標題文字上時顯示提示框，移開就收起', async () => {
    const wrapper = await mountView()
    await titleText(wrapper, '有心智圖的那篇').trigger('mouseenter')
    await vi.waitFor(async () => {
      await flushPromises()
      expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)
    })
    expect(titleLink(wrapper, '有心智圖的那篇').attributes('aria-describedby')).toBe(
      wrapper.get('[role="tooltip"]').attributes('id'),
    )
    await titleText(wrapper, '有心智圖的那篇').trigger('mouseleave')
    await settle()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
    expect(titleLink(wrapper, '有心智圖的那篇').attributes('aria-describedby')).toBeUndefined()
  })

  it('它應該在游標停在整列其他地方（連結本身、不是文字）時不顯示', async () => {
    const wrapper = await mountView()
    await titleLink(wrapper, '有心智圖的那篇').trigger('mouseenter')
    await settle()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('它應該在沒有心智圖的文章不顯示', async () => {
    const wrapper = await mountView()
    await titleText(wrapper, '首頁設計決策').trigger('mouseenter')
    await settle()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('它應該在沒有懸停能力的裝置（手機）不顯示', async () => {
    canHover = false
    const wrapper = await mountView()
    await titleText(wrapper, '有心智圖的那篇').trigger('mouseenter')
    await settle()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('它應該在鍵盤 Tab 到標題時顯示，離開時收起', async () => {
    const wrapper = await mountView()
    const link = titleLink(wrapper, '有心智圖的那篇')
    vi.spyOn(link.element, 'matches').mockReturnValue(true)
    await link.trigger('focus')
    await vi.waitFor(async () => {
      await flushPromises()
      expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)
    })
    await link.trigger('blur')
    await settle()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('它應該在滑鼠點擊造成的聚焦（不是 :focus-visible）時不顯示', async () => {
    const wrapper = await mountView()
    const link = titleLink(wrapper, '有心智圖的那篇')
    vi.spyOn(link.element, 'matches').mockReturnValue(false)
    await link.trigger('focus')
    await settle()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('它應該在按 Esc 時收起，下一次移入再出現', async () => {
    const wrapper = await mountView()
    const text = titleText(wrapper, '有心智圖的那篇')
    await text.trigger('mouseenter')
    await vi.waitFor(async () => {
      await flushPromises()
      expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await settle()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
    await text.trigger('mouseleave')
    await text.trigger('mouseenter')
    await vi.waitFor(async () => {
      await flushPromises()
      expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)
    })
  })

  it('它應該在分類夾排列時也有同樣的懸停', async () => {
    const wrapper = await mountView()
    await wrapper.findAll('button').find((b) => b.text() === '分類夾')!.trigger('click')
    await titleText(wrapper, '有心智圖的那篇').trigger('mouseenter')
    await vi.waitFor(async () => {
      await flushPromises()
      expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)
    })
  })
})
