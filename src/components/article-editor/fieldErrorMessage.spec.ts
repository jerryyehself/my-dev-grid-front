import { describe, expect, it } from 'vitest'
import { describeFieldError, isFieldErrorShownInPlace } from './fieldErrorMessage'

const RAW_KEYS = /techniques|implementations|relation[_ ]id|\btitle\b|\bbody\b|\btype\b/i

describe('describeFieldError', () => {
  it('它應該拿掉述詞檢查訊息開頭的欄位路徑，保留後面的中文說明', () => {
    const message = describeFieldError(
      'techniques.1.relation_id',
      'techniques.1：關係「documents」的主詞端必須屬於分類「post」（含其子分類），但這筆資料的分類是「framework」。',
    )
    expect(message).toBe('關係「documents」的主詞端必須屬於分類「post」（含其子分類），但這筆資料的分類是「framework」。')
  })
  it.each([
    ['techniques.0.relation_id', 'The selected techniques.0.relation id is invalid.'],
    ['implementations.2.relation_id', ' implementations.2.relation id 必填'],
    ['techniques.1.relation_id', ''],
  ])('它應該在連結述詞的訊息不能直接給人看時（%s）改用固定句', (key, raw) => {
    const message = describeFieldError(key, raw)
    expect(message).toBe('這個述詞不能用在這兩端的分類，請換一個述詞，或移除這條關聯。')
    expect(message).not.toMatch(RAW_KEYS)
  })
  it.each([
    ['title', ' title 必填', '標題 必填'],
    ['body', 'body 太長', '內文 太長'],
  ])('它應該把訊息裡的欄位名 %s 換成畫面上的稱呼', (key, raw, expected) => {
    expect(describeFieldError(key, raw)).toBe(expected)
  })
  it.each([
    ['title', '標題'],
    ['type', '分類號'],
  ])('它應該在 %s 只有英文訊息時改用固定句', (key, label) => {
    const message = describeFieldError(key, 'The selected type is invalid.')
    expect(message).toBe(`${label}沒有通過檢查，請修正後再儲存。`)
  })
  it('它應該說明連結對象找不到', () => {
    expect(describeFieldError('techniques.0.id', 'The selected techniques.0.id is invalid.')).toBe(
      '這條關聯連到的對象已經找不到，請移除這條關聯後重新加入。',
    )
  })
  it.each(['status', 'creation_date', 'documentations.0.relation_id', 'locked', ''])(
    '它應該對不認得的 key（%s）使用通用訊息而不顯示原始 key',
    (key) => {
      const message = describeFieldError(key, `${key} 欄位有問題`)
      expect(message).toBe('有欄位沒通過檢查，請確認內容後再儲存。')
      if (key) expect(message).not.toContain(key)
    },
  )
})

describe('isFieldErrorShownInPlace', () => {
  it.each(['title', 'body', 'techniques.0.relation_id', 'implementations.12.relation_id'])('它應該認得 %s 會顯示在欄位旁', (key) => {
    expect(isFieldErrorShownInPlace(key)).toBe(true)
  })
  it.each(['type', 'techniques.0.id', 'status', 'techniques.x.relation_id'])('它應該認得 %s 沒有欄位位置', (key) => {
    expect(isFieldErrorShownInPlace(key)).toBe(false)
  })
})
