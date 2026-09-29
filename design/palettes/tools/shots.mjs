// 把候選配色用 CSS 覆寫注入真實網站，逐頁截圖（不改任何程式碼）
import { chromium } from 'playwright';
import fs from 'node:fs';
const P = JSON.parse(fs.readFileSync(new URL('../palettes.json', import.meta.url), 'utf8'));
const OUT = process.env.SHOTS_DIR || '/tmp/palette-shots';
fs.mkdirSync(OUT, { recursive: true });

const css = (id) => {
  if (id === 'current') return '';
  const block = (t) => Object.entries(t).map(([k, v]) => `${k}: ${v} !important;`).join('\n');
  return `:root, .theme-library { ${block(P[id].light.tokens)} }\n.theme-terminal { ${block(P[id].dark.tokens)} }`;
};

const PAGES = [['home', '/'], ['articles', '/articles'], ['projects', '/projects'], ['graph', '/graph'], ['about', '/about']];
const IDS = (process.argv[2] || 'current,A,B').split(',');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    // 只讓 https 走代理，http://localhost 直連（代理只收 CONNECT，bypass 清單在這裡無效）
    args: ['--no-sandbox', '--proxy-server=https=' + process.env.HTTPS_PROXY.replace(/^https?:\/\//, '')],
  });
  for (const id of IDS) {
    for (const theme of ['library', 'terminal']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.addInitScript(([c, th]) => {
        document.addEventListener('DOMContentLoaded', () => {
          if (c) { const s = document.createElement('style'); s.id = 'palette-override'; s.textContent = c; document.head.appendChild(s); }
          document.documentElement.classList.toggle('theme-terminal', th === 'terminal');
        });
        try { localStorage.setItem('theme', th); } catch { /* 沒有 localStorage 就略過 */ }
      }, [css(id), theme]);
      for (const [name, path] of PAGES) {
        await page.goto('http://localhost:5173' + path, { waitUntil: 'networkidle' }).catch(() => {});
        await page.evaluate((th) => document.documentElement.classList.toggle('theme-terminal', th === 'terminal'), theme);
        await page.waitForTimeout(name === 'graph' || name === 'home' ? 2500 : 800);
        await page.screenshot({ path: `${OUT}/${id}-${theme}-${name}.png` });
      }
      await page.close();
    }
  }
  await browser.close();
  console.log(fs.readdirSync(OUT).length, 'shots');
})();
