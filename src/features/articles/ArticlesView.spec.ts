import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import ArticlesView from './ArticlesView.vue'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ArticleDto } from '@/api/articles'

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
    Promise.resolve({ articles: [article(6, '建置工具問答'), article(7, '首頁設計決策')], loadError: null }),
}))

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

describe('ArticlesView 的摘要', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it.each(['timeline', 'folder'])('它應該在%s排列讓摘要靠左、不兩端對齊（中英混排的字距會被拉開）', async (mode) => {
    const wrapper = await mountView()
    if (mode === 'folder') await wrapper.findAll('button').find((b) => b.text() === '分類夾')!.trigger('click')
    const summaries = wrapper.findAll('article p')

    expect(summaries.length).toBeGreaterThan(0)
    for (const p of summaries) {
      expect(p.classes()).toContain('text-left')
      expect(p.classes().join(' ')).not.toContain('justify')
    }
  })
})

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
    expect(editHrefs(wrapper).sort()).toEqual(['/articles/6/edit', '/articles/7/edit'])
  })
})
