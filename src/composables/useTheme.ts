import { ref } from 'vue'

export type ThemeName = 'library' | 'terminal'

const STORAGE_KEY = 'theme'
const TERMINAL_CLASS = 'theme-terminal'

// 讀取目前套用中的主題:index.html 的 inline script 已經在畫面畫出來之前
// 把 class 掛好了,這裡只是把那個結果同步進 Vue 的響應式狀態,不重複判斷邏輯。
const theme = ref<ThemeName>(
  document.documentElement.classList.contains(TERMINAL_CLASS) ? 'terminal' : 'library',
)

function applyTheme(next: ThemeName) {
  document.documentElement.classList.toggle(TERMINAL_CLASS, next === 'terminal')
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 私密瀏覽模式或封鎖 storage 時,退化成「這次瀏覽記得住,下次不記得」,不影響功能。
  }
  theme.value = next
}

export function useTheme() {
  function toggleTheme() {
    applyTheme(theme.value === 'library' ? 'terminal' : 'library')
  }

  return { theme, toggleTheme }
}
