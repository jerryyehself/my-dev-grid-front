<script setup lang="ts">
// 登入狀態顯示＋登出——D-56（Sanctum API token）落地後站上一直沒有任何地方
// 讓人看得出「已登入」或能登出，只有寫入路由背後悄悄擋著。跟 ThemeToggle
// 同一個角落、同一種樣式（圓角膠囊、10px、0.15em 字距），對應
// visual-design-language 的「一致性」跟 NN/g「系統狀態可見性」——不是新發明
// 一種按鈕語彙。
//
// 沒登入時的「登入」按鈕只在本機開發（`npm run dev`）顯示：正式站上訪客永遠
// 登入不了，這顆按鈕只會讓人以為要有帳號才看得到完整內容（2026-09-30 使用者
// 決定，見 AuthOnly.vue）。作者自己從 /login 進，或直接開 /articles/manage，
// 路由守衛會先導去登入再帶回來。已登入的「使用者＋登出」照常顯示。
// Cloudflare 預覽網址目前也不顯示：後端 CORS 只放行正式網域，預覽版按了也登
// 不進去，等決定要不要放行預覽網域時再一起改這裡的條件。
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const auth = useAuthStore()
const router = useRouter()
const showLoginEntry = import.meta.env.DEV

// 三顆都是同一種膠囊，樣式集中在這裡，不要各寫一份再慢慢漂移
const pillClass =
  'inline-flex items-center rounded-full border border-(--border-shelf) px-2.5 py-1 text-[13px] tracking-[0.05em] text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all'

async function handleLogout() {
  await auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- 登入狀態＋登入的人（2026-10-03 使用者：「登入成功也要有狀態跟人員顯示」）。原本只有一行
         11px、60% 透明度的等寬字名字，看不出那是登入狀態，中文名字也低於 13px 的中文字級下限。
         黃銅圓點＋報讀器才唸的「已登入：」說明這是狀態；滑過去的 title 給完整名字（太長會截斷） -->
    <span
      v-if="auth.isAuthenticated"
      class="inline-flex items-center gap-1.5 min-w-0 max-w-[140px] text-[13px] tracking-[0.05em] text-(--text-nav-footer)"
      :title="`已登入：${auth.displayName}`"
      data-test="auth-user"
    >
      <span aria-hidden="true" class="w-2 h-2 shrink-0 rounded-full bg-(--accent-brass)" />
      <span class="sr-only">已登入：</span>
      <span class="truncate">{{ auth.displayName }}</span>
    </span>
    <!-- 後台入口（/admin）。跟登出一樣只在登入後出現，訪客看到的導覽列完全不變——
         理由同 AuthOnly.vue：訪客登入不了，看得到進不去的入口只會像網站沒做完。
         在 /admin 上時用導覽列 active 連結同一個顏色，表示「你在這裡」 -->
    <router-link
      v-if="auth.isAuthenticated"
      :to="{ name: 'admin' }"
      :class="pillClass"
      active-class="!text-(--text-nav-hover) !opacity-100"
    >
      管理
    </router-link>
    <button v-if="auth.isAuthenticated" type="button" :class="pillClass" @click="handleLogout">
      登出
    </button>
    <!-- 開機時正在用 refresh cookie 換回登入狀態（auth.restoring）就先什麼都不顯示，
         不要先閃一下「登入」再變成「使用者＋登出」 -->
    <router-link v-else-if="showLoginEntry && !auth.restoring" to="/login" :class="pillClass">
      登入
    </router-link>
  </div>
</template>
