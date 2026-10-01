// /graph 改版 mockup：用 graph-data.js 的靜態座標畫 SVG，代替 force-graph 的 canvas。
// 只為了看「頁面結構、圖例、標籤、顏色、質感」，不是力模擬，也不是實作。
//
// 跟現況（PR #108 的 GraphPoc2D）不同、而且是這次畫稿要提的地方：
// - 名稱有一圈跟畫布同色的描邊（halo），線從字底下穿過也讀得到
// - 名稱先試「下、右、左、上」四個位置，四個都撞到才不畫（現況只試下方一個位置）
// - 線的終點有小箭頭，從主詞指向受詞（D-71）：文件 → 技術 → 實作、laravel → PHP（requires）
// - 節點外圈一道畫布色的細環，線跟節點交接處不會糊成一團
(function () {
  const NS = 'http://www.w3.org/2000/svg'
  const COLOR = { documentation: 'var(--node-doc)', technique: 'var(--node-tech)', implementation: 'var(--node-impl)' }
  const G = window.GRAPH
  const byId = Object.fromEntries(G.nodes.map((n) => [n.id, n]))
  const nbr = {}
  for (const e of G.edges) {
    ;(nbr[e.source] ||= new Set()).add(e.target)
    ;(nbr[e.target] ||= new Set()).add(e.source)
  }
  window.GRAPH_NEIGHBORS = nbr
  window.GRAPH_BY_ID = byId

  const measureCtx = document.createElement('canvas').getContext('2d')
  function textWidth(t, px, weight) {
    measureCtx.font = `${weight || 500} ${px}px system-ui, sans-serif`
    return measureCtx.measureText(t).width
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag)
    for (const k in attrs) e.setAttribute(k, attrs[k])
    if (parent) parent.appendChild(e)
    return e
  }

  // opts.reserve: 畫布上被浮動控制項蓋住的區域，名稱不擺進去
  // opts: { path: [ids], selected: id, focus: {id, depth}, labelPx, scaleMax, pad, mode: '2d'|'3d', offsetX, offsetY }
  window.drawGraph = function (svg, opts = {}) {
    const W = svg.clientWidth || svg.parentNode.clientWidth
    const H = svg.clientHeight || svg.parentNode.clientHeight
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.innerHTML = ''
    // 畫布上的字跟 force-graph 一樣用系統無襯線字（深色主題的內文是等寬字，但畫布不跟）
    svg.style.fontFamily = 'system-ui, sans-serif'
    const labelPx = opts.labelPx || 13
    const pad = opts.pad || { l: 90, r: 90, t: 40, b: 40 }
    if (opts.mode === '3d') return draw3d(svg, W, H, opts, labelPx)

    const xs = G.nodes.map((n) => n.x), ys = G.nodes.map((n) => n.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const s = Math.min((W - pad.l - pad.r) / (maxX - minX), (H - pad.t - pad.b) / (maxY - minY), opts.scaleMax || 2.2)
    const cx = pad.l + (W - pad.l - pad.r) / 2 + (opts.offsetX || 0)
    const cy = pad.t + (H - pad.t - pad.b) / 2 + (opts.offsetY || 0)
    const rk = Math.max(1, Math.min(1.5, s * 0.9))
    const P = {}
    for (const n of G.nodes) P[n.id] = { x: cx + (n.x - (minX + maxX) / 2) * s, y: cy + (n.y - (minY + maxY) / 2) * s, r: n.r * rk }

    // 誰亮、誰淡
    let lit = null
    let litEdge = null
    if (opts.path) {
      lit = new Set(opts.path)
      litEdge = (e) => { const i = opts.path.indexOf(e.source), j = opts.path.indexOf(e.target); return i >= 0 && j >= 0 && Math.abs(i - j) === 1 }
    } else if (opts.focus) {
      lit = new Set([opts.focus.id])
      let frontier = [opts.focus.id]
      for (let d = 0; d < (opts.focus.depth || 1); d++) {
        const next = []
        for (const id of frontier) for (const m of nbr[id] || []) if (!lit.has(m)) { lit.add(m); next.push(m) }
        frontier = next
      }
      litEdge = (e) => lit.has(e.source) && lit.has(e.target)
    } else if (opts.selected) {
      lit = new Set([opts.selected, ...(nbr[opts.selected] || [])])
      litEdge = (e) => e.source === opts.selected || e.target === opts.selected
    }
    const hiEdge = litEdge
    const strong = (e) => (opts.path || opts.selected) && hiEdge && hiEdge(e)
    // 點選（不是滑過）只加框、加亮相連的線，不淡化其他節點：點下去之後還看得到整張圖的脈絡
    const keepLit = lit
    if (opts.selected && !opts.path && !opts.focus && !opts.fadeOnSelect) { lit = null; litEdge = () => true }

    const defs = el('defs', {}, svg)
    for (const [name, color] of [['a-base', 'var(--edge-real)'], ['a-hi', 'var(--text-accent)']]) {
      const m = el('marker', { id: name + (opts.uid || ''), viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, defs)
      el('path', { d: 'M0,1 L9,5 L0,9 z', fill: color }, m)
    }
    const gE = el('g', {}, svg), gN = el('g', {}, svg), gL = el('g', {}, svg)

    for (const e of G.edges) {
      const a = P[e.source], b = P[e.target]
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy)
      const ux = dx / L, uy = dy / L
      const hi = strong(e)
      const faded = lit && !litEdge(e)
      el('line', {
        x1: a.x + ux * (a.r + 1.5), y1: a.y + uy * (a.r + 1.5),
        x2: b.x - ux * (b.r + 3), y2: b.y - uy * (b.r + 3),
        stroke: hi ? 'var(--text-accent)' : 'var(--edge-real)',
        'stroke-width': hi ? 2.6 : 1.3,
        opacity: faded ? 0.15 : hi ? 1 : 0.85,
        'marker-end': opts.arrows === false ? '' : `url(#${hi ? 'a-hi' : 'a-base'}${opts.uid || ''})`,
      }, gE)
    }
    for (const n of G.nodes) {
      const p = P[n.id]
      const faded = lit && !lit.has(n.id)
      const g = el('g', { opacity: faded ? 0.22 : 1 }, gN)
      if (opts.path && lit.has(n.id)) el('circle', { cx: p.x, cy: p.y, r: p.r + 3.5, fill: 'none', stroke: 'var(--text-accent)', 'stroke-width': 2.5 }, g)
      if ((opts.selected === n.id) || (opts.focus && opts.focus.id === n.id)) {
        el('circle', { cx: p.x, cy: p.y, r: p.r + 9, fill: 'none', stroke: 'var(--text-accent)', 'stroke-width': 1.5, opacity: 0.35 }, g)
        el('circle', { cx: p.x, cy: p.y, r: p.r + 3.5, fill: 'none', stroke: 'var(--text-ink-main)', 'stroke-width': 2 }, g)
      }
      el('circle', { cx: p.x, cy: p.y, r: p.r, fill: COLOR[n.type], stroke: 'var(--canvas-bg)', 'stroke-width': 1.5 }, g)
    }

    // 名稱：優先序＝亮起來的 > 關係多的；四個位置都撞到才略過
    const placed = []
    const hitsNode = (box, selfId) => G.nodes.some((m) => {
      if (m.id === selfId) return false
      const q = P[m.id]
      const nx = Math.max(box.x0, Math.min(q.x, box.x1)), ny = Math.max(box.y0, Math.min(q.y, box.y1))
      return Math.hypot(q.x - nx, q.y - ny) < q.r + 1
    })
    const order = [...G.nodes].filter((n) => !(lit && !lit.has(n.id)) || opts.labelFaded).sort((a, b) => Number(!!(keepLit && keepLit.has(b.id))) - Number(!!(keepLit && keepLit.has(a.id))) || b.degree - a.degree)
    for (const n of order) {
      const p = P[n.id]
      const w = textWidth(n.label, labelPx, 500), h = labelPx * 1.2, gap = 4
      const cands = [
        { x: p.x, y: p.y + p.r + gap + h / 2, anchor: 'middle', x0: p.x - w / 2, y0: p.y + p.r + gap },
        { x: p.x + p.r + gap + 2, y: p.y, anchor: 'start', x0: p.x + p.r + gap + 2, y0: p.y - h / 2 },
        { x: p.x - p.r - gap - 2, y: p.y, anchor: 'end', x0: p.x - p.r - gap - 2 - w, y0: p.y - h / 2 },
        { x: p.x, y: p.y - p.r - gap - h / 2, anchor: 'middle', x0: p.x - w / 2, y0: p.y - p.r - gap - h },
      ]
      let pick = null
      for (const c of cands) {
        const box = { x0: c.x0 - 2, y0: c.y0 - 1, x1: c.x0 + w + 2, y1: c.y0 + h + 1 }
        if (box.x0 < 4 || box.x1 > W - 4 || box.y0 < 4 || box.y1 > H - 4) continue
        if ((opts.reserve || []).some((q) => box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0)) continue
        if (placed.some((q) => box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0)) continue
        if (hitsNode(box, n.id)) continue
        pick = { c, box }
        break
      }
      if (!pick) continue
      placed.push(pick.box)
      const t = el('text', {
        x: pick.c.x, y: pick.c.y, 'text-anchor': pick.c.anchor, 'dominant-baseline': 'central',
        'font-size': labelPx, 'font-weight': (keepLit && keepLit.has(n.id)) || n.degree >= 5 ? 600 : 500,
        fill: 'var(--text-ink-body)', stroke: 'var(--canvas-bg)', 'stroke-width': 4, 'stroke-linejoin': 'round', 'paint-order': 'stroke',
      }, gL)
      t.textContent = n.label
    }
    return { P, scale: s }
  }

  // 3D 的靜態示意：三層斜放的平面（文件在前上、技術中、實作在後下），各層名稱用 DOM 等級的 13px 字，
  // 節點名稱只標關係多的，其餘交給點選。這是「鏡頭預設就斜著看」的提案，不是 three.js 的實際畫面。
  function draw3d(svg, W, H, opts, labelPx) {
    const order = ['documentation', 'technique', 'implementation']
    const label = { documentation: '文件', technique: '技術', implementation: '實作' }
    const xs = G.nodes.map((n) => n.x), ys = G.nodes.map((n) => n.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const s = Math.min((W - 220) / ((maxX - minX) + 80 + 0.45 * (maxY - minY + 80)), 1.9)
    const layerGap = Math.min(H * 0.27, 150)
    const cx = W / 2, cy = H / 2
    const proj = (x, y, type) => {
      const k = order.indexOf(type) - 1
      const X = cx + 40 + (x - (minX + maxX) / 2) * s + (y - (minY + maxY) / 2) * s * 0.45
      const Y = cy + k * layerGap + (y - (minY + maxY) / 2) * s * 0.28
      return { X, Y }
    }
    const gP = el('g', {}, svg)
    for (const t of order) {
      const pad = 40
      const c = [proj(minX - pad, minY - pad, t), proj(maxX + pad, minY - pad, t), proj(maxX + pad, maxY + pad, t), proj(minX - pad, maxY + pad, t)]
      el('polygon', { points: c.map((p) => `${p.X},${p.Y}`).join(' '), fill: COLOR[t], 'fill-opacity': 0.07, stroke: COLOR[t], 'stroke-opacity': 0.45, 'stroke-dasharray': '4 4' }, gP)
      const lt = el('text', { x: c[0].X + 14, y: c[0].Y + 22, 'font-size': 14, 'font-weight': 700, fill: COLOR[t] }, gP)
      lt.textContent = label[t] + '層'
    }
    const P = {}
    for (const n of G.nodes) { const q = proj(n.x, n.y, n.type); P[n.id] = { x: q.X, y: q.Y, r: n.r * 1.15 } }
    const gE = el('g', {}, svg), gN = el('g', {}, svg)
    for (const e of G.edges) {
      const a = P[e.source], b = P[e.target]
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: 'var(--edge-real)', 'stroke-width': 1.2, opacity: 0.7 }, gE)
    }
    const sorted = [...G.nodes].sort((a, b) => P[a.id].y - P[b.id].y)
    for (const n of sorted) {
      const p = P[n.id]
      el('circle', { cx: p.x, cy: p.y, r: p.r, fill: COLOR[n.type], stroke: 'var(--canvas-bg)', 'stroke-width': 1.5 }, gN)
      if (n.degree >= 3) {
        const t = el('text', { x: p.x, y: p.y + p.r + 12, 'text-anchor': 'middle', 'font-size': labelPx, 'font-weight': 600, fill: 'var(--text-ink-body)', stroke: 'var(--canvas-bg)', 'stroke-width': 4, 'paint-order': 'stroke' }, gN)
        t.textContent = n.label
      }
    }
  }
})()
