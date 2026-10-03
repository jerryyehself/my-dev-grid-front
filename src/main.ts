import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/useAuthStore'

import '@/assets/css/main.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
// 用 refresh cookie 換回重新整理前的登入狀態。不 await：不需要登入的頁面照常
// 立刻顯示，需要登入的頁面由路由守衛等它做完（見 router/index.ts）。
useAuthStore(pinia).restore()
app.use(router)

app.mount('#app')
