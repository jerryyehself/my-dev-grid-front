// mockup 共用：依網址參數切主題／狀態，插入導覽列、頁首、頁尾。
//   ?theme=dark      深色（.theme-terminal）
//   ?state=path      路徑查詢有結果的狀態
//   ?view=3d         3D 檢視
(function () {
  const q = new URLSearchParams(location.search)
  window.MOCK = { theme: q.get('theme') === 'dark' ? 'dark' : 'light', state: q.get('state') || 'explore', view: q.get('view') === '3d' ? '3d' : '2d' }
  if (MOCK.theme === 'dark') document.documentElement.classList.add('theme-terminal')
  document.documentElement.dataset.state = MOCK.state
  document.documentElement.dataset.view = MOCK.view

  window.renderChrome = function () {
    const nav = document.getElementById('nav')
    if (nav) nav.outerHTML = `
      <nav class="nav"><div class="nav-inner">
        <span class="wordmark">IN<span class="slash">/</span>ARCHIVE</span>
        <div class="nav-links"><span>HOME</span><span>ARTICLES</span><span>PROJECTS</span><span class="on">GRAPH</span><span>ABOUT</span></div>
        <div class="nav-right"><span>登入</span><span class="pill">${MOCK.theme === 'dark' ? '☽ 深色' : '☀ 淺色'}</span></div>
        <span class="burger"><i></i><i></i><i></i></span>
      </div></nav>`
    const head = document.getElementById('page-head')
    if (head) head.outerHTML = `
      <header class="page-head">
        <div class="page-tag">Knowledge Graph</div>
        <h1 class="page-title">知識圖譜</h1>
        <p class="page-sub">文件、技術與實作之間的連結，2D 與 3D 兩種檢視</p>
      </header>`
    const foot = document.getElementById('footer')
    if (foot) foot.outerHTML = `<footer class="footer">© 2026 Jerry Yeh</footer>`
  }

  // 共用小零件
  window.SEG = (on) => `<div class="seg" role="group" aria-label="圖譜檢視方式"><span class="${on === '2d' ? 'on' : ''}">2D</span><span class="${on === '3d' ? 'on' : ''}">3D</span></div>`
  window.SEARCH_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" stroke-width="2" stroke-linecap="round" opacity=".6"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
  window.SWAP_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>`
  window.ICON = {
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    fit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  }
  window.ARROW_KEY = `<svg class="key-arrow" viewBox="0 0 22 10"><line x1="1" y1="5" x2="16" y2="5" stroke="var(--edge-real)" stroke-width="1.5"/><path d="M14,1 L21,5 L14,9 z" fill="var(--edge-real)"/></svg>`
  window.SIZE_KEY = `<svg width="46" height="22" viewBox="0 0 46 22" style="vertical-align:middle"><circle cx="5" cy="11" r="4" fill="none" stroke="var(--text-ink-muted)" stroke-width="1.3"/><circle cx="16" cy="11" r="6" fill="none" stroke="var(--text-ink-muted)" stroke-width="1.3"/><circle cx="34" cy="11" r="10" fill="none" stroke="var(--text-ink-muted)" stroke-width="1.3"/></svg>`

  // 示範資料快照的真實數字（graphDemoFixture.json）
  window.STATS = { doc: 4, tech: 12, impl: 2, edges: 20 }
  // 路徑：PHP 官方文件 → my-dev-grid-front。這是快照裡真的存在的一條最短路徑（5 站），
  // 後端 BFS 實際挑哪一條（中間經過 CSS、Vue 或 Shell 都一樣短）以 API 為準。
  window.PATH = ['documentation-1', 'technique-1', 'implementation-1', 'technique-7', 'implementation-2']
  // 每一段寫成首頁同一套關係句（graphRelationPhrase.ts，D-73），英文名稱只當小字
  window.PATH_HOPS = [
    { s: '「PHP 官方文件」說明「PHP」', p: 'specs' },
    { s: '「PHP」用在「my-dev-grid」', p: 'usedBy' },
    { s: '「CSS」用在「my-dev-grid」', p: 'usedBy' },
    { s: '「CSS」用在「my-dev-grid-front」', p: 'usedBy' },
  ]
  window.TYPE_LABEL = { documentation: '文件', technique: '技術', implementation: '實作' }
  window.TYPE_VAR = { documentation: 'var(--node-doc)', technique: 'var(--node-tech)', implementation: 'var(--node-impl)' }

  window.routeHTML = function () {
    const B = window.GRAPH_BY_ID
    let h = '<ol class="route">'
    PATH.forEach((id, i) => {
      const n = B[id]
      h += `<li class="stop" style="--c:${TYPE_VAR[n.type]}">${n.label}<span class="route-type">${TYPE_LABEL[n.type]}</span></li>`
      if (PATH_HOPS[i]) h += `<li class="hop">${PATH_HOPS[i].s}<span class="pred">${PATH_HOPS[i].p}</span></li>`
    })
    return h + '</ol>'
  }
})()
