import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createScope, previewFullCallNumber, updateScope } from './ontology'
import { ApiValidationError } from './client'

const mockFetch = vi.fn()

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

describe('previewFullCallNumber', () => {
  // 這個函式存在的唯一理由是「跟後端的推導一致」,所以測的就是那個一致性。
  // 後端是 SetCURIEAttribute::getFullCallNumberAttribute():class_number . call_number,
  // 字串相接,沒有分隔符也沒有補零。
  it('就是分類號接子類號，沒有分隔符', () => {
    expect(previewFullCallNumber('00', '30')).toBe('0030')
    expect(previewFullCallNumber('10', '40')).toBe('1040')
  })

  it('子類號留空時只剩分類號兩碼——不自己補 00', () => {
    // 補 '00' 會讓預覽顯示成 '0000',而後端實際存出來是 '00'。
    // 預覽說謊比預覽不完整糟糕得多。
    expect(previewFullCallNumber('00', '')).toBe('00')
    expect(previewFullCallNumber('20', '   ')).toBe('20')
  })
})

describe('createScope / updateScope', () => {
  it('兩個動詞送同一份 payload，欄位名是 parent_class（D-51／#61）', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { id: 9 }, message: 'Scope created.' }, 201))

    const payload = {
      parent_class: 3,
      call_number: '40',
      name: 'framework',
      comment: '框架',
      note: '',
    }
    await createScope(payload)
    await updateScope(9, payload)

    const [createUrl, createInit] = mockFetch.mock.calls[0]!
    const [updateUrl, updateInit] = mockFetch.mock.calls[1]!

    expect(createUrl).toContain('/scopes')
    expect(createInit.method).toBe('POST')
    expect(updateUrl).toContain('/scopes/9')
    expect(updateInit.method).toBe('PUT')

    // 重點不是「有送出去」,是**兩個動詞的 body 一模一樣**。在 D-51 之前
    // class_number 在 POST 是父層 id、在 PUT 是字面分類號,這個斷言會失敗。
    expect(JSON.parse(createInit.body)).toEqual(JSON.parse(updateInit.body))
    expect(JSON.parse(createInit.body)).toMatchObject({ parent_class: 3 })
    expect(JSON.parse(createInit.body)).not.toHaveProperty('class_number')
  })

  it('422 攤平成欄位錯誤，丟 ApiValidationError 而不是一般 Error', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        {
          errors: {
            name: ['The name has already been taken.', '第二句會被丟掉'],
            comment: ['The comment field is required.'],
          },
        },
        422,
      ),
    )

    // 呼叫端要分得出「欄位填錯」跟「伺服器壞掉」——前者渲染在欄位旁邊,
    // 後者只能整頁報錯。用 message 字串去猜是之後一定會出錯的寫法。
    await expect(
      createScope({ parent_class: 3, call_number: '', name: 'post', comment: '', note: '' }),
    ).rejects.toBeInstanceOf(ApiValidationError)

    try {
      await createScope({ parent_class: 3, call_number: '', name: 'post', comment: '', note: '' })
    } catch (error) {
      expect((error as ApiValidationError).fieldErrors).toEqual({
        name: 'The name has already been taken.',
        comment: 'The comment field is required.',
      })
    }
  })

  it('非 422 的失敗仍然是一般 Error，不會被誤當成驗證失敗', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Unauthenticated.' }, 401))

    // 寫入端點在 auth:sanctum 後面,而登入還沒做(D-34／D-49),所以 401 是
    // 目前按下儲存**實際會拿到**的回應。它不能被歸進欄位錯誤。
    const promise = createScope({
      parent_class: 3,
      call_number: '',
      name: 'post',
      comment: '說明',
      note: '',
    })
    await expect(promise).rejects.toThrow('401')
    await expect(promise).rejects.not.toBeInstanceOf(ApiValidationError)
  })
})
