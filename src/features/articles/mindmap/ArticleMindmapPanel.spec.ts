import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import fixture from './articleMindmapFixture.json'
import type { ArticleMindmap, MindmapNode } from './articleMindmapTypes'
import ArticleMindmapPanel from './ArticleMindmapPanel.vue'
import * as source from './articleMindmapSource'
import { extractHeadings } from '@/components/markdown/headings'
import productionBody from './data/articleMindmap14Body.md?raw'
import { FINE_POINTER_QUERY } from './useFinePointer'

// 內文標題：正式環境那篇的快照，slug 跟文章頁算出來的一樣
const headings = extractHeadings(productionBody)

function makeRouter() {
  const Stub = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/graph', name: 'graph', component: Stub },
    ],
  })
}

async function mountPanel(articleId = fixture.article_id) {
  // 先把 fixture 的動態 import 載好，掛上去後一次 flushPromises 就等得到資料
  await source.loadArticleMindmap(articleId)
  const router = makeRouter()
  const wrapper = mount(ArticleMindmapPanel, {
    props: { articleId, headings },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

const svgText = (wrapper: Awaited<ReturnType<typeof mountPanel>>) => wrapper.find('svg[role="group"]').text()

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('ArticleMindmapPanel', () => {
  it('它應該在文章沒有心智圖時什麼都不畫，連標題都沒有', async () => {
    const wrapper = await mountPanel(fixture.article_id + 1)
    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('它應該在資料載入失敗或不合格式時什麼都不畫', async () => {
    vi.spyOn(source, 'loadArticleMindmap').mockResolvedValue(null)
    const wrapper = await mountPanel()
    expect(wrapper.find('section').exists()).toBe(false)
  })

  const switchNamed = (wrapper: Awaited<ReturnType<typeof mountPanel>>, name: string) =>
    wrapper.findAll('[role="switch"]').find((s) => s.text() === name)!

  it('它應該畫出標題、兩個開關與桌機圖，預設次要收合、橫向關係關', async () => {
    const wrapper = await mountPanel()
    // 跟內文的段落標題同一級（h3），不能是 h2，不然整篇的段落會掛在它底下
    expect(wrapper.get('h3').text()).toBe('文章心智圖')
    expect(wrapper.find('h2').exists()).toBe(false)
    // 兩個都是開關（同一種控制項），預設都關
    expect(wrapper.findAll('[role="switch"]').map((s) => [s.text(), s.attributes('aria-checked')])).toEqual([
      ['次要概念', 'false'],
      ['橫向關係', 'false'],
    ])
    const text = svgText(wrapper)
    expect(text).toContain('節點-連結圖')
    expect(text).toContain('＋4 次要')
    expect(text).not.toContain('格狀熱度圖')
    expect(wrapper.findAll('[data-testid="mindmap-cross-link"]')).toHaveLength(0)
  })

  it('它應該在橫向關係關著時不畫說明列（沒有內容）', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).not.toContain('點詞跳到文章段落')
    expect(wrapper.text()).not.toContain('只是常一起出現')
    expect(wrapper.find('.border-t').exists()).toBe(false)
  })

  it('它應該在點「＋N 次要」時只展開那個分枝', async () => {
    const wrapper = await mountPanel()
    const chip = wrapper.get('[data-node-id="chip:n3"]')
    expect(chip.attributes('aria-expanded')).toBe('false')
    await chip.trigger('click')
    const text = svgText(wrapper)
    expect(text).toContain('格狀熱度圖')
    expect(text).toContain('－ 收合次要')
    expect(text).not.toContain('資料缺口') // 背景的次要仍收合
    expect(wrapper.get('[data-node-id="chip:n3"]').attributes('aria-expanded')).toBe('true')
    // 只展開一個分枝，「次要概念」開關仍是關
    expect(switchNamed(wrapper, '次要概念').attributes('aria-checked')).toBe('false')
  })

  it('它應該用鍵盤（Enter）也能展開「＋N 次要」', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[data-node-id="chip:n1"]').trigger('keydown', { key: 'Enter' })
    expect(svgText(wrapper)).toContain('資料缺口')
  })

  it('它應該用「次要概念」開關全部展開、再全部收合', async () => {
    const wrapper = await mountPanel()
    await switchNamed(wrapper, '次要概念').trigger('click')
    expect(switchNamed(wrapper, '次要概念').attributes('aria-checked')).toBe('true')
    const text = svgText(wrapper)
    for (const label of ['資料缺口', '格狀熱度圖', '漸進揭露', '虛線潛在關聯']) expect(text).toContain(label)
    await switchNamed(wrapper, '次要概念').trigger('click')
    expect(switchNamed(wrapper, '次要概念').attributes('aria-checked')).toBe('false')
    expect(svgText(wrapper)).not.toContain('格狀熱度圖')
  })

  it('它應該在每個分枝都用「＋N 次要」展開後，讓「次要概念」開關顯示成開', async () => {
    const wrapper = await mountPanel()
    for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) await wrapper.get(`[data-node-id="chip:${id}"]`).trigger('click')
    expect(switchNamed(wrapper, '次要概念').attributes('aria-checked')).toBe('true')
  })

  it('它應該在打開橫向關係後畫出兩端都看得到的線，說明列寫出線的畫法與另有幾條連到收合的詞', async () => {
    const wrapper = await mountPanel()
    await switchNamed(wrapper, '橫向關係').trigger('click')
    expect(wrapper.findAll('[data-testid="mindmap-cross-link"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('另有 4 條連到收合的詞')
    // 有類型（實線）與只是常一起出現（虛線）都有
    expect(wrapper.text()).toContain('有類型的橫向關係')
    expect(wrapper.text()).toContain('只是常一起出現')
    expect(wrapper.text()).not.toContain('點詞跳到文章段落')
  })

  it('它應該在點詞時打開出處的彈出框，段落照文章順序連到內文錨點', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[data-node-id="n24"][role="button"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-label')).toBe('force-graph')
    const hrefs = dialog.findAll('a[href^="#"]').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['#採用的設計', '#繪製方式', '#結論', '#參考文獻'])
    // 不另外寫「點一下跳過去」
    expect(dialog.text()).not.toContain('跳過去')
    expect(document.activeElement).toBe(dialog.element)
  })

  it('它應該在任何地方都不放連到圖譜的連結或 ↗（圖譜頁的行為要先改）', async () => {
    const wrapper = await mountPanel()
    await switchNamed(wrapper, '橫向關係').trigger('click')
    // force-graph 有 res_id
    await wrapper.get('[data-node-id="n24"][role="button"]').trigger('click')
    expect(wrapper.find('a[href="/graph"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('↗')
    expect(wrapper.text()).not.toContain('圖譜')
  })

  it('它應該在按 Esc 時關掉彈出框，焦點回到那個詞', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[data-node-id="n24"][role="button"]').trigger('click')
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement?.getAttribute('data-node-id')).toBe('n24')
  })

  it('它應該在點彈出框外面時關掉，點裡面不關', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[data-node-id="n24"][role="button"]').trigger('click')
    wrapper.get('[role="dialog"]').element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('它應該讓改寫後的內文沒談到的詞（先查證再動工）只是文字，不能點', async () => {
    const wrapper = await mountPanel()
    expect(svgText(wrapper)).toContain('先查證再動工')
    expect(wrapper.find('[data-node-id="n9"][role="button"]').exists()).toBe(false)
    expect(wrapper.find('[data-node-id="n9"]').exists()).toBe(true)
  })

  it('它應該讓對不上內文段落的詞都不能點，有 res_id 也一樣', async () => {
    const router = makeRouter()
    const wrapper = mount(ArticleMindmapPanel, {
      props: { articleId: fixture.article_id, headings: [] },
      global: { plugins: [router] },
    })
    await flushPromises()
    // 沒有任何標題：沒有一個詞可以點，只剩「＋N 次要」
    const buttons = wrapper.findAll('g[role="button"]').map((g) => g.attributes('data-node-id'))
    expect(buttons.filter((id) => !id?.startsWith('chip:'))).toEqual([])
  })

  it('它應該在換文章時丟掉晚回來的舊結果', async () => {
    let resolveOld: (v: null) => void = () => {}
    const spy = vi
      .spyOn(source, 'loadArticleMindmap')
      .mockImplementationOnce(() => new Promise((r) => (resolveOld = r)))
      .mockImplementationOnce(() => Promise.resolve(null))
    const router = makeRouter()
    const wrapper = mount(ArticleMindmapPanel, {
      props: { articleId: fixture.article_id, headings },
      global: { plugins: [router] },
    })
    await wrapper.setProps({ articleId: fixture.article_id + 1 })
    await flushPromises()
    resolveOld(null)
    await flushPromises()
    expect(spy).toHaveBeenCalledTimes(2)
    expect(wrapper.find('section').exists()).toBe(false)
  })
})

describe('ArticleMindmapPanel 有本身是次要的分枝時', () => {
  const node = (id: string, parent: string, strength: 'primary' | 'secondary', label: string): MindmapNode => ({
    id,
    parent,
    label,
    res_id: null,
    strength,
    weight: 1,
    units: [],
  })
  /** fixture 加上次要分枝 n30（底下一個主要、一個次要概念）；`withSecondaryChild` 為 false 時 n30 底下只有主要概念 */
  function withSecondaryBranch(withSecondaryChild: boolean): ArticleMindmap {
    const data = structuredClone(fixture) as unknown as ArticleMindmap
    data.nodes.push(node('n30', 'n0', 'secondary', '次要分枝'), node('n31', 'n30', 'primary', '分枝裡的主要詞'))
    if (withSecondaryChild) data.nodes.push(node('n32', 'n30', 'secondary', '分枝裡的次要詞'))
    return data
  }
  async function mountWith(data: ArticleMindmap) {
    vi.spyOn(source, 'loadArticleMindmap').mockResolvedValue(data)
    return mountPanel()
  }
  const switchNamed = (wrapper: Awaited<ReturnType<typeof mountPanel>>, name: string) =>
    wrapper.findAll('[role="switch"]').find((s) => s.text() === name)!

  it('它應該在收合次要分枝自己的次要概念時，分枝仍留在圖上（不跟著中心一起藏起來）', async () => {
    const wrapper = await mountWith(withSecondaryBranch(true))
    expect(svgText(wrapper)).not.toContain('次要分枝')
    await switchNamed(wrapper, '次要概念').trigger('click')
    expect(svgText(wrapper)).toContain('次要分枝')
    expect(svgText(wrapper)).toContain('分枝裡的次要詞')
    await wrapper.get('[data-node-id="chip:n30"]').trigger('click')
    // 只收合那個分枝的次要概念；分枝本身與其他分枝的次要概念都還在
    expect(svgText(wrapper)).toContain('次要分枝')
    expect(svgText(wrapper)).not.toContain('分枝裡的次要詞')
    expect(svgText(wrapper)).toContain('格狀熱度圖')
    // 不是每個次要概念都露出來了，開關顯示關
    expect(switchNamed(wrapper, '次要概念').attributes('aria-checked')).toBe('false')
  })

  it('它應該在收合分枝後，焦點所在的收合鈕還在（不會掉到 body）', async () => {
    const wrapper = await mountWith(withSecondaryBranch(true))
    await switchNamed(wrapper, '次要概念').trigger('click')
    await wrapper.get('[data-node-id="chip:n30"]').trigger('click')
    expect(wrapper.find('[data-node-id="chip:n30"]').exists()).toBe(true)
  })

  it('它應該在次要分枝還藏著時，即使每個分枝的次要概念都逐一展開了，開關也顯示關', async () => {
    // n30 在這個 mindmap 裡是只有主要概念的次要分枝：不會有「＋N 次要」，所以只能靠開關露出來
    const wrapper = await mountWith(withSecondaryBranch(false))
    for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) await wrapper.get(`[data-node-id="chip:${id}"]`).trigger('click')
    expect(svgText(wrapper)).not.toContain('次要分枝')
    expect(switchNamed(wrapper, '次要概念').attributes('aria-checked')).toBe('false')
    // 開關打開之後才露出來，開關顯示開
    await switchNamed(wrapper, '次要概念').trigger('click')
    expect(svgText(wrapper)).toContain('次要分枝')
    expect(switchNamed(wrapper, '次要概念').attributes('aria-checked')).toBe('true')
    // 再關：全部收合、次要分枝也藏起來
    await switchNamed(wrapper, '次要概念').trigger('click')
    expect(svgText(wrapper)).not.toContain('次要分枝')
    expect(switchNamed(wrapper, '次要概念').attributes('aria-checked')).toBe('false')
  })

  it('它應該在大綱樹（觸控裝置）收合次要分枝自己的次要概念時，分枝仍在', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }))
    try {
      const wrapper = await mountWith(withSecondaryBranch(true))
      await switchNamed(wrapper, '次要概念').trigger('click')
      const branchButton = wrapper.findAll('button[aria-expanded]').find((b) => b.text().startsWith('次要分枝'))!
      await branchButton.trigger('click')
      await wrapper.findAll('button').find((b) => b.text() === '－ 收合次要' && b.attributes('aria-label')?.endsWith('次要分枝'))!.trigger('click')
      expect(wrapper.findAll('button[aria-expanded]').some((b) => b.text().startsWith('次要分枝'))).toBe(true)
      expect(switchNamed(wrapper, '次要概念').attributes('aria-checked')).toBe('false')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('ArticleMindmapPanel 依裝置選圖或大綱樹', () => {
  /** 假的 matchMedia：只有「能懸停、指標精準」照給的值，其他查詢（例如寬度）一律不成立 */
  function stubPointer(fine: boolean) {
    const listeners: ((e: { matches: boolean }) => void)[] = []
    const mql = {
      matches: fine,
      addEventListener: (...[, fn]: [string, (e: { matches: boolean }) => void]) => listeners.push(fn),
      removeEventListener: () => {},
    }
    vi.stubGlobal('matchMedia', (query: string) => (query === FINE_POINTER_QUERY ? mql : { matches: false }))
    return (next: boolean) => {
      mql.matches = next
      listeners.forEach((fn) => fn({ matches: next }))
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('它應該在能懸停、指標精準的裝置畫圖，跟視窗寬度無關（寬度查詢一律不成立也一樣）', async () => {
    stubPointer(true)
    const wrapper = await mountPanel()
    expect(wrapper.find('svg[role="group"]').exists()).toBe(true)
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('它應該在觸控裝置畫大綱樹，不畫圖', async () => {
    stubPointer(false)
    const wrapper = await mountPanel()
    expect(wrapper.find('svg[role="group"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('文章主題')
    // 兩個開關一樣在
    expect(wrapper.findAll('[role="switch"]').map((s) => s.text())).toEqual(['次要概念', '橫向關係'])
  })

  it('它應該在裝置切換（例如平板接上滑鼠）時跟著換', async () => {
    const change = stubPointer(false)
    const wrapper = await mountPanel()
    change(true)
    await flushPromises()
    expect(wrapper.find('svg[role="group"]').exists()).toBe(true)
  })

  it('它應該在裝置切換時清掉選取的詞，切回來彈出框不會在舊位置重新出現', async () => {
    const change = stubPointer(true)
    const wrapper = await mountPanel()
    await wrapper.get('[data-node-id="n24"][role="button"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    change(false)
    await flushPromises()
    expect(wrapper.find('svg[role="group"]').exists()).toBe(false)
    change(true)
    await flushPromises()
    expect(wrapper.find('svg[role="group"]').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('[data-node-id="n24"][role="button"]').attributes('aria-expanded')).toBe('false')
  })

  it('它應該在大綱樹的說明列不寫「另有 N 條連到收合的詞」（文字關係不受收合影響）', async () => {
    stubPointer(false)
    const wrapper = await mountPanel()
    await wrapper.findAll('[role="switch"]').find((s) => s.text() === '橫向關係')!.trigger('click')
    expect(wrapper.text()).toContain('只是常一起出現')
    expect(wrapper.text()).toContain('有類型')
    expect(wrapper.text()).not.toContain('連到收合的詞')
  })
})
