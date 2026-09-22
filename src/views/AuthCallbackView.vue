<script setup lang="ts">
// OAuth 登入成功後，後端（TokenSocialAuthController）導回這裡，把 token
// 放在 URL fragment（`#token=...`）——fragment 不會被送到任何伺服器，
// 這支頁面掛載時讀出來、存進 authStore（記憶體），然後立刻把它從網址上
// 清掉（history.replaceState），不讓它留在瀏覽器歷史紀錄裡。
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseLoadingBlock from '@/components/BaseLoadingBlock.vue'
import { useAuthStore } from '@/stores/useAuthStore'

const router = useRouter()
const auth = useAuthStore()
const failed = ref(false)

onMounted(async () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const token = params.get('token')

  // 拿到 token 後立刻清掉網址上的 fragment，不管成功或失敗都不該留著。
  history.replaceState(null, '', window.location.pathname)

  if (!token) {
    failed.value = true
    return
  }

  await auth.setTokenFromOAuthCallback(token)
  router.replace('/')
})
</script>

<template>
  <div class="flex justify-center py-16">
    <BaseLoadingBlock v-if="!failed" height="120px">登入中…</BaseLoadingBlock>
    <p v-else class="text-sm text-(--text-ink-muted)">
      登入回呼缺少必要資訊，請
      <RouterLink to="/login" class="text-(--text-accent) underline">重新登入</RouterLink>。
    </p>
  </div>
</template>
