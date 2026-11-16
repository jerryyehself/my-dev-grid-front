/// <reference types="node" />
// 測試用：把元素上 Tailwind 的 `text-(length:--x)`／`leading-(--x)`／`mb-(--x)`／`tracking-(--x)` class
// 對回 `assets/css/variables.css` 裡 `--article-*` 變數的實際值，換算成 px。
// jsdom 不會載入 Tailwind，沒辦法直接量 getComputedStyle；這樣至少能斷言「這個元素最後吃到幾 px」，
// 而不只是「class 名稱長這樣」。真的瀏覽器裡的 computed style 另外用 Playwright 量過。
import { readFileSync } from 'node:fs'

/**
 * 讀 `src/assets/css/` 底下的 CSS 原文。不用 `?raw` import：vitest 預設不處理 CSS，
 * `?raw` 會得到空字串，變數一個也解不出來。
 */
export function readCss(name: string): string {
  return readFileSync(`${process.cwd()}/src/assets/css/${name}`, 'utf8')
}

const variablesCss = readCss('variables.css')

const ROOT_PX = 16

const tokens = new Map<string, string>()
for (const m of variablesCss.matchAll(/(--article-[\w-]+):\s*([^;/]+?)\s*;/g)) {
  tokens.set(m[1]!, m[2]!)
}

/** 變數的原始值（例如 `2.25rem`、`0.05em`）；沒有這個變數就丟錯，不要默默回 undefined。 */
export function tokenRaw(name: string): string {
  const v = tokens.get(name)
  if (v === undefined) throw new Error(`variables.css 沒有 ${name}`)
  return v
}

/** rem 或 px 的變數值換成 px。 */
export function tokenPx(name: string): number {
  const raw = tokenRaw(name)
  if (raw.endsWith('rem')) return parseFloat(raw) * ROOT_PX
  if (raw.endsWith('px')) return parseFloat(raw)
  throw new Error(`${name} 的值 ${raw} 不是 rem 或 px`)
}

export interface ResolvedType {
  size?: number
  leading?: number
  marginBottom?: number
  tracking?: string
}

/** 讀元素的 class，解出它用到的 --article-* 變數對應的 px。沒有用變數的屬性不會出現在結果裡。 */
export function resolveType(classes: string[]): ResolvedType {
  const out: ResolvedType = {}
  for (const c of classes) {
    let m = c.match(/^text-\(length:(--article-[\w-]+)\)$/)
    if (m) out.size = tokenPx(m[1]!)
    m = c.match(/^leading-\((--article-[\w-]+)\)$/)
    if (m) out.leading = tokenPx(m[1]!)
    m = c.match(/^mb-\((--article-[\w-]+)\)$/)
    if (m) out.marginBottom = tokenPx(m[1]!)
    m = c.match(/^tracking-\((--article-[\w-]+)\)$/)
    if (m) out.tracking = tokenRaw(m[1]!)
  }
  return out
}
