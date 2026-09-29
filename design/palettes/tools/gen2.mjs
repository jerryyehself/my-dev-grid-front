// 藏青第二版：60 卡紙底／30 藏青（色帶、深色區塊、淡藏青卡片）／10 酒紅，黃銅當第三色
import { Theme, Color, BackgroundColor } from '@adobe/leonardo-contrast-colors';
import { formatHex, oklch, rgb, clampChroma } from 'culori';
import fs from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));


const hexRgb = (h) => { const c = rgb(h); return [c.r, c.g, c.b].map((v) => Math.round(v * 255)); };
const lum = (h) => { const [r, g, b] = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const ok = (l, c, h) => formatHex(clampChroma({ mode: 'oklch', l, c, h }, 'oklch'));
// 固定色相/彩度，找出對 bg 剛好達到 target 對比的明度
function solve(h, c, bg, target, toward) {
  let lo = toward === 'light' ? oklch(bg).l : 0, hi = toward === 'light' ? 1 : oklch(bg).l, best;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2; best = ok(mid, c, h);
    const r = cr(best, bg);
    if (toward === 'light') { if (r < target) lo = mid; else hi = mid; } else { if (r < target) hi = mid; else lo = mid; }
  }
  return best;
}
const a = (hex, al) => `rgba(${hexRgb(hex).join(', ')}, ${al})`;

const NAVY_H = 262, BRASS_H = 78, OX_H = 18, PAPER_H = 80;

function leo(mode) {
  const light = mode === 'light';
  // 淺色：暖卡紙底；深色：藏青黑底（暖灰底配藏青色帶在深色下會打架）
  const bgH = light ? PAPER_H : NAVY_H, bgC = light ? 0.006 : 0.022;
  const bg = new BackgroundColor({ name: 'paper', colorKeys: [ok(0.2, bgC, bgH), ok(0.6, bgC, bgH), ok(0.985, bgC * 0.6, bgH)], ratios: [1] });
  const ink = new Color({ name: 'ink', colorKeys: [ok(0.18, 0.035, NAVY_H), ok(0.5, 0.03, NAVY_H), ok(0.95, 0.012, NAVY_H)], ratios: light ? [13.5, 8.5, 5.6, 4.2] : [13.5, 10, 6, 3.4] });
  const tint = new Color({ name: 'tint', colorKeys: [ok(0.12, 0.04, NAVY_H), ok(0.3, 0.05, NAVY_H), ok(0.93, 0.018, NAVY_H), ok(0.99, 0.006, NAVY_H)], ratios: light ? [1.1, 1.05] : [-1.15, 1.12] });
  const chrome = new Color({ name: 'chrome', colorKeys: [ok(0.1, 0.04, NAVY_H), ok(0.28, 0.06, NAVY_H), ok(0.9, 0.02, NAVY_H)], ratios: light ? [14] : [-1.25] });
  const ox = new Color({ name: 'ox', colorKeys: [ok(0.3, 0.1, OX_H), ok(0.42, 0.13, OX_H), ok(0.5, 0.14, OX_H), ok(0.8, 0.07, OX_H)], ratios: light ? [7.2, 9] : [5.2] });
  const brass = new Color({ name: 'brass', colorKeys: [ok(0.4, 0.08, BRASS_H), ok(0.62, 0.11, BRASS_H), ok(0.78, 0.1, BRASS_H), ok(0.9, 0.06, BRASS_H)], ratios: light ? [4.8] : [7.5] });
  const theme = new Theme({ colors: [bg, ink, tint, chrome, ox, brass], backgroundColor: bg, lightness: light ? 97 : 14, output: 'HEX' });
  const o = {}; for (const g of theme.contrastColors) { if (g.background) o.bg = g.background; else o[g.name] = g.values.map((v) => v.value); }
  return o;
}

