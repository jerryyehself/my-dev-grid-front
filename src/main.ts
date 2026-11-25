import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/useAuthStore'
import { initInputModality } from './composables/useInputModality'
import { installPageTransition } from './layouts/pageTransition'

import '@/assets/css/main.css'

// 記住最後一次輸入是鍵盤還是指標：鍵盤觸發的開合不播動畫（見 composables/useInputModality.ts）
initInputModality()

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
// 用 refresh cookie 換回重新整理前的登入狀態。不 await：不需要登入的頁面照常
// 立刻顯示，需要登入的頁面由路由守衛等它做完（見 router/index.ts）。
useAuthStore(pinia).restore()
app.use(router)
// 換頁轉場：記下每次換頁是不是站內點連結，決定要不要播、往哪邊（見 layouts/pageTransition.ts）
installPageTransition(router)

app.mount('#app')
