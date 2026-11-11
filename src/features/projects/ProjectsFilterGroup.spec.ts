import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProjectsFilterGroup from './ProjectsFilterGroup.vue'
import type { ProjectsFilterGroupData as GroupData } from './useProjectsFilter'

const tag = (label: string, count: number, selected = false) => ({ label, count, selected })

const smallGroup: GroupData = { label: '框架', tags: [tag('laravel', 9), tag('Vue', 7), tag('Nuxt', 1)] }

// 13 個標籤：剛好到搜尋門檻。專案數 >= 2 的有 4 個（含 vuetify 不算，它只有 1）
const bigTags = [
  tag('tailwind', 5),
  tag('pinia', 3),
  tag('vuetify', 1),
  tag('vueuse-core', 1),
  tag('axios', 2),
  tag('cheerio', 1),
  tag('exceljs', 1),
  tag('i18n', 1),
  tag('isbn3', 1),
  tag('json', 1),
  tag('leetcode', 1),
  tag('linebot', 1),
  tag('rdflib', 1),
]
const bigGroup: GroupData = { label: '套件工具', tags: bigTags }

const render = (group: GroupData) => mount(ProjectsFilterGroup, { props: { group } })
const chipNames = (w: ReturnType<typeof render>) => w.findAll('button').map((b) => b.attributes('aria-label')!.split('，')[0])

// jsdom 沒有 scrollIntoView
const scrollIntoView = vi.fn()
beforeEach(() => {
  scrollIntoView.mockReset()
  Element.prototype.scrollIntoView = scrollIntoView
})
afterEach(() => {
  // @ts-expect-error 還原成 jsdom 原本沒有這個方法的狀態
  delete Element.prototype.scrollIntoView
})

