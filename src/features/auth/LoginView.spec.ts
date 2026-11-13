import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from './LoginView.vue'

const Stub = { template: '<div />' }

async function mountLogin() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: Stub },
      { path: '/admin', component: Stub },
    ],
  })
  router.push('/login')
  await router.isReady()
  const wrapper = mount(LoginView, { global: { plugins: [router] } })
  return Object.assign(wrapper, { router })
}

async function submit(wrapper: Awaited<ReturnType<typeof mountLogin>>) {
  await wrapper.find('input[type="email"]').setValue('j@example.com')
  await wrapper.find('input[type="password"]').setValue('pw')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('LoginView：帳密登入失敗的訊息', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('它應該在連不上伺服器時說連不上，不說請確認帳號密碼', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const wrapper = await mountLogin()

    await submit(wrapper)

    expect(wrapper.text()).toContain('登入失敗：連不上伺服器，請確認網路連線後再試一次。')
    expect(wrapper.text()).not.toContain('請確認帳號密碼')
    expect(wrapper.find('button').text()).toBe('登入')
  })

  it.each([
    ['502（後端冷啟動，回 HTML）', () => new Response('<html>Bad Gateway</html>', { status: 502 })],
    ['500（Laravel 的 Server Error）', () => Response.json({ message: 'Server Error' }, { status: 500 })],
  ])('它應該在伺服器出錯 %s 時說伺服器暫時出問題，不說請確認帳號密碼', async (label, handler) => {
    vi.stubGlobal('fetch', vi.fn(async () => handler()))
    const wrapper = await mountLogin()

    await submit(wrapper)

    expect(wrapper.text()).toContain('登入失敗：伺服器暫時出了問題，請稍後再試一次。')
    expect(wrapper.text()).not.toContain('請確認帳號密碼')
    expect(wrapper.text()).not.toContain('Server Error')
  })

  it('它應該在登入回應讀不出來（不是 JSON）時也顯示錯誤，不讓畫面沒反應', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })))
    const wrapper = await mountLogin()

    await submit(wrapper)

    expect(wrapper.text()).toContain('登入失敗：伺服器暫時出了問題，請稍後再試一次。')
    expect(wrapper.router.currentRoute.value.path).toBe('/login')
    expect(wrapper.find('button').text()).toBe('登入')
  })

  it('它應該在帳號密碼錯誤（422）時照舊顯示後端給的訊息', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ message: '帳號或密碼錯誤。', errors: { email: ['帳號或密碼錯誤。'] } }, { status: 422 }),
      ),
    )
    const wrapper = await mountLogin()

    await submit(wrapper)

    expect(wrapper.text()).toContain('帳號或密碼錯誤。')
  })
})
