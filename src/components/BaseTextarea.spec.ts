import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseTextarea from './BaseTextarea.vue'

function mountWith(modelValue: string, limit?: number, attrs: Record<string, unknown> = {}) {
  return mount(BaseTextarea, { props: { modelValue, limit }, attrs })
}

describe('BaseTextarea 的字數（規格缺口 G3）', () => {
  it('沒給 limit 就完全不顯示字數——既有呼叫端的行為不變', () => {
    // BaseTextarea 在這次之前只有一個使用點(文章編輯頁的邊註)。
    // 加上 limit 這個抽象站不站得住,第一個條件就是不傳它時什麼都沒變。
    const wrapper = mountWith('一些內容')
    expect(wrapper.text()).toBe('')
  })

  it('用字元數而不是 UTF-16 長度——擴展漢字與 emoji 不會被多算', () => {
    // 後端 Laravel 的 max:100 走 mb_strlen,數的是字元數。
    // 用 .length 的話這兩個字會被算成 4,畫面顯示 4/100 而後端認為是 2,
    // 於是使用者會在「還沒到上限」的時候拿到 422,而且看不出哪裡錯。
    const wrapper = mountWith('𠮷🙂')
    expect(wrapper.props('modelValue')).toHaveLength(4)

    const counted = mountWith('𠮷🙂', 100)
    expect(counted.text()).toContain('2 / 100')
  })

  it('超過上限時講出超出幾個字，不只是變顏色', () => {
    // 站上沒有 danger 色票,逼近與超出都只能用 --text-accent。
    // 同色就分不出來,所以超出這件事要靠文字說出來,不是靠顏色。
    const wrapper = mountWith('十個字十個字', 5)
    expect(wrapper.text()).toContain('6 / 5')
    expect(wrapper.text()).toContain('超出 1 字')
    expect(wrapper.find('textarea').attributes('aria-invalid')).toBe('true')
  })

  it('沒超過上限時不會標成 aria-invalid', () => {
    const wrapper = mountWith('三個字', 100)
    expect(wrapper.text()).toContain('3 / 100')
    expect(wrapper.text()).not.toContain('超出')
    expect(wrapper.find('textarea').attributes('aria-invalid')).toBeUndefined()
  })

  it('刻意不設原生 maxlength——寧可讓人打超過再自己刪', () => {
    // 原生 maxlength 會讓貼上的長文被默默截斷,而且不給任何提示。
    const wrapper = mountWith('', 100)
    expect(wrapper.find('textarea').attributes('maxlength')).toBeUndefined()
  })

  it('呼叫端的 class 落在 textarea 上，不是落在外層 div', () => {
    // 這是加外框之後真正的回歸風險:既有四個呼叫端都傳了字體覆寫
    // (text-sm leading-7、font-serif …)。落到 wrapper 上不會報錯,
    // 只會讓字級悄悄變掉——所以要有一支測試釘住 attrs 的落點。
    const wrapper = mountWith('內容', undefined, { class: 'font-serif' })
    expect(wrapper.find('textarea').classes()).toContain('font-serif')
  })
})
