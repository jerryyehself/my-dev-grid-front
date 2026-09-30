// 網站 icon 與社群分享圖（og:image）的產生腳本。
//
// icon 是 D2 版（2026-09-30 使用者選定）：藏青圓角方塊、Libre Caslon Bold 的「IN」、下方一條黃銅線，
// 呼應導覽列字標（米白字、黃銅點綴）跟 active 連結的黃銅底線。
// 瀏覽器畫 favicon 時不會去載網頁字型，所以「IN」要轉成向量路徑，不能在 SVG 裡寫 <text>。
// 顏色是 src/assets/css/variables.css 淺色主題的 --bg-band-strong／--text-on-band／--accent-brass。
//
// 用法：cd design/icon && npm i && node build.mjs
// 需要 curl（抓 Google Fonts 的字型檔）跟環境裡的 Playwright（轉 PNG）。輸出直接寫進 public/。
import opentype from 'opentype.js'
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const PUBLIC = new URL('../../public/', import.meta.url)
const NAVY = '#162541'
const CREAM = '#e8e3dd'
const BRASS = '#c99a4d'

// 不帶瀏覽器 UA 時，Google Fonts 給的是 TTF（opentype.js 讀不了 woff2）；text=IN 只取這兩個字
function fetchCaslonBold() {
  const css = execFileSync('curl', ['-sf', 'https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:wght@700&text=IN']).toString()
  const url = css.match(/url\((https:[^)]+)\)/)[1]
  const buf = execFileSync('curl', ['-sf', url])
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

/**
 * 100×100 的 icon。字高（大寫高度）占 46%，字距 40/1000 em（導覽列字標是 0.06em，縮小後收一點），
 * 字的墨跡水平置中；基線比垂直置中再往上 4，下面空出位置放黃銅線（y=80，40×6）。
 * 6 單位在 16px 時約 1px，再細就會糊掉。
 */
function iconSvg(font, { radius }) {
  const size = 100
  const capHeight = font.charToGlyph('I').getBoundingBox().y2
  const fontSize = ((0.46 * size) / capHeight) * font.unitsPerEm
  const scale = fontSize / font.unitsPerEm
  const track = 40
  const glyphs = [...'IN'].map((ch) => font.charToGlyph(ch))
  let x = 0
  const placed = glyphs.map((g) => {
    const at = x
    x += g.advanceWidth + track
    return { g, at }
  })
  const inkLeft = placed[0].at + placed[0].g.getBoundingBox().x1
  const last = placed[placed.length - 1]
  const inkRight = last.at + last.g.getBoundingBox().x2
  const originX = (size - (inkRight - inkLeft) * scale) / 2 - inkLeft * scale
  const baseline = size / 2 + (0.46 * size) / 2 - 4
  const d = placed.map(({ g, at }) => g.getPath(originX + at * scale, baseline, fontSize).toPathData(2)).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${NAVY}"/>` +
    `<path d="${d}" fill="${CREAM}"/>` +
    `<rect x="30" y="80" width="40" height="6" fill="${BRASS}"/>` +
    `</svg>\n`
  )
}

/** .ico 直接包 PNG（Vista 以後的格式，現在的瀏覽器都讀得懂），不用另外裝影像處理套件 */
function packIco(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  let offset = header.length
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, e)
    header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt16LE(1, e + 4)
    header.writeUInt16LE(32, e + 6)
    header.writeUInt32LE(data.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...pngs.map((p) => p.data)])
}

const ogHtml = (mark) => `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@700&family=Libre+Caslon+Text:wght@700&family=Noto+Serif+TC:wght@500;900&display=block">
<style>
  html,body{margin:0}
  .card{width:1200px;height:630px;box-sizing:border-box;padding:88px 96px;background:${NAVY};color:${CREAM};
        display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
  .kicker{display:flex;align-items:center;gap:14px;font:700 20px 'Courier Prime',monospace;letter-spacing:.24em;color:${BRASS}}
  .kicker i{display:block;width:48px;height:3px;background:${BRASS}}
  .word{font:700 104px 'Libre Caslon Text',Georgia,serif;letter-spacing:.06em;line-height:1;margin:28px 0 0}
  .word b{color:${BRASS};font-weight:700;margin:0 .28em}
  .tag{font:900 52px 'Noto Serif TC',serif;letter-spacing:.04em;margin:30px 0 0}
  .sub{font:500 26px 'Noto Serif TC',serif;opacity:.85;margin:14px 0 0}
  .foot{display:flex;justify-content:space-between;align-items:flex-end;font:700 22px 'Courier Prime',monospace;letter-spacing:.12em}
  .mark{width:96px;height:96px}
</style>
<div class="card">
  <div>
    <div class="kicker"><i></i>JERRY YEH</div>
    <div class="word">IN<b>/</b>ARCHIVE</div>
    <div class="tag">私人藏書，公開目錄</div>
    <div class="sub">文章、技術與專案，編成可以查詢的目錄，彼此以雙向關係連結。</div>
  </div>
  <div class="foot"><span>jerrylib.com</span><img class="mark" src="data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}"></div>
</div>`

const font = fetchCaslonBold()
const rounded = iconSvg(font, { radius: 18 })
// iOS 會自己把主畫面圖示裁成圓角，透明的角會變黑，所以蘋果用的版本不做圓角
const square = iconSvg(font, { radius: 0 })
fs.writeFileSync(new URL('favicon.svg', PUBLIC), rounded)

const proxy = process.env.HTTPS_PROXY
const browser = await chromium.launch({
  // 這個專案的雲端環境只能透過代理連外，而且代理只收 CONNECT，所以只讓 https 走代理（同 palettes/tools/shots.mjs）
  args: proxy ? ['--no-sandbox', '--proxy-server=https=' + proxy.replace(/^https?:\/\//, '')] : [],
})
async function render(html, width, height, transparent) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const png = await page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width, height } })
  await page.close()
  return png
}
const svgPage = (svg, px) =>
  `<style>html,body{margin:0;background:transparent}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${px}" height="${px}" style="display:block">`

const ico = []
for (const px of [16, 32]) ico.push({ size: px, data: await render(svgPage(rounded, px), px, px, true) })
fs.writeFileSync(new URL('favicon.ico', PUBLIC), packIco(ico))
fs.writeFileSync(new URL('apple-touch-icon.png', PUBLIC), await render(svgPage(square, 180), 180, 180, false))
fs.writeFileSync(new URL('og-image.png', PUBLIC), await render(ogHtml(rounded), 1200, 630, false))
await browser.close()
console.log('寫入 public/：favicon.svg、favicon.ico（16＋32）、apple-touch-icon.png（180）、og-image.png（1200×630）')
