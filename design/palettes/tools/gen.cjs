// 從種子色產生整套 token（淺色＋深色），用 Leonardo 依對比目標反推色值，
// 再用 culori 補 Leonardo 不處理的「對深色導覽列」配色與節點分類色。
const { Theme, Color, BackgroundColor, contrast } = require('@adobe/leonardo-contrast-colors');
const { formatHex, oklch, rgb, clampChroma } = require('culori');
const fs = require('fs');

const hexRgb = (h) => { const c = rgb(h); return [c.r, c.g, c.b].map((v) => Math.round(v * 255)); };
const cr = (a, b) => {
  const L = (h) => { const [r, g, bl] = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// 固定色相/彩度，二分搜尋 OKLCH 明度，讓顏色對 bg 達到指定對比（toward: 'light' | 'dark'）
function solve(h, c, bg, target, toward) {
  let lo = toward === 'light' ? oklch(bg).l : 0, hi = toward === 'light' ? 1 : oklch(bg).l;
  let best;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const hex = formatHex(clampChroma({ mode: 'oklch', l: mid, c, h }, 'oklch'));
    const r = cr(hex, bg);
    best = hex;
    if (toward === 'light') { if (r < target) lo = mid; else hi = mid; }
    else { if (r < target) hi = mid; else lo = mid; }
  }
  return best;
}

function leonardo(spec, mode) {
  const bg = new BackgroundColor({ name: 'neutral', colorKeys: spec.neutralKeys, ratios: mode === 'light' ? [1.07, 4.2, 5.4, 8.5, 13.5] : [-1.12, 3.2, 6, 10, 13.5] });
  const accent = new Color({ name: 'accent', colorKeys: spec.accentKeys, ratios: mode === 'light' ? [spec.accentRatioLight || 5.4, 8.5] : [6.5, 4.8] });
  const chrome = new Color({ name: 'chrome', colorKeys: spec.chromeKeys, ratios: mode === 'light' ? [14] : [-1.18] });
  const theme = new Theme({ colors: [bg, accent, chrome], backgroundColor: bg, lightness: mode === 'light' ? 98 : 15, output: 'HEX' });
  const out = {}; for (const g of theme.contrastColors) { if (g.background) out.bg = g.background; else out[g.name] = g.values.map((v) => v.value); }
  return out;
}

const a = (hex, al) => `rgba(${hexRgb(hex).join(', ')}, ${al})`;

function build(spec, mode) {
  const L = leonardo(spec, mode);
  const [nPaperDark, nEdge, nMuted, nBody, nMain] = L.neutral;
  const [acc, accDeep] = L.accent;
  const chrome = L.chrome[0];
  const ch = oklch(chrome);
  const navText = solve(spec.neutralHue, 0.012, chrome, 11, 'light');
  const navHover = solve(spec.navHoverHue, spec.navHoverC, chrome, 5.2, 'light');
  const t = {
    '--bg-paper-light': L.bg,
    '--bg-paper-dark': nPaperDark,
    '--bg-nav-footer': chrome,
    '--text-nav-footer': navText,
    '--text-nav-hover': navHover,
    '--text-ink-main': nMain,
    '--text-ink-body': nBody,
    '--text-ink-muted': nMuted,
    '--text-accent': acc,
    '--border-shelf': a(mode === 'light' ? accDeep : acc, mode === 'light' ? 0.12 : 0.2),
    '--bg-folder': a(mode === 'light' ? accDeep : acc, mode === 'light' ? 0.04 : 0.07),
    '--bg-active-row': a(acc, mode === 'light' ? 0.07 : 0.1),
    '--focus-ring': a(acc, mode === 'light' ? 0.12 : 0.18),
    '--edge-real': nEdge,
    '--overlay-nodata': solve(spec.neutralHue, 0.01, nPaperDark, 1.9, mode === 'light' ? 'dark' : 'light'),
    '--canvas-bg': nPaperDark,
    '--canvas-dot': a(mode === 'light' ? accDeep : acc, 0.1),
    '--node-shadow': mode === 'light' ? a(nMain, 0.28) : 'rgba(0, 0, 0, 0.5)',
  };
  // 節點分類色：固定色相與彩度，明度落在 dataviz 驗證器的亮度帶中間
  const Lnode = mode === 'light' ? 0.56 : 0.6;
  if (spec.nodeHex) { ['doc', 'tech', 'impl'].forEach((n, i) => { t['--node-' + n] = spec.nodeHex[mode][i]; }); return t; }
  spec.nodes.forEach(([name, h, c]) => { t['--node-' + name] = formatHex(clampChroma({ mode: 'oklch', l: Lnode, c, h }, 'oklch')); });
  return t;
}

// 需要檢查的文字/底色組合
const PAIRS = [
  ['--text-ink-main', '--bg-paper-light', 4.5], ['--text-ink-main', '--bg-paper-dark', 4.5],
  ['--text-ink-body', '--bg-paper-light', 4.5], ['--text-ink-body', '--bg-paper-dark', 4.5],
  ['--text-ink-muted', '--bg-paper-light', 4.5], ['--text-ink-muted', '--bg-paper-dark', 4.5],
  ['--text-accent', '--bg-paper-light', 4.5], ['--text-accent', '--bg-paper-dark', 4.5],
  ['--text-nav-footer', '--bg-nav-footer', 4.5], ['--text-nav-hover', '--bg-nav-footer', 4.5],
  ['--edge-real', '--canvas-bg', 3],
];
function audit(t) {
  return PAIRS.map(([f, b, min]) => ({ pair: `${f} / ${b}`, ratio: +cr(t[f], t[b]).toFixed(2), min, ok: cr(t[f], t[b]) >= min }));
}

const SPECS = JSON.parse(fs.readFileSync(__dirname + '/specs.json', 'utf8'));
const result = {};
for (const [id, spec] of Object.entries(SPECS)) {
  result[id] = { label: spec.label };
  for (const mode of ['light', 'dark']) {
    const t = build(spec, mode);
    result[id][mode] = { tokens: t, audit: audit(t) };
  }
}
fs.writeFileSync(__dirname + '/../palettes.json', JSON.stringify(result, null, 2));
for (const [id, r] of Object.entries(result)) {
  for (const mode of ['light', 'dark']) {
    const bad = r[mode].audit.filter((x) => !x.ok);
    console.log(id, mode, bad.length ? 'FAIL ' + JSON.stringify(bad) : 'all pairs pass');
    const t = r[mode].tokens;
    console.log('  ', ['--bg-paper-light', '--bg-paper-dark', '--bg-nav-footer', '--text-ink-main', '--text-ink-body', '--text-ink-muted', '--text-accent', '--text-nav-hover', '--node-doc', '--node-tech', '--node-impl'].map((k) => k.replace(/^--/, '') + '=' + t[k]).join(' '));
  }
}
