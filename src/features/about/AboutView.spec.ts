import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AboutView from './AboutView.vue'
import { BYLINE } from '@/copy/common'

// CONTACT_EMAIL 是模組層級常數：用 hoisted 的物件讓每個 case 換值，其餘設定照原樣
const config = vi.hoisted(() => ({ email: '' }))
vi.mock('./aboutConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./aboutConfig')>()
  const mocked = { ...actual }
  // 每次讀取都回傳目前的 config.email，case 之間換值不用重新載入模組
  Object.defineProperty(mocked, 'CONTACT_EMAIL', { get: () => config.email, enumerable: true })
  return mocked
})

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

describe('AboutView', () => {
  beforeEach(() => {
    config.email = ''
  })

  it('它應該顯示名字、職涯句與工作模式四張卡片', () => {
    const wrapper = mountAbout()

    expect(wrapper.get('h1').text()).toBe('Jerry Yeh')
    expect(wrapper.text()).toContain('圖書資訊學出身，兩年程式教學、三年後端工程師。')
    expect(wrapper.get('h2').text()).toBe('工作模式與理念')
    expect(wrapper.findAll('h3').map((h) => h.text())).toEqual([
      '跨域整合',
      '需求洞察',
      '實證導向',
      '持續評鑑',
    ])
    wrapper.unmount()
  })

  it('它應該在名字下面顯示共用的署名句，且整頁只出現一次', () => {
    const wrapper = mountAbout()

    expect(BYLINE).toBe('由 Claude 撰寫，Jerry Yeh 發想並審定')
    expect(wrapper.text().split(BYLINE)).toHaveLength(2)
    const byline = wrapper.findAll('p').find((p) => p.text() === BYLINE)!
    expect(byline.element.previousElementSibling?.tagName).toBe('P')
    expect(byline.element.parentElement?.querySelector('h1')).not.toBeNull()
    wrapper.unmount()
  })

  it('它應該在信箱留空時不畫電子郵件按鈕，只留 GitHub', () => {
    const wrapper = mountAbout()

    expect(wrapper.text()).not.toContain('電子郵件')
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false)
    expect(wrapper.find('a[href="https://github.com/jerryyehself"]').text()).toBe('GitHub')
    wrapper.unmount()
  })

  it('它應該在填了信箱後畫出電子郵件按鈕，連到 mailto', () => {
    config.email = 'someone@example.test'
    const wrapper = mountAbout()

    const mail = wrapper.get('a[href^="mailto:"]')
    expect(mail.attributes('href')).toBe('mailto:someone@example.test')
    expect(mail.text()).toBe('電子郵件')
    wrapper.unmount()
  })

  it('它應該只有「需求洞察」卡有「確認詳情」（連到碩士論文），其他三張沒有連結也沒有提示文字', () => {
    const wrapper = mountAbout()

    expect(wrapper.text()).not.toContain('待定')
    expect(wrapper.text()).not.toContain('示意')
    const withLink = wrapper.findAll('li[id^="about-"]').filter((li) => li.text().includes('確認詳情'))
    expect(withLink.map((li) => li.attributes('id'))).toEqual(['about-insight'])
    const a = withLink[0]!.get('a')
    expect(a.attributes('href')).toBe('https://www.airitilibrary.com/Article/Detail/U0002-2307202123134400')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener noreferrer')
    for (const id of ['integration', 'evidence', 'review']) {
      expect(wrapper.get(`#about-${id}`).find('a').exists()).toBe(false)
    }
    wrapper.unmount()
  })

  it('它應該為頁首與四張卡片各畫一張有文字說明的線稿', () => {
    const wrapper = mountAbout()

    const svgs = wrapper.findAll('svg[role="img"]')
    expect(svgs).toHaveLength(5)
    for (const svg of svgs) expect(svg.attributes('aria-label')).toBeTruthy()
    wrapper.unmount()
  })

  it('它應該不出現第一人稱「我」', () => {
    const wrapper = mountAbout()

    expect(visitorText(wrapper)).not.toContain('我')
    wrapper.unmount()
  })
})
