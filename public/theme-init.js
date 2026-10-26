// 在畫面畫出來之前就決定主題 class，避免先閃預設主題、再跳成使用者選的主題（FOUC）。
// 從 index.html 的行內 script 搬出來：CSP 的 script-src 只允許本站檔案，不放行行內 script。
// index.html 用一般（非 module）的 <script src> 同步載入，所以仍然在畫面繪製前執行。
try {
  if (localStorage.getItem('theme') === 'terminal') {
    document.documentElement.classList.add('theme-terminal')
  }
} catch (e) {
  // 私密瀏覽模式擋 storage 時，就用預設主題，不影響網頁能不能用。
}
