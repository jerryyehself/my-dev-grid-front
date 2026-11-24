import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import fixture from './articleMindmapFixture.json'
import ArticleMindmapHoverTip from './ArticleMindmapHoverTip.vue'
import { loadArticleMindmap } from './articleMindmapSource'
import { STICKY_TOP_PX } from '@/layouts/stickyOffset'

/** 標題元素：jsdom 沒有排版，位置自己給 */
function anchorAt(viewportTop: number, offsetTop = 200, height = 24): HTMLElement {
  const el = document.createElement('h3')
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: viewportTop } as DOMRect)
  Object.defineProperty(el, 'offsetTop', { value: offsetTop })
  Object.defineProperty(el, 'offsetHeight', { value: height })
  return el
}

async function mountTip(anchor: HTMLElement, articleId = fixture.article_id) {
  const wrapper = mount(ArticleMindmapHoverTip, { props: { articleId, anchor, tipId: 'tip-1' } })
  await flushPromises()
  return wrapper
}

beforeAll(async () => {
  await loadArticleMindmap(fixture.article_id)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ArticleMindmapHoverTip', () => {
  it('它應該畫出只有主要概念的心智圖，沒有橫向線', async () => {
    const wrapper = await mountTip(anchorAt(800))
    const tip = wrapper.get('[role="tooltip"]')
    expect(tip.attributes('id')).toBe('tip-1')
    expect(tip.get('svg').attributes('role')).toBe('img')
    expect(tip.get('svg').attributes('aria-label')).toBe('文章心智圖：知識視覺化')
    expect(tip.text()).toContain('節點-連結圖')
    expect(tip.text()).not.toContain('格狀熱度圖')
    expect(tip.find('[data-testid="mindmap-cross-link"]').exists()).toBe(false)
    expect(tip.find('[role="button"]').exists()).toBe(false)
    expect(tip.text()).not.toContain('↗')
  })

  it('它應該預設往上展開：框的下緣在標題上方 6px', async () => {
    const wrapper = await mountTip(anchorAt(800, 500))
    const tip = wrapper.get('[role="tooltip"]')
    expect(tip.attributes('data-placement')).toBe('above')
    const height = Number(tip.get('svg').attributes('height')) + 2
    expect(tip.attributes('style')).toContain(`top: ${500 - 6 - height}px`)
  })

  it('它應該在往上會被視窗頂端（含導覽列）擋住時改往下', async () => {
    const wrapper = await mountTip(anchorAt(STICKY_TOP_PX + 100, 500, 24))
    const tip = wrapper.get('[role="tooltip"]')
    expect(tip.attributes('data-placement')).toBe('below')
    expect(tip.attributes('style')).toContain(`top: ${500 + 24 + 6}px`)
  })

  it('它應該在剛好放得下時往上（邊界）', async () => {
    const probe = await mountTip(anchorAt(2000))
    const height = Number(probe.get('svg').attributes('height')) + 2
    const exact = await mountTip(anchorAt(STICKY_TOP_PX + height + 6))
    expect(exact.get('[role="tooltip"]').attributes('data-placement')).toBe('above')
    const short = await mountTip(anchorAt(STICKY_TOP_PX + height + 5))
    expect(short.get('[role="tooltip"]').attributes('data-placement')).toBe('below')
  })

  it('它應該在 640px 寬、手機寬度藏起來、指標穿透', async () => {
    const wrapper = await mountTip(anchorAt(800))
    const tip = wrapper.get('[role="tooltip"]')
    expect(tip.attributes('style')).toContain('width: 640px')
    expect(tip.classes()).toEqual(expect.arrayContaining(['hidden', 'md:block', 'pointer-events-none']))
  })

  it('它應該在文章沒有心智圖時什麼都不畫', async () => {
    const wrapper = await mountTip(anchorAt(800), fixture.article_id + 1)
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })
})
