<script setup lang="ts">
// 登入狀態顯示＋登出——D-56（Sanctum API token）落地後站上一直沒有任何地方
// 讓人看得出「已登入」或能登出，只有寫入路由背後悄悄擋著。跟 ThemeToggle
// 同一個角落、同一種樣式（圓角膠囊、10px、0.15em 字距），對應
// visual-design-language 的「一致性」跟 NN/g「系統狀態可見性」——不是新發明
// 一種按鈕語彙。
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      v-if="auth.isAuthenticated"
      class="text-[10px] font-mono tracking-[0.1em] text-(--text-nav-footer) opacity-60 truncate max-w-[100px]"
    >
      {{ auth.user?.name ?? auth.user?.email }}
    </span>
    <button
      v-if="auth.isAuthenticated"
      type="button"
      class="inline-flex items-center rounded-full border border-(--border-shelf) px-2.5 py-1 text-[10px] font-mono tracking-[0.15em] text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all"
      @click="handleLogout"
    >
      登出
    </button>
    <router-link
      v-else
      to="/login"
      class="inline-flex items-center rounded-full border border-(--border-shelf) px-2.5 py-1 text-[10px] font-mono tracking-[0.15em] text-(--text-nav-footer) opacity-70 hover:opacity-100 hover:text-(--text-nav-hover) transition-all"
    >
      登入
    </router-link>
  </div>
</template>
