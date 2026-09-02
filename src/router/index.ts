// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: {
        tag: 'Home',
        title: 'IN ARCHIVE',
        subtitle: '正在孵化的想法，以及最近的輸入與輸出動態。',
      },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
      // 💡 配置驅動 UI：回歸直覺、輕鬆的個人與系統分類，拒絕過度工程
      meta: {
        type: 'profile',
        tag: 'About Me',
        title: 'IN',
        subtitle: 'Full-Stack Developer / Artifact Sandbox',
        // About 頁自己畫了一個滿版橫幅當作大標題，跟 MainLayout 的通用表頭是同一件事，
        // 兩個都顯示會重複兩次姓名/職稱，所以這頁把通用表頭關掉，只留捲動追蹤列用同一組文字
        hideHeader: true,
      },
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('@/views/ProjectsView.vue'),
      meta: {
        tag: 'Dashboard & Tools',
        title: 'Production Artifacts',
        subtitle: '工程履約管理、ISBN 掃描器與 GAS 自動化工作流整合紀錄',
        // mockup 設計是 1120px，比全站預設的 1024px 寬，主從式版面才有足夠的呼吸空間
        contentWidth: '1120px',
      },
    },
    {
      path: '/articles',
      name: 'articles',
      component: () => import('@/views/ArticlesView.vue'),
      meta: {
        tag: 'Articles',
        title: 'My Articles',
        subtitle: '自己記錄',
      },
    },
    {
      path: '/articles/:id',
      name: 'article-detail',
      component: () => import('@/views/ArticleDetailView.vue'),
      meta: {
        // tag/title 只是導航到頁面前的預設佔位，掛載後由 ArticleDetailView 覆寫成真正的文章標題，
        // 不然通用表頭跟捲動追蹤列會一直顯示這行字面上的「Article Detail」，跟下面真正的文章標題重複又對不上
        tag: 'Article Detail',
        title: 'Article Detail',
        subtitle: '深入閱讀',
        hideHeader: true,
      },
    },
    {
      path: '/graph',
      name: 'graph',
      component: () => import('@/views/GraphPocView.vue'),
      meta: {
        tag: 'Knowledge Graph',
        title: '知識圖譜',
        subtitle: '文件、技巧與實作之間的連結,2D 與 3D 兩種檢視',
      },
    },
  ],
})

export default router
