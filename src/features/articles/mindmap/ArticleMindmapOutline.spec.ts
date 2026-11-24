import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import fixture from './articleMindmapFixture.json'
import type { ArticleMindmap } from './articleMindmapTypes'
import ArticleMindmapOutline from './ArticleMindmapOutline.vue'
import { extractHeadings } from '@/components/markdown/headings'
import productionBody from './articleMindmapFixtureBody.md?raw'

const mindmap = fixture as ArticleMindmap
// 內文標題：正式環境那篇的快照
const headings = extractHeadings(productionBody)

function mountOutline(props: Partial<{ expanded: Set<string>; showLinks: boolean }> = {}) {
  const Stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/graph', name: 'graph', component: Stub },
    ],
  })
  return mount(ArticleMindmapOutline, {
    props: { mindmap, headings, expanded: new Set<string>(), showLinks: false, ...props },
    global: { plugins: [router] },
  })
}

const branchButton = (wrapper: ReturnType<typeof mountOutline>, label: string) =>
  wrapper.findAll('button[aria-expanded]').find((b) => b.text().startsWith(label))!

describe('ArticleMindmapOutline', () => {
  it('它應該預設只露出中心與分枝，分枝收合、寫出主要與次要各幾個', () => {
    const wrapper = mountOutline()
    expect(wrapper.text()).toContain('知識視覺化')
    expect(wrapper.text()).toContain('文章主題')
    const b = branchButton(wrapper, '候選圖形類型')
    expect(b.attributes('aria-expanded')).toBe('false')
    expect(b.text()).toContain('1 個，次要 4')
    expect(wrapper.text()).not.toContain('節點-連結圖')
  })

  it('它應該在點分枝時展開它的主要概念，次要仍收合並留一顆「＋N 次要」', async () => {
    const wrapper = mountOutline()
    await branchButton(wrapper, '候選圖形類型').trigger('click')
    expect(wrapper.text()).toContain('節點-連結圖')
    expect(wrapper.text()).not.toContain('格狀熱度圖')
    expect(wrapper.text()).toContain('＋4 次要')
  })

  it('它應該在點「＋N 次要」時通知外層展開那個分枝', async () => {
    const wrapper = mountOutline()
    await branchButton(wrapper, '候選圖形類型').trigger('click')
    const chip = wrapper.findAll('button').find((b) => b.text() === '＋4 次要')!
    await chip.trigger('click')
    expect(wrapper.emitted('toggleSecondaries')).toEqual([['n3']])
  })

  it('它應該在外層展開次要時畫出次要概念', async () => {
    const wrapper = mountOutline({ expanded: new Set(['n3']) })
    await branchButton(wrapper, '候選圖形類型').trigger('click')
    expect(wrapper.text()).toContain('格狀熱度圖')
    expect(wrapper.text()).toContain('－ 收合次要')
  })

  it('它應該在點詞時原地展開出處，連到內文錨點', async () => {
    const wrapper = mountOutline()
    await branchButton(wrapper, '目前結論').trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'force-graph')!.trigger('click')
    expect(wrapper.findAll('a[href^="#"]').map((a) => a.attributes('href'))).toEqual([
      '#採用的設計',
      '#繪製方式',
      '#結論',
      '#參考文獻',
    ])
    // 不另外寫「點一下跳過去」
    expect(wrapper.text()).not.toContain('跳過去')
  })

  it('它應該不放任何連到圖譜的按鈕，有 res_id 的詞也一樣（圖譜頁的行為要先改）', async () => {
    const wrapper = mountOutline()
    await branchButton(wrapper, '目前結論').trigger('click')
    expect(wrapper.text()).toContain('force-graph')
    expect(wrapper.find('a[href="/graph"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('↗')
  })

  it('它應該在橫向關係打開時在詞底下寫出關係，關著時不寫', async () => {
    const off = mountOutline()
    await branchButton(off, '目前結論').trigger('click')
    expect(off.text()).not.toContain('實現「節點-連結圖」')

    const on = mountOutline({ showLinks: true })
    await branchButton(on, '目前結論').trigger('click')
    expect(on.text()).toContain('實現「節點-連結圖」')
    expect(on.text()).toContain('常和「degree 驅動大小」一起出現')
  })
})
