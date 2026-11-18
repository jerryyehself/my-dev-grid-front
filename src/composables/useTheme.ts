import { ref } from 'vue'

export type ThemeName = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const DARK_CLASS = 'theme-dark'

// 讀取目前套用中的主題:index.html 載入的 theme-init.js 已經在畫面畫出來之前
// 把 class 掛好了(含 localStorage 舊值 library／terminal 轉成 light／dark、第一次造訪照 prefers-color-scheme),
// 這裡只是把那個結果同步進 Vue 的響應式狀態,不重複判斷邏輯。
const theme = ref<ThemeName>(
  document.documentElement.classList.contains(DARK_CLASS) ? 'dark' : 'light',
)

function applyTheme(next: ThemeName) {
  document.documentElement.classList.toggle(DARK_CLASS, next === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 私密瀏覽模式或封鎖 storage 時,退化成「這次瀏覽記得住,下次不記得」,不影響功能。
  }
  theme.value = next
}

export function useTheme() {
  function toggleTheme() {
    applyTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  /** 直接指定主題(檯燈的「開燈」「關燈」兩顆鈕用),已經是該主題就不動。 */
  function setTheme(next: ThemeName) {
    if (theme.value !== next) applyTheme(next)
  }

  return { theme, toggleTheme, setTheme }
}
