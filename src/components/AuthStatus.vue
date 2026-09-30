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

async function handleLogout() {
  await auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      v-if="auth.isAuthenticated"
      class="text-[11px] font-mono tracking-[0.1em] text-(--text-nav-footer) opacity-60 truncate max-w-[100px]"
    >
      {{ auth.user?.name ?? auth.user?.email }}
    </span>
    <button
      v-if="auth.isAuthenticated"
      type="button"
      class="inline-flex items-center rounded-full border border-(--border-shelf) px-2.5 py-1 text-[13px] tracking-[0.05em] text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all"
      @click="handleLogout"
    >
      登出
    </button>
    <router-link
      v-else-if="showLoginEntry"
      to="/login"
      class="inline-flex items-center rounded-full border border-(--border-shelf) px-2.5 py-1 text-[13px] tracking-[0.05em] text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all"
    >
      登入
    </router-link>
  </div>
</template>
