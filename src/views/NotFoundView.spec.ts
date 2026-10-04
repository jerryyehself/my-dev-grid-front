import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import NotFoundView from './NotFoundView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }],
})

const robotsMeta = () => document.head.querySelector('meta[name="robots"]')

describe('NotFoundView', () => {
  it('說明找不到，並給首頁、文章、專案、圖譜四個出口', () => {
    const wrapper = mount(NotFoundView, { global: { plugins: [router] } })
    expect(wrapper.find('h1').text()).toBe('找不到這個頁面')
    expect(wrapper.findAll('nav a').map((a) => a.attributes('href'))).toEqual([
      '/',
      '/articles',
      '/projects',
      '/graph',
    ])
    wrapper.unmount()
  })

  it('在的時候加 robots noindex，離開就拿掉', () => {
    const wrapper = mount(NotFoundView, { global: { plugins: [router] } })
    expect(robotsMeta()?.getAttribute('content')).toBe('noindex')
    wrapper.unmount()
    expect(robotsMeta()).toBeNull()
  })
})
