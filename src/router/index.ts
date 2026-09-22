// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: {
        tag: 'Login',
        title: '登入',
        subtitle: 'Google／LINE 或 email 備援表單',
        hideHeader: true,
      },
    },
    {
      // 後端 TokenSocialAuthController 登入成功後導回這裡（token 放在
      // URL fragment）。不需要 meta.tag 這類頁面裝飾——使用者只會在這裡
      // 停留幾百毫秒，掛載完就被導走。
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/AuthCallbackView.vue'),
      meta: { hideHeader: true },
    },
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
        // 會看到草稿狀態、連去編輯頁——D-56 token 模式上線後才有意義擋，
        // 之前沒有登入機制，這條路由本來就沒有真的被保護過。
        requiresAuth: true,
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
        requiresAuth: true,
      },
    },
    {
      // 本體論詳情頁（規格「本體論編輯規格」第 4 步）。前綴 `/ontology` 是這次新開的，
      // 站上其他路由都是單層（/articles、/projects、/graph），沒有前綴慣例可循——
      // 分成兩層是因為本體論後面還會長出清單與編輯頁（規格第 6、8 步），
      // 現在不分層之後就得把三種頁面平鋪在根目錄。
      //
      // 一覽是規格第 6 步補上的。在它之前，詳情頁只能用網址直接開，站上沒有任何
      // 連結指進來——那是規格的順序（先詳情後清單），現在入口補上了。
      path: '/ontology/scopes',
      name: 'ontology-scopes',
      component: () => import('@/views/OntologyScopesView.vue'),
      meta: {
        tag: 'Ontology',
        title: '分類一覽',
        subtitle: '頂層分類與其子分類',
        hideHeader: true,
      },
    },
    {
      // 排在 `/ontology/scopes/:id` 前面。跟上面 `/articles/manage` 那條註解是同一個
      // 理由：靜態片段本來就排在動態片段之前，順序不影響比對結果，但排在前面才
      // 讀得出「new 不是某個分類的 id」。
      path: '/ontology/scopes/new',
      name: 'ontology-scope-new',
      component: () => import('@/views/OntologyScopeEditView.vue'),
      meta: {
        tag: 'Ontology',
        title: '新增分類',
        subtitle: '選一個頂層分類當父層',
        hideHeader: true,
        requiresAuth: true,
      },
    },
    {
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
      path: '/ontology/scopes/:id/edit',
      name: 'ontology-scope-edit',
      component: () => import('@/views/OntologyScopeEditView.vue'),
      meta: {
        tag: 'Ontology',
        title: '編輯分類',
        subtitle: '父類、子類號、名稱與說明',
        hideHeader: true,
        requiresAuth: true,
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

// Token 是記憶體狀態，開機/整頁重新整理後一定是未登入，這裡只做「有沒有
// token」的前端層級檢查——真正的權限判斷永遠在後端 Policy（見
// app/Policies），這道 guard 只是不讓使用者先看到一個註定會 401 的頁面。
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useAuthStore().isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router
