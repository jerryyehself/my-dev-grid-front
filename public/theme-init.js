// 在畫面畫出來之前就決定主題 class，避免先閃預設主題、再跳成使用者選的主題（FOUC）。
// 從 index.html 的行內 script 搬出來：CSP 的 script-src 只允許本站檔案，不放行行內 script。
// index.html 用一般（非 module）的 <script src> 同步載入，所以仍然在畫面繪製前執行。
//
// 決定順序：
// 1. localStorage 有記住的選擇就用它（使用者按過切換鈕才會有）。
// 2. 舊版存的是 'library'／'terminal'，讀到就轉成 'light'／'dark'，並把新值寫回去，
//    回訪者的設定才不會消失。
// 3. 都沒有（第一次造訪）就照系統的 prefers-color-scheme，這個結果不寫進 storage，
//    之後系統設定改了，沒按過切換鈕的人會跟著走。
//
// 整段包成 IIFE：這是一般 script，最上層的 var 會變成 window 的全域變數，
// 包起來就不會把 stored／theme 留在 window 上。
// 讀和寫各自一個 try：寫回失敗（額度滿了、被擋）時，剛讀到的值照樣套用，只是沒寫回去。
(function () {
  try {
    var stored = null
    try {
      stored = localStorage.getItem('theme')
    } catch {
      // 私密瀏覽模式擋 storage 時，退回照系統設定，不影響網頁能不能用。
      stored = null
    }
    if (stored === 'library') stored = 'light'
    else if (stored === 'terminal') stored = 'dark'
    if (stored === 'light' || stored === 'dark') {
      try {
        localStorage.setItem('theme', stored)
      } catch {
        // 寫入失敗只代表舊值沒轉成新值，這次照讀到的值顯示。
      }
    } else {
      stored = null
    }
    var theme = stored
    if (!theme) {
      theme =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark')
    }
  } catch {
    // 任何意外都用預設的淺色主題。
  }
})()
