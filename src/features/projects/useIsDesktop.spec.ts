import { describe, it, expect, vi, afterEach } from 'vitest'
import { effectScope } from 'vue'
import { useIsDesktop } from './useIsDesktop'

type ChangeHandler = (e: MediaQueryListEvent) => void

function stubMatchMedia(matches: boolean) {
  const addEventListener = vi.fn<(type: string, handler: ChangeHandler) => void>()
  const removeEventListener = vi.fn<(type: string, handler: ChangeHandler) => void>()
  const matchMedia = vi.fn((query: string) => ({ matches, media: query, addEventListener, removeEventListener }))
  vi.stubGlobal('matchMedia', matchMedia)
  return { matchMedia, addEventListener, removeEventListener }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useIsDesktop', () => {
  it('它應該用 md 斷點（768px）當桌機寬度的判斷', () => {
    const { matchMedia } = stubMatchMedia(true)

    effectScope().run(() => useIsDesktop())

    expect(matchMedia).toHaveBeenCalledWith('(min-width: 768px)')
  })

  it.each([true, false])('它應該一開始就同步回傳目前的 matches（%s）', (matches) => {
    stubMatchMedia(matches)

    expect(effectScope().run(() => useIsDesktop())!.value).toBe(matches)
  })

  it('它應該在 matchMedia 發出 change 事件時更新', () => {
    const { addEventListener } = stubMatchMedia(true)
    const isDesktop = effectScope().run(() => useIsDesktop())!
    const [type, onChange] = addEventListener.mock.calls[0]!

    expect(type).toBe('change')
    onChange({ matches: false } as MediaQueryListEvent)
    expect(isDesktop.value).toBe(false)

    onChange({ matches: true } as MediaQueryListEvent)
    expect(isDesktop.value).toBe(true)
  })

  it('它應該在 effect scope 結束時移除當初註冊的同一個監聽函式', () => {
    const { addEventListener, removeEventListener } = stubMatchMedia(true)
    const scope = effectScope()
    scope.run(() => useIsDesktop())
    expect(removeEventListener).not.toHaveBeenCalled()

    scope.stop()

    expect(removeEventListener).toHaveBeenCalledTimes(1)
    expect(removeEventListener).toHaveBeenCalledWith('change', addEventListener.mock.calls[0]![1])
  })

  it('它應該在沒有 matchMedia 的環境視為桌機，不丟錯', () => {
    vi.stubGlobal('matchMedia', undefined)

    expect(effectScope().run(() => useIsDesktop())!.value).toBe(true)
  })
})
