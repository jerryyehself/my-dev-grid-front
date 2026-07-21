// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import AboutView from '@/views/AboutView.vue'
import ArticlesView from '@/views/ArticlesView.vue'
import ArticleDetailView from '@/views/ArticleDetailView.vue'
import ProjectsView from '@/views/ProjectsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/about',
      name: 'about',
      component: AboutView,
      // 💡 配置驅動 UI：回歸直覺、輕鬆的個人與系統分類，拒絕過度工程
      meta: {
        type: 'profile',
        tag: 'About Me',
        title: 'Jerry Yeh',
        subtitle: 'Full-Stack Developer / Artifact Sandbox',
      },
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => ProjectsView,
      meta: {
        tag: 'Dashboard & Tools',
        title: 'Production Artifacts',
        subtitle: '工程履約管理、ISBN 掃描器與 GAS 自動化工作流整合紀錄',
      },
    },
    {
      path: '/articles',
      name: 'articles',
      component: () => ArticlesView,
      meta: {
        tag: 'Articles',
        title: 'My Articles',
        subtitle: '自己記錄',
      },
    },
    {
      path: '/articles/:id',
      name: 'article-detail',
      component: () => ArticleDetailView,
      meta: {
        tag: 'Article Detail',
        title: 'Article Detail',
        subtitle: '深入閱讀',
      },
    },
  ],
})

export default router
