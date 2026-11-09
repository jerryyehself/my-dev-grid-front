// 把後端 422 的欄位錯誤整理成給人看的繁體中文。
//
// 後端的訊息可能夾著內部欄位名：Laravel 內建訊息會直接放欄位路徑（`title 必填`、
// `techniques.1.relation id`），述詞檢查的訊息則以 `techniques.1：` 開頭。
// 這些名稱對使用者沒有意義，所以一律在這裡過濾；對不上已知欄位的 key 退回通用訊息，
// 絕不把 key 原樣顯示。

const GENERIC_MESSAGE = '有欄位沒通過檢查，請確認內容後再儲存。'
const LINK_PREDICATE_FALLBACK = '這條關聯的述詞沒通過檢查，請換一個述詞，或移除這條關聯。'
const LINK_TARGET_MESSAGE = '這條關聯連到的對象已經找不到，請移除這條關聯後重新加入。'

const LINK_RELATION_KEY = /^(?:techniques|implementations)\.\d+\.relation_id$/
const LINK_TARGET_KEY = /^(?:techniques|implementations)\.\d+\.id$/

/** 後端欄位 → 畫面上的稱呼。 */
const FIELD_LABELS: Record<string, string> = {
  title: '標題',
  body: '內文',
  type: '分類號',
}

const PATH_PREFIX = /^\s*(?:techniques|implementations|documentations)\.\d+\s*[：:]\s*/
/** 後端述詞檢查會寫出連結對象的 model 類別名與 id（`所連結的 Technique（id 5）`），不給人看。 */
const LINKED_MODEL = /所連結的\s*[A-Za-z]+（id\s*\d+）/g
const RAW_PATH = /(?:techniques|implementations|documentations)[.\s]\d+|relation[_ ]id/i
const HAS_CJK = /[一-鿿]/

/** 編輯頁有沒有在欄位旁顯示這個 key 的訊息（標題、內文、各連結的述詞）。 */
export function isFieldErrorShownInPlace(key: string): boolean {
  return key === 'title' || key === 'body' || LINK_RELATION_KEY.test(key)
}

export function describeFieldError(key: string, message: string): string {
  const text = message.trim()

  if (LINK_RELATION_KEY.test(key)) {
    const cleaned = text.replace(PATH_PREFIX, '').replace(LINKED_MODEL, '所連結的對象').trim()
    return cleaned && HAS_CJK.test(cleaned) && !RAW_PATH.test(cleaned) ? cleaned : LINK_PREDICATE_FALLBACK
  }

  const label = FIELD_LABELS[key]
  if (label) {
    // 沒有中文的訊息（Laravel 的英文預設句）換掉欄位名也讀不順，直接用固定句
    if (!HAS_CJK.test(text)) return `${label}沒有通過檢查，請修正後再儲存。`
    return text.split(key).join(label).split(key.replace(/_/g, ' ')).join(label).trim()
  }

  if (LINK_TARGET_KEY.test(key)) return LINK_TARGET_MESSAGE
  return GENERIC_MESSAGE
}
