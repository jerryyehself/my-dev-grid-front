// 全站共用的訪客文字：導覽列、頁尾，以及兩個以上元件都會出現的載入／錯誤／空狀態句子。
//
// 規則：
// - src/copy/ 底下的檔案除了型別以外不 import 任何東西，避免循環依賴（元件、router、
//   siteMeta 都可以 import 這裡，這裡不能反過來 import 它們）。
// - 只放「全站共用」的文字。只有一個元件用到的文字留在那個元件裡；頁面標題與副標在
//   src/router/index.ts 的 meta，站名在 src/siteMeta.ts。
// - 改這裡的文字之前先讀 .claude/skills/copy-language/SKILL.md。

/** 導覽列項目的文字（順序與路徑在 TheNavbar.vue） */
export const NAV_LABELS = {
  home: 'HOME',
  articles: 'ARTICLES',
  projects: 'PROJECTS',
  graph: 'GRAPH',
  about: 'ABOUT',
} as const

/** 手機版導覽選單按鈕的 aria-label */
export const NAV_MENU_ARIA_LABEL = '開啟導覽選單'

/** 頁尾 */
export const FOOTER_TEXT = '© 2026 Jerry Yeh'

/** 載入中 */
export const LOADING_TEXT = '載入中…'
export const LOADING_GRAPH_TEXT = '圖譜載入中…'
export const LOADING_PROJECTS_TEXT = '專案載入中…'

/** 文章清單載入失敗（訪客頁與文章管理頁共用） */
export const ARTICLES_LOAD_FAILED_TEXT = '文章清單載入失敗，重新整理再試一次。'

/** 空狀態 */
export const PROJECTS_EMPTY_TEXT = '目前沒有可顯示的專案。'
export const PROJECTS_NO_MATCH_TEXT = '沒有符合篩選條件的專案。'
export const ARTICLES_EMPTY_TEXT = '目前沒有已發布的文章。'

/**
 * 文章署名：文章清單的頁面標題下面，以及每篇文章的結尾，都用這一句。
 * 空白是全形（U+3000）、斜線是全形（U+FF0F），照原樣，不要改成半形。
 */
export const ARTICLE_BYLINE = '主筆　Claude　／　發想・審定　站主'