describe('ProjectsFilterGroup', () => {
  describe('標籤不多的分類', () => {
    it('它應該列出全部晶片，沒有搜尋框', () => {
      const wrapper = render(smallGroup)

      expect(chipNames(wrapper)).toEqual(['laravel', 'Vue', 'Nuxt'])
      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('輸入搜尋')
    })

    it('它應該在點晶片時送出 toggle 並帶標籤名稱', async () => {
      const wrapper = render(smallGroup)

      await wrapper.findAll('button')[1]!.trigger('click')

      expect(wrapper.emitted('toggle')).toEqual([['Vue']])
    })

    it('它應該用 aria-pressed 表示是否選中，用 aria-label 唸出專案數', () => {
      const wrapper = render({ label: '框架', tags: [tag('Vue', 7, true), tag('Nuxt', 1)] })
      const [vue, nuxt] = wrapper.findAll('button')

      expect(vue!.attributes('aria-pressed')).toBe('true')
      expect(nuxt!.attributes('aria-pressed')).toBe('false')
      expect(vue!.attributes('aria-label')).toBe('Vue，7 個專案')
    })
  })

  describe('標籤多的分類', () => {
    it.each([
      [12, false],
      [13, true],
    ])('它應該在有 %i 個標籤時，搜尋框是否出現：%s', (n, hasSearch) => {
      const tags = Array.from({ length: n }, (unused, i) => tag(`t${i}`, 1))

      expect(render({ label: '套件工具', tags }).find('input').exists()).toBe(hasSearch)
    })

    it('它應該在沒輸入時只列專案數 >= 2 的晶片，其餘的說「另 N 個」', () => {
      const wrapper = render(bigGroup)

      expect(chipNames(wrapper)).toEqual(['tailwind', 'pinia', 'axios'])
      expect(wrapper.text()).toContain('另 10 個，輸入搜尋')
    })

    it('它應該讓已選的標籤即使專案數只有 1 也留在晶片列，才取消得掉', () => {
      const wrapper = render({ label: '套件工具', tags: bigTags.map((t) => (t.label === 'json' ? { ...t, selected: true } : t)) })

      expect(chipNames(wrapper)).toContain('json')
      expect(wrapper.text()).toContain('另 9 個，輸入搜尋')
    })

    it('它應該用「搜尋＋分類名」當 placeholder 與 aria-label', () => {
      const input = render(bigGroup).find('input')

      expect(input.attributes('placeholder')).toBe('搜尋套件工具')
      expect(input.attributes('aria-label')).toBe('搜尋套件工具')
    })

    it('它應該在輸入後出現建議清單，名稱開頭符合的排前面，晶片也縮到符合的', async () => {
      const wrapper = render(bigGroup)

      await wrapper.find('input').setValue('ue')

      // 「ue」：vuetify、vueuse-core 的 ue 在中間，exceljs 沒有；沒有開頭符合的，照原順序
      const options = wrapper.findAll('[role="option"]').map((o) => o.text())
      expect(options).toEqual(['vuetify1', 'vueuse-core1'])
      expect(chipNames(wrapper)).toEqual(['vuetify', 'vueuse-core'])
      expect(wrapper.text()).not.toContain('輸入搜尋')
    })

    it('它應該把開頭符合的建議排在中間符合的前面', async () => {
      const wrapper = render({ label: '套件工具', tags: [...bigTags, tag('revue', 1)] })

      await wrapper.find('input').setValue('vue')

      expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual(['vuetify1', 'vueuse-core1', 'revue1'])
    })

    it('它應該不分大小寫比對、忽略前後空白', async () => {
      const wrapper = render(bigGroup)

      await wrapper.find('input').setValue('  TAIL ')

      expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual(['tailwind5'])
    })

    it('它應該最多列 6 個建議，晶片仍列出全部符合的', async () => {
      const tags = Array.from({ length: 14 }, (unused, i) => tag(`lib${i}`, 1))
      const wrapper = render({ label: '套件工具', tags })

      await wrapper.find('input').setValue('lib')

      expect(wrapper.findAll('[role="option"]')).toHaveLength(6)
      expect(wrapper.findAll('button')).toHaveLength(14)
    })

    it('它應該在沒有符合時說找不到，且不出現建議清單', async () => {
      const wrapper = render(bigGroup)

      await wrapper.find('input').setValue('zzz')

      expect(wrapper.find('[role="status"]').text()).toBe('找不到符合「zzz」的套件工具')
      expect(wrapper.findAll('[role="option"]')).toHaveLength(0)
      expect(wrapper.find('input').attributes('aria-expanded')).toBe('false')
    })

    it('它應該在建議清單出現時把清單捲進面板可見範圍，沒有建議時不捲', async () => {
      const wrapper = render(bigGroup)
      const input = wrapper.find('input')

      await input.setValue('zzz')
      expect(scrollIntoView).not.toHaveBeenCalled()

      await input.setValue('vu')
      await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' }))
    })

    it('它應該在清單出現時把 combobox 標成展開，並指向目前的選項', async () => {
      const wrapper = render(bigGroup)
      const input = wrapper.find('input')

      await input.setValue('vu')

      expect(input.attributes('aria-expanded')).toBe('true')
      const active = wrapper.find(`#${input.attributes('aria-activedescendant')}`)
      expect(active.text()).toContain('vuetify')
    })

    it('它應該在搜尋框失焦時收起建議清單，再聚焦時重新展開', async () => {
      // isVisible 要元件掛在文件上才算得出來
      const wrapper = mount(ProjectsFilterGroup, { props: { group: bigGroup }, attachTo: document.body })
      const input = wrapper.find('input')
      await input.setValue('vu')
      expect(input.attributes('aria-expanded')).toBe('true')

      await input.trigger('blur')

      expect(input.attributes('aria-expanded')).toBe('false')
      expect(input.attributes('aria-activedescendant')).toBeUndefined()
      expect(wrapper.find('[role="listbox"]').isVisible()).toBe(false)
      // 搜尋字還在，下方的晶片照舊縮到符合的
      expect(chipNames(wrapper)).toEqual(['vuetify', 'vueuse-core'])

      await input.trigger('focus')

      expect(input.attributes('aria-expanded')).toBe('true')
      expect(wrapper.find('[role="listbox"]').isVisible()).toBe(true)
      wrapper.unmount()
    })

    it('它應該在失焦收起後繼續輸入時重新展開建議清單', async () => {
      const wrapper = render(bigGroup)
      const input = wrapper.find('input')
      await input.setValue('vu')
      await input.trigger('blur')

      await input.setValue('vue')

      expect(input.attributes('aria-expanded')).toBe('true')
    })

    it('它應該讓建議項目擋掉 mousedown 的預設行為，點選時搜尋框不失焦、click 仍能選取', async () => {
      const wrapper = render(bigGroup)
      await wrapper.find('input').setValue('vu')
      const option = wrapper.findAll('[role="option"]')[1]!

      const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      option.element.dispatchEvent(mousedown)
      await option.trigger('click')

      expect(mousedown.defaultPrevented).toBe(true)
      expect(wrapper.emitted('toggle')).toEqual([['vueuse-core']])
    })

    it('它應該用上下鍵移動目前選項，並循環', async () => {
      const wrapper = render(bigGroup)
      const input = wrapper.find('input')
      await input.setValue('vu')

      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(wrapper.find(`#${input.attributes('aria-activedescendant')}`).text()).toContain('vueuse-core')

      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(wrapper.find(`#${input.attributes('aria-activedescendant')}`).text()).toContain('vuetify')

      await input.trigger('keydown', { key: 'ArrowUp' })
      expect(wrapper.find(`#${input.attributes('aria-activedescendant')}`).text()).toContain('vueuse-core')
    })

    it('它應該在按 Enter 時選取目前選項、送出 toggle 並清空搜尋框', async () => {
      const wrapper = render(bigGroup)
      const input = wrapper.find('input')
      await input.setValue('vu')
      await input.trigger('keydown', { key: 'ArrowDown' })

      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('toggle')).toEqual([['vueuse-core']])
      expect((input.element as HTMLInputElement).value).toBe('')
    })

    it('它應該在沒有建議時按 Enter 不送出任何事件', async () => {
      const wrapper = render(bigGroup)
      const input = wrapper.find('input')
      await input.setValue('zzz')

      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    it('它應該在點建議時送出 toggle 並清空搜尋框', async () => {
      const wrapper = render(bigGroup)
      await wrapper.find('input').setValue('vu')

      await wrapper.findAll('[role="option"]')[0]!.trigger('click')

      expect(wrapper.emitted('toggle')).toEqual([['vuetify']])
      expect(wrapper.findAll('[role="option"]')).toHaveLength(0)
    })

    it('它應該在按 Escape 時清空搜尋框', async () => {
      const wrapper = render(bigGroup)
      const input = wrapper.find('input')
      await input.setValue('vu')

      await input.trigger('keydown', { key: 'Escape' })

      expect((input.element as HTMLInputElement).value).toBe('')
    })

    it('它應該替已選的建議標上「已選」給螢幕報讀器', async () => {
      const wrapper = render({ label: '套件工具', tags: bigTags.map((t) => (t.label === 'vuetify' ? { ...t, selected: true } : t)) })

      await wrapper.find('input').setValue('vuetify')

      expect(wrapper.find('[role="option"]').text()).toContain('已選')
    })
  })
})
