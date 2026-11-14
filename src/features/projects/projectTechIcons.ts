import type { SimpleIcon } from 'simple-icons'
// 只用具名匯入，不要 `import * as icons`：simple-icons 有三千多個圖示，整包進來會把幾百 KB
// 塞進 bundle；具名匯入加上套件的 sideEffects: false，打包時只留下這裡列的幾十個。
import {
  siBootstrap,
  siChartdotjs,
  siCheerio,
  siCss,
  siDocker,
  siGithubpages,
  siGnubash,
  siGoogleappsscript,
  siHtml5,
  siJavascript,
  siJson,
  siJupyter,
  siLaravel,
  siLeetcode,
  siLine,
  siNuxt,
  siPhp,
  siPython,
  siReact,
  siTailwindcss,
  siTypescript,
  siVite,
  siVuedotjs,
  siVuetify,
} from 'simple-icons'

// 專案詳情的技術標籤：有品牌圖示的技術畫成「圖示＋名稱」，沒有的維持文字標籤。
// 對照表是手動維護的——後端的技術名稱是 GitHub topic／語言，沒有任何欄位指向 simple-icons
// 的 slug，名稱也不一致（appscript、linebot、Dockerfile、Shell…），不能從名稱推。
// 新增技術要有圖示時，在這裡補一行；沒補的技術只是顯示成文字標籤，不會壞。
//
// key 是小寫的技術名稱（不含版本：「Vue 3」的 name 是「Vue」，版本是另一個欄位）。
// 用 Map 不用物件字面量：技術名稱是外部資料，物件會讓「constructor」這種名稱查到原型上的東西。
const ICON_BY_TECHNIQUE = new Map<string, SimpleIcon>([
  ['laravel', siLaravel],
  ['vue', siVuedotjs],
  ['nuxt', siNuxt],
  ['react', siReact],
  ['php', siPhp],
  ['javascript', siJavascript],
  ['typescript', siTypescript],
  ['html', siHtml5],
  ['css', siCss],
  ['python', siPython],
  ['shell', siGnubash],
  ['dockerfile', siDocker],
  ['tailwind', siTailwindcss],
  ['vite', siVite],
  ['vuetify', siVuetify],
  ['bootstrap', siBootstrap],
  ['chartjs', siChartdotjs],
  ['jupyter notebook', siJupyter],
  ['json', siJson],
  ['appscript', siGoogleappsscript],
  ['linebot', siLine],
  ['cheerio', siCheerio],
  ['leetcode', siLeetcode],
  ['github-pages', siGithubpages],
])

/** 技術名稱（不含版本）對應的品牌圖示；沒有對應的回 undefined */
export function techIconOf(name: string): SimpleIcon | undefined {
  return ICON_BY_TECHNIQUE.get(name.trim().toLowerCase())
}
