import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import fixture from './articleMindmapFixture.json'
import ArticleMindmapPanel from './ArticleMindmapPanel.vue'
import * as source from './articleMindmapSource'

// 內文標題：那篇文章的段落標題（照文章順序），slug 跟 extractHeadings 算出來的一樣
const headings = [
  '1-背景與動機',
  '2-決策方法論',
  '3-考慮過的圖形類型比較',
  '4-討論過程的關鍵轉折依時間順序',
  '41-起點google-maps-地標式-tooltip-互動模式',
  '42-地圖群島隱喻整條被推翻',
  '43-誠實但不能因此就變保守',
  '44-受眾模型修正後又降權',
  '45-節點身分修正',
  '46-引入結構洞社會網絡分析理論',
  '47-星圖隱喻提出又否決',
  '48-isotype-點群聚合收斂',
  '49-賣點敘事建議',
  '410-v1-手刻-svg-v2-改用專案既有套件',
  '5-相關文獻',
  '6-整個討論過程的心智圖',
  '7-目前結論與待辦',
].map((slug) => ({ slug, text: `標題 ${slug}` }))

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

  it('它應該畫出標題、工具列與桌機圖，預設次要收合、橫向關係關', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('h2').text()).toBe('文章心智圖')
    expect(wrapper.find('button[type="button"]').text()).toBe('展開次要')
    expect(wrapper.get('[role="switch"]').attributes('aria-checked')).toBe('false')
    const text = svgText(wrapper)
    expect(text).toContain('節點-連結圖')
    expect(text).toContain('＋4 次要')
    expect(text).not.toContain('格狀熱度圖')
    expect(wrapper.findAll('[data-testid="mindmap-cross-link"]')).toHaveLength(0)
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
  })

  it('它應該用鍵盤（Enter）也能展開「＋N 次要」', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[data-node-id="chip:n1"]').trigger('keydown', { key: 'Enter' })
    expect(svgText(wrapper)).toContain('資料缺口')
  })

  it('它應該用工具列的鈕全部展開、再全部收合', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('button[type="button"]').trigger('click')
    expect(wrapper.get('button[type="button"]').text()).toBe('收合次要')
    const text = svgText(wrapper)
    for (const label of ['資料缺口', '格狀熱度圖', '漸進揭露', '虛線潛在關聯']) expect(text).toContain(label)
    await wrapper.get('button[type="button"]').trigger('click')
    expect(svgText(wrapper)).not.toContain('格狀熱度圖')
  })

  it('它應該在打開橫向關係後畫出兩端都看得到的線，並寫出另有幾條連到收合的節點', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[role="switch"]').trigger('click')
    expect(wrapper.findAll('[data-testid="mindmap-cross-link"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('另有 4 條連到收合的節點')
    // 有類型（實線）與只是常一起出現（虛線）都有
    expect(wrapper.text()).toContain('有類型的橫向關係')
    expect(wrapper.text()).toContain('只是常一起出現')
  })

  it('它應該在點詞時打開出處的彈出框，段落連到內文錨點，有 res_id 的連到圖譜', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[data-node-id="n24"][role="button"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-label')).toBe('force-graph')
    expect(dialog.text()).toContain('出現在 3 段，點一下跳過去')
    const hrefs = dialog.findAll('a[href^="#"]').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['#410-v1-手刻-svg-v2-改用專案既有套件', '#5-相關文獻', '#7-目前結論與待辦'])
    expect(dialog.get('a[href="/graph"]').text()).toBe('↗ 在圖譜中看「force-graph」')
    expect(document.activeElement).toBe(dialog.element)
  })

  it('它應該在沒有 res_id 的詞不放圖譜連結', async () => {
    const wrapper = await mountPanel()
    await wrapper.get('[data-node-id="n25"][role="button"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').find('a[href="/graph"]').exists()).toBe(false)
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

  it('它應該讓對不上內文段落、也沒有 res_id 的詞不能點', async () => {
    const router = makeRouter()
    const wrapper = mount(ArticleMindmapPanel, {
      props: { articleId: fixture.article_id, headings: [] },
      global: { plugins: [router] },
    })
    await flushPromises()
    // 沒有任何標題：只剩有 res_id 的中心與 force-graph 可以點
    const buttons = wrapper.findAll('g[role="button"]').map((g) => g.attributes('data-node-id'))
    expect(buttons.filter((id) => !id?.startsWith('chip:')).sort()).toEqual(['n0', 'n24'])
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