function build(mode) {
  const light = mode === 'light';
  const L = leo(mode);
  const [inkMain, inkBody, inkMuted, edge] = L.ink;
  const [band, card] = L.tint;
  const chrome = L.chrome[0];
  const accent = light ? L.ox[0] : L.brass[0];          // 深色主題的強調色改用黃銅，酒紅在深底上會變粉
  const brassOnNavy = solve(BRASS_H, 0.11, chrome, 6, 'light');
  const nodes = light ? ['#a33949', '#009393', '#534294'] : ['#ad4251', '#00a7a7', '#8071c8']; // 對新的 canvas-bg 重新搜尋過（validate_palette --pairs all，含對比）
  const t = {
    '--bg-paper-light': L.bg,
    '--bg-paper-dark': band,
    '--bg-nav-footer': chrome,
    '--text-nav-footer': solve(PAPER_H, 0.01, chrome, 12, 'light'),
    '--text-nav-hover': brassOnNavy,
    '--text-ink-main': inkMain,
    '--text-ink-body': inkBody,
    '--text-ink-muted': inkMuted,
    '--text-accent': accent,
    '--border-shelf': a(light ? chrome : brassOnNavy, light ? 0.14 : 0.2),
    '--bg-folder': card,
    '--bg-active-row': a(accent, light ? 0.08 : 0.12),
    '--focus-ring': a(accent, light ? 0.16 : 0.22),
    '--edge-real': edge,
    '--overlay-nodata': solve(NAVY_H, 0.01, band, 1.8, light ? 'dark' : 'light'),
    '--canvas-bg': band,
    '--canvas-dot': a(light ? chrome : brassOnNavy, 0.1),
    '--node-shadow': light ? a(chrome, 0.24) : 'rgba(0, 0, 0, 0.5)',
    '--node-doc': nodes[0], '--node-tech': nodes[1], '--node-impl': nodes[2],
    // ↓ 新增提案（目前 token 裡沒有，要討論過才進 variables.css）
    '--bg-band-strong': light ? chrome : L.tint[0],        // 整條藏青色帶（開頭、COLOPHON、目錄櫃區）
    '--text-on-band': solve(PAPER_H, 0.01, light ? chrome : L.tint[0], 12, 'light'),
    '--accent-brass': brassOnNavy,                          // 深藏青底上的金屬點綴（標籤框、選中底線）
    '--accent-secondary': light ? L.brass[0] : L.ox[0],     // 另一個主題的強調色，當次要強調
  };
  // 分類色的大面積版本：底色上放白字也要 ≥ 4.5
  [['doc', OX_H, 0.13], ['tech', 195, 0.1], ['impl', 290, 0.12]].forEach(([n, h, c]) => {
    t['--cat-fill-' + n] = solve(h, c, '#ffffff', 5, 'dark');
  });
  return t;
}

const PAIRS = [
  ['--text-ink-main', '--bg-paper-light', 4.5], ['--text-ink-main', '--bg-paper-dark', 4.5], ['--text-ink-main', '--bg-folder', 4.5],
  ['--text-ink-body', '--bg-paper-light', 4.5], ['--text-ink-body', '--bg-paper-dark', 4.5], ['--text-ink-body', '--bg-folder', 4.5],
  ['--text-ink-muted', '--bg-paper-light', 4.5], ['--text-ink-muted', '--bg-paper-dark', 4.5], ['--text-ink-muted', '--bg-folder', 4.5],
  ['--text-accent', '--bg-paper-light', 4.5], ['--text-accent', '--bg-paper-dark', 4.5], ['--text-accent', '--bg-folder', 4.5],
  ['--text-nav-footer', '--bg-nav-footer', 4.5], ['--text-nav-hover', '--bg-nav-footer', 4.5],
  ['--text-on-band', '--bg-band-strong', 4.5], ['--accent-brass', '--bg-band-strong', 4.5],
  ['--edge-real', '--canvas-bg', 3],
];
const out = { label: '藏青第二版' };
for (const mode of ['light', 'dark']) {
  const t = build(mode);
  const audit = PAIRS.map(([f, b, min]) => ({ pair: `${f} / ${b}`, ratio: +cr(t[f], t[b]).toFixed(2), min, ok: cr(t[f], t[b]) >= min }));
  ['doc', 'tech', 'impl'].forEach((n) => audit.push({ pair: `#ffffff / --cat-fill-${n}`, ratio: +cr('#ffffff', t['--cat-fill-' + n]).toFixed(2), min: 4.5, ok: cr('#ffffff', t['--cat-fill-' + n]) >= 4.5 }));
  out[mode] = { tokens: t, audit };
  console.log(mode, audit.filter((x) => !x.ok).length ? 'FAIL ' + JSON.stringify(audit.filter((x) => !x.ok)) : `all ${audit.length} pairs pass`);
  console.log(Object.entries(t).filter(([, v]) => v.startsWith('#')).map(([k, v]) => k.slice(2) + '=' + v).join(' '));
}
const P = JSON.parse(fs.readFileSync(__dirname + '/../palettes.json', 'utf8'));
P.B2 = out;
fs.writeFileSync(__dirname + '/../palettes.json', JSON.stringify(P, null, 2));
