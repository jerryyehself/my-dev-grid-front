<script setup lang="ts">
// 內容結構沿用 my-dev-grid（Triple 後台）已經 mockup-fidelity 簽核過的登入頁
// （`resources/js/pages/AppLogin.vue`，direction B：品牌/情境說明 + Google/LINE
// OAuth 按鈕 + email/password 備援表單，2026-09-13 簽核，見
// my-dev-grid-skills/docs/design-artifacts.md「Triple 後台登入頁」列）——
// 這不是新設計，是同一組 v1 登入需求（decision-register.md D-34）在第二個
// repo 的實作，所以不重新畫一份 mockup，直接用這個專案既有的 Base* 元件
// 跟 CSS token 重建同樣的資訊結構。
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseCard from '@/components/BaseCard.vue'
import BaseField from '@/components/BaseField.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseHint from '@/components/BaseHint.vue'
import { useAuthStore } from '@/stores/useAuthStore'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const submitting = ref(false)

// OAuth 導向後端的 /auth/token/{provider}/redirect（routes/web.php，
// TokenSocialAuthController）——不是 /api 底下的路徑，所以要把
// VITE_API_BASE_URL 的 /api 去掉，換算回後端的網址根。
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api').replace(
  /\/api\/?$/,
  '',
)

function oauthRedirectUrl(provider: 'google' | 'line'): string {
  return `${API_ORIGIN}/auth/token/${provider}/redirect`
}

const authError = route.query.auth_error
  ? '登入未通過授權，請確認使用的是已綁定的帳號。'
  : ''

async function handleSubmit() {
  errorMessage.value = ''
  submitting.value = true
  try {
    const result = await auth.login(email.value, password.value)
    if (!result.ok) {
      errorMessage.value = result.message
      return
    }
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex justify-center py-12 px-4">
    <BaseCard variant="panel" class="w-full max-w-sm gap-6">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-bold text-(--text-ink-main)">登入</h1>
        <p class="text-sm text-(--text-ink-muted)">用 Google／LINE 帳號，或 email 備援表單。</p>
      </div>

      <BaseHint v-if="authError" class="text-red-700">{{ authError }}</BaseHint>

      <div class="flex flex-col gap-2">
        <a
          :href="oauthRedirectUrl('google')"
          class="flex items-center justify-center rounded-[6px] border border-(--border-shelf) bg-(--bg-paper-light) py-2.5 text-sm text-(--text-ink-main) hover:border-(--text-accent)/40 transition-all"
        >
          用 Google 登入
        </a>
        <a
          :href="oauthRedirectUrl('line')"
          class="flex items-center justify-center rounded-[6px] border border-(--border-shelf) bg-(--bg-paper-light) py-2.5 text-sm text-(--text-ink-main) hover:border-(--text-accent)/40 transition-all"
        >
          用 LINE 登入
        </a>
      </div>

      <div class="flex items-center gap-3 text-(--text-ink-muted) text-xs">
        <div class="h-px flex-1 bg-(--border-shelf)" />
        或
        <div class="h-px flex-1 bg-(--border-shelf)" />
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <BaseField label="Email">
          <BaseInput v-model="email" type="email" required autocomplete="email" />
        </BaseField>
        <BaseField label="密碼">
          <BaseInput v-model="password" type="password" required autocomplete="current-password" />
        </BaseField>
        <BaseHint v-if="errorMessage" class="text-red-700">{{ errorMessage }}</BaseHint>
        <BaseButton variant="primary" class="justify-center py-2.5" :disabled="submitting">
          {{ submitting ? '登入中…' : '登入' }}
        </BaseButton>
      </form>
    </BaseCard>
  </div>
</template>
