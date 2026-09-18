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
      // 放在 /articles/:id 前面:vue-router 的靜態片段本來就排在動態片段之前，
      // 順序不影響比對結果，但排在前面才讀得出「manage 不是某篇文章的 id」
      path: '/articles/manage',
      name: 'article-manage',
      component: () => import('@/views/ArticleManageView.vue'),
      meta: {
        tag: 'Manage Articles',
        title: '文章管理',
        subtitle: '文章清單與草稿狀態',
        // 這頁自己畫了表頭與動作列，通用表頭會把同一組標題再顯示一次
        hideHeader: true,
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
      path: '/articles/:id/edit',
      name: 'article-editor',
      component: () => import('@/views/ArticleEditorView.vue'),
      meta: {
        tag: 'Article Editor',
        title: '編輯文章',
        subtitle: '內文用 Markdown，邊註可以增減',
        // 編輯頁自己畫了表頭與動作列，通用表頭會把同一組標題再顯示一次
        hideHeader: true,
        // 主從式版面：主欄加 340px 側欄，1024px 會擠到側欄沒有呼吸空間
        contentWidth: '1120px',
      },
    },
    {
      // 本體論詳情頁（規格「本體論編輯規格」第 4 步）。前綴 `/ontology` 是這次新開的，
      // 站上其他路由都是單層（/articles、/projects、/graph），沒有前綴慣例可循——
      // 分成兩層是因為本體論後面還會長出清單與編輯頁（規格第 6、8 步），
      // 現在不分層之後就得把三種頁面平鋪在根目錄。
      //
      // **目前這兩頁只能用網址直接開**：本體論一覽還沒做，站上沒有任何連結指進來。
      // 這是規格的順序（先詳情後清單），不是漏掉的。
      path: '/ontology/scopes/:id',
      name: 'ontology-scope',
      component: () => import('@/views/OntologyScopeDetailView.vue'),
      meta: {
        tag: 'Ontology',
        title: '分類詳情',
        subtitle: '子類、兄弟、述詞定義與實體計數',
        hideHeader: true,
      },
    },
    {
      path: '/ontology/relations/:id',
      name: 'ontology-relation',
      component: () => import('@/views/OntologyRelationDetailView.vue'),
      meta: {
        tag: 'Ontology',
        title: '述詞詳情',
        subtitle: '使用這個述詞的邊，以及它為什麼被鎖定',
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
