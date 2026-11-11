import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Project } from '@/api/projects'
import ProjectsYearList from './ProjectsYearList.vue'

const project = (id: string, title: string, statusType?: 'active' | 'archived'): Project => ({
  id,
  title,
  status: statusType === 'active' ? 'Active' : statusType === 'archived' ? 'Archived' : undefined,
  statusType,
  desc: '',
  tags: [],
  started: '2025.01',
  repo: title,
})

const groups = [
  { year: '2026', projects: [project('1', 'alpha', 'active')] },
  { year: '2025', projects: [project('2', 'beta', 'archived'), project('3', 'gamma')] },
  { year: '', projects: [project('4', 'delta', 'active')] },
]

const render = (selectedId = '1') => mount(ProjectsYearList, { props: { groups, selectedId } })

describe('ProjectsYearList', () => {
  it('它應該每組一個年份標頭，沒有日期的那組標「日期不詳」', () => {
    const headings = render().findAll('h3').map((h) => h.text())

    expect(headings).toEqual(['2026', '2025', '日期不詳'])
  })

  it('它應該每個專案一列按鈕，列上不出現 PROJ- 編號', () => {
    const wrapper = render()

    expect(wrapper.findAll('button')).toHaveLength(4)
    expect(wrapper.text()).not.toContain('PROJ-')
  })

  it('它應該只在選中的那一列標 aria-current', () => {
    const buttons = render('2').findAll('button')

    expect(buttons.map((b) => b.attributes('aria-current'))).toEqual([undefined, 'true', undefined, undefined])
  })

  it('它應該替有狀態的專案補螢幕報讀器用的狀態文字，沒有狀態的不補', () => {
    const buttons = render().findAll('button')

    expect(buttons[0]!.find('.sr-only').text()).toContain('Active')
    expect(buttons[1]!.find('.sr-only').text()).toContain('Archived')
    expect(buttons[2]!.find('.sr-only').exists()).toBe(false)
  })

  it('它應該把圓點對螢幕報讀器隱藏', () => {
    expect(render().find('button span').attributes('aria-hidden')).toBe('true')
  })

  it('它應該在點列時送出 select 並帶該專案的 id', async () => {
    const wrapper = render()

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['2']])
  })
})

describe('ProjectsYearList.revealSelected', () => {
  afterEach(() => {
    // @ts-expect-error 還原成 jsdom 原本沒有這個方法的狀態
    delete Element.prototype.scrollIntoView
  })

  it('它應該把選中的那一列捲進可見範圍', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const wrapper = render('3')

    wrapper.vm.revealSelected()

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toBe(wrapper.findAll('button')[2]!.element)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('它應該在沒有選中的列時什麼都不做', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    render('999').vm.revealSelected()

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
