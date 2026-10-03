import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import ArticleEditLink from './ArticleEditLink.vue'
import { useAuthStore } from '@/stores/useAuthStore'

// 文章清單、首頁知識網路彈窗、/graph 詳情卡共用的「編輯」連結：訪客看不到，登入後連去編輯頁。

const Stub = { template: '<div />' }

async function mountLink(props: Record<string, unknown> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/articles/:id/edit', name: 'article-editor', component: Stub },
    ],
  })
  router.push('/')
  await router.isReady()
  return mount(ArticleEditLink, {
    props: { articleId: 8, ...props },
    attrs: { class: 'edit-from-caller' },
    global: { plugins: [router] },
  })
}

describe('ArticleEditLink', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('沒登入時什麼都不渲染', async () => {
    const wrapper = await mountLink()
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('登入後連到那篇文章的編輯頁，呼叫端給的 class 落在連結上', async () => {
    useAuthStore().token = 'test-token'
    const wrapper = await mountLink({ label: '編輯這篇', title: 'Vite 筆記' })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/articles/8/edit')
    expect(link.text()).toBe('編輯這篇')
    expect(link.attributes('aria-label')).toBe('編輯 Vite 筆記')
    expect(link.classes()).toContain('edit-from-caller')
  })
})
