// 記住「最後一次輸入是鍵盤還是指標」，讓鍵盤觸發的開合瞬間完成（不播動畫）。
// 做法跟 focus-visible polyfill 判斷來源的方式一樣：capture 階段聽 keydown／pointerdown 等事件，
// 把結果寫在 <html data-input="keyboard|pointer">。main.css 在 data-input="keyboard" 時把
// panel-open／panel-close 兩個時長歸零，所以不管元件用 <Transition name="panel">、panel-up
// 還是 duration-panel-* class，鍵盤觸發的開合（按鍵、Tab 聚焦打開、Esc 關閉）都是瞬間完成，
// 元件本身不用各寫一套判斷。滑鼠與觸控維持原本的 panel-open／panel-close。
export type InputModality = 'keyboard' | 'pointer'

const ATTRIBUTE = 'data-input'

// 這些事件代表「不是鍵盤」：pointerdown 涵蓋滑鼠、觸控、觸控筆，mousedown／touchstart 是不支援 pointer 事件時的後備，
// wheel 是滾輪捲動（捲動觸發的元件，例如頁首的捲動追蹤列，不該因為更早按過鍵盤就瞬間出現）。
const POINTER_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'wheel'] as const

let modality: InputModality = 'pointer'
let uninstall: (() => void) | null = null

function setModality(next: InputModality) {
  modality = next
  document.documentElement.setAttribute(ATTRIBUTE, next)
}

/** 最後一次輸入的來源。還沒有任何輸入（例如頁面剛載入）時視為 'pointer'，維持有動畫的預設。 */
export function getInputModality(): InputModality {
  return modality
}

/** 開始追蹤輸入來源，只裝一次；回傳的函式會移除監聽（測試與熱更新用）。 */
export function initInputModality(): () => void {
  if (uninstall) return uninstall
  const onKey = () => setModality('keyboard')
  const onPointer = () => setModality('pointer')

  setModality('pointer')
  window.addEventListener('keydown', onKey, true)
  for (const type of POINTER_EVENTS) {
    window.addEventListener(type, onPointer, { capture: true, passive: true })
  }

  uninstall = () => {
    window.removeEventListener('keydown', onKey, true)
    for (const type of POINTER_EVENTS) window.removeEventListener(type, onPointer, true)
    document.documentElement.removeAttribute(ATTRIBUTE)
    modality = 'pointer'
    uninstall = null
  }
  return uninstall
}
