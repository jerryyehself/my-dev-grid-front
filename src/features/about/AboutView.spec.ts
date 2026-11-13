import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AboutView from './AboutView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }],
})

const mountAbout = () => mount(AboutView, { global: { plugins: [router] } })

/** 訪客看得到或讀得到的文字：畫面文字，加上 alt／aria-label／title 這些屬性 */
function visitorText(wrapper: VueWrapper): string {
  const attrs = wrapper
    .findAll('[alt], [aria-label], [title]')
    .flatMap((el) => [el.attributes('alt'), el.attributes('aria-label'), el.attributes('title')])
  return [wrapper.text(), ...attrs].filter(Boolean).join('\n')
}

const switchToBackward = (wrapper: VueWrapper) =>
  wrapper
    .findAll('button')
    .find((b) => b.text() === '從技術看')!
    .trigger('click')

describe('AboutView', () => {
  it('它應該不出現第一人稱「我」，兩個示範方向都一樣', async () => {
    const wrapper = mountAbout()
    expect(visitorText(wrapper)).not.toContain('我')

    await switchToBackward(wrapper)
    expect(visitorText(wrapper)).not.toContain('我')
    wrapper.unmount()
  })

  it('它應該用 Vue 官方文件與 Vue 示範雙向關係，不出現「這篇文章」與「Vue 3」', async () => {
    const wrapper = mountAbout()
    expect(wrapper.text()).toContain('從 Vue 官方文件，找到它說明的技術：Vue。')

    await switchToBackward(wrapper)
    expect(wrapper.text()).toContain('從 Vue 反查，列出說明它的文件和使用它的專案。')

    expect(wrapper.text()).not.toContain('這篇文章')
    expect(wrapper.text()).not.toMatch(/Vue\s*3/)
    wrapper.unmount()
  })

  it('它應該在 COLOPHON 只寫分工，不列 plugin', () => {
    const wrapper = mountAbout()
    expect(wrapper.text()).not.toMatch(/plugin/i)
    expect(wrapper.text()).not.toContain('主 session')
    wrapper.unmount()
  })
})
