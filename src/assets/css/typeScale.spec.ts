import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { readCss } from '@/test/cssTokens'

const variablesCss = readCss('variables.css')
const mainCss = readCss('../main.css')

/** 讀 :root 裡 `--name: 值;` 的值（去掉註解）。 */
function raw(name: string): string {
  const m = variablesCss.match(new RegExp(`${name}:\\s*([^;/]+?)\\s*;`))
  if (!m) throw new Error(`variables.css 沒有 ${name}`)
  return m[1]!
}

describe('全站字級變數（--type-*）', () => {
  it('它應該是定案的七級', () => {
    expect([raw('--type-display-size'), raw('--type-display-leading')]).toEqual(['2.75rem', '3.5rem']) // 44／56
    expect([raw('--type-title-size'), raw('--type-title-leading')]).toEqual(['2.25rem', '3rem']) // 36／48
    expect([raw('--type-heading-size'), raw('--type-heading-leading'), raw('--type-page-title-leading')]).toEqual([
      '1.5rem',
      '2.25rem',
      '2rem',
    ]) // 24／36、單行 32
    expect([raw('--type-body-size'), raw('--type-body-leading'), raw('--type-ui-leading')]).toEqual([
      '1rem',
      '1.75rem',
      '1.5rem',
    ]) // 16／28、介面 24
    expect([raw('--type-caption-size'), raw('--type-caption-leading')]).toEqual(['0.875rem', '1.5rem']) // 14／24
    expect([raw('--type-label-size'), raw('--type-label-leading')]).toEqual(['0.8125rem', '1.25rem']) // 13／20
    expect([raw('--type-mono-size'), raw('--type-mono-leading')]).toEqual(['0.75rem', '1rem']) // 12／16
  })

  it('它應該讓手機的展示級縮成 36／44，其他級不隨螢幕縮', () => {
    const mobile = variablesCss.match(/@media \(max-width: 600px\)\s*\{\s*:root\s*\{([^}]*)\}/)
    expect(mobile).not.toBeNull()
    expect(mobile![1]!).toContain('--type-display-size: 2.25rem')
    expect(mobile![1]!).toContain('--type-display-leading: 2.75rem')
    expect(mobile![1]!.match(/--type-/g)).toHaveLength(2)
  })

  // 文章頁的 --article-* 測試要求是字面值，不能改成 var(--type-*)；改由這裡守兩邊的數字一致。
  it('它應該跟文章頁同級的 --article-* 數字一致', () => {
    const pairs: [string, string][] = [
      ['--article-title-size', '--type-title-size'],
      ['--article-title-leading', '--type-title-leading'],
      ['--article-body-size', '--type-body-size'],
      ['--article-body-leading', '--type-body-leading'],
      ['--article-h2-size', '--type-heading-size'],
      ['--article-h2-leading', '--type-heading-leading'],
      ['--article-h3-size', '--type-body-size'],
      ['--article-footnote-size', '--type-caption-size'],
      ['--article-footnote-leading', '--type-caption-leading'],
      ['--article-label-size', '--type-label-size'],
      ['--article-label-leading', '--type-label-leading'],
      ['--article-label-tracking', '--type-label-tracking'],
    ]
    for (const [article, type] of pairs) expect(raw(article), `${article} 對 ${type}`).toBe(raw(type))
  })
})

describe('展示字（main.css）', () => {
  it('它應該自己架字體檔，附授權檔，並用 font-display: swap', () => {
    expect(mainCss).toContain("font-family: 'Cactus Classical Serif'")
    expect(mainCss).toMatch(/font-display:\s*swap/)
    const dir = `${process.cwd()}/src/assets/fonts`
    expect(existsSync(`${dir}/CactusClassicalSerif-display.woff2`)).toBe(true)
    expect(existsSync(`${dir}/CactusClassicalSerif-OFL.txt`)).toBe(true)
    // 子集只有三處用到的字；超過 20 KB 代表被換成完整字型了
    const size = statSync(`${dir}/CactusClassicalSerif-display.woff2`).size
    expect(size).toBeLessThan(20 * 1024)
    // 下限：Vite 預設把小於 4096 bytes 的資源內嵌成 data: URI，而 CSP 的 font-src 不含 data:，
    // 字型會被擋掉、畫面默默退到後備字
    expect(size).toBeGreaterThan(4 * 1024)
  })

  it('它應該讓子集腳本的 TEXTS 應該跟三處原始字串一致', () => {
    const root = process.cwd()
    const py = readFileSync(`${root}/design/fonts/subset-display.py`, 'utf-8')
    const block = py.match(/TEXTS = \[([\s\S]*?)\n\]/)![1]!
    const texts = [...block.matchAll(/^\s*"([^"]+)",/gm)].map((m) => m[1]!)
    expect(texts).toHaveLength(3)

    const home = readFileSync(`${root}/src/features/home/HomeView.vue`, 'utf-8')
    const h1 = home.match(/<h1[\s\S]*?<\/h1>/)![0]!.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
    expect(texts[0]).toBe(h1)

    const notFound = readFileSync(`${root}/src/views/NotFoundView.vue`, 'utf-8')
    const nfH1 = notFound.match(/<h1[\s\S]*?<\/h1>/)![0]!.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
    expect(texts[1]).toBe(nfH1)

    const about = readFileSync(`${root}/src/features/about/AboutView.vue`, 'utf-8')
    const phrases = about.match(/const CAREER_PHRASES = \[([\s\S]*?)\n\]/)![1]!
    const career = [...phrases.matchAll(/'([^']+)'/g)].map((m) => m[1]!).join('')
    expect(texts[2]).toBe(career)
  })

  it('它應該後備到 Noto Serif TC', () => {
    expect(mainCss).toMatch(/--font-display:\s*'Cactus Classical Serif',\s*'Noto Serif TC'/)
  })
})
