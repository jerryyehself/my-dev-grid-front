import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Project } from '@/api/projects'
import ProjectsListPanel from './ProjectsListPanel.vue'
import { STICKY_TOP_PX } from '@/layouts/stickyOffset'

const project = (id: string, title: string): Project => ({
  id,
  title,
  status: 'Active',
  statusType: 'active',
  desc: '',
  tags: [],
  started: '2025.01',
  repo: title,
})

const render = (props: Partial<InstanceType<typeof ProjectsListPanel>['$props']> = {}) =>
  mount(ProjectsListPanel, {
    props: {
      projects: [project('1', 'alpha')],
      totalCount: 1,
      selectedId: '1',
      filterGroups: [{ label: '框架', tags: [{ label: 'Vue', count: 1, selected: false }] }],
      hasSelection: false,
      ...props,
    },
  })

const filterButton = (w: ReturnType<typeof render>) => w.findAll('button').find((b) => b.text().startsWith('篩選'))!

describe('ProjectsListPanel', () => {
  it('它應該用共用的 STICKY_TOP_PX 當 sticky 的 top', () => {
    expect(render().element.style.top).toBe(`${STICKY_TOP_PX}px`)
  })

  describe('矮視窗的高度分配', () => {
    // jsdom 不做版面計算，這裡只確認高度上限的來源有接好；實際高度要在瀏覽器看
    it('它應該把左欄高度上限放在 --projects-list-max-h 並套用在最外層', () => {
      const root = render().element

      expect(root.style.getPropertyValue('--projects-list-max-h')).toBe('max(360px, calc(100vh - 228px))')
      expect(root.className).toContain('max-h-(--projects-list-max-h)')
    })

    it('它應該讓展開的篩選面板最多只佔左欄上限扣掉表頭與列表保留高度的部分', async () => {
      const wrapper = render()

      await filterButton(wrapper).trigger('click')

      const panel = wrapper.find(`[id="${filterButton(wrapper).attributes('aria-controls')}"]`)
      expect(panel.classes().join(' ')).toContain('max-h-[min(360px,calc(var(--projects-list-max-h,572px)-212px))]')
      // 內層捲動區沿用外層的上限，不另外寫死 360px，否則外層縮了內層還會撐開
      expect(panel.find('.projects-filter-scroll').classes()).toContain('max-h-[inherit]')
    })
  })

  describe('篩選鈕', () => {
    it('它應該在面板收合時不帶 aria-controls，避免指向不存在的 id', () => {
      const button = filterButton(render())

      expect(button.attributes('aria-expanded')).toBe('false')
      expect(button.attributes('aria-controls')).toBeUndefined()
    })

    it('它應該在面板展開時讓 aria-controls 指向篩選面板', async () => {
      const wrapper = render()
      const button = filterButton(wrapper)

      await button.trigger('click')

      expect(button.attributes('aria-expanded')).toBe('true')
      const id = button.attributes('aria-controls')!
      expect(id).toBeTruthy()
      expect(wrapper.find(`[id="${id}"]`).exists()).toBe(true)
    })

    it('它應該在再按一次收合後移除 aria-controls', async () => {
      const wrapper = render()
      const button = filterButton(wrapper)

      await button.trigger('click')
      await button.trigger('click')

      expect(button.attributes('aria-controls')).toBeUndefined()
    })
  })

  describe('空狀態', () => {
    it('它應該在整體沒有專案時說「目前沒有可顯示的專案」', () => {
      const wrapper = render({ projects: [], totalCount: 0 })

      expect(wrapper.text()).toContain('目前沒有可顯示的專案。')
      expect(wrapper.text()).not.toContain('沒有符合篩選條件')
      expect(wrapper.find('h3').exists()).toBe(false)
    })

    it('它應該在篩選後沒有專案、但整體有專案時說「沒有符合篩選條件的專案」', () => {
      const wrapper = render({ projects: [], totalCount: 3, hasSelection: true })

      expect(wrapper.text()).toContain('沒有符合篩選條件的專案。')
      expect(wrapper.text()).not.toContain('目前沒有可顯示')
    })

    it('它應該在有專案時不顯示空狀態文字', () => {
      const wrapper = render()

      expect(wrapper.text()).not.toContain('沒有符合篩選條件')
      expect(wrapper.text()).not.toContain('目前沒有可顯示')
      expect(wrapper.text()).toContain('1 筆｜依開始日期')
    })
  })
})
