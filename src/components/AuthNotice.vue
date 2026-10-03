<script setup lang="ts">
// 登入／登出結果的提示（2026-10-03 使用者：「登入成功與否要有提示」）。以前 Google 登入成功
// 只是安靜地回到首頁，失敗則是網址多一串 ?auth_error=not_authorized、畫面什麼都沒有。
//
// 放在畫面右下角（手機是底部整條）：不用知道導覽列多高，也不會蓋住頁面標題。成功的提示 5 秒
// 後自己消失；失敗的留著，等使用者按關閉——錯誤訊息自己消失的話，沒看到就不知道發生什麼事。
//
// 外層的 aria-live 區塊一直都在，裡面的文字換掉時螢幕報讀器才會唸出來（區塊跟文字同時出現
// 的話，很多報讀器不會唸）。
import { onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'

const SUCCESS_DISMISS_MS = 5000

const auth = useAuthStore()
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => auth.notice,
  (notice) => {
    clearTimeout(timer)
    if (notice?.tone === 'success') {
      timer = setTimeout(() => auth.setNotice(null), SUCCESS_DISMISS_MS)
    }
  },
  { immediate: true },
)

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div
    aria-live="polite"
    class="fixed z-50 bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm pointer-events-none"
  >
    <div
      v-if="auth.notice"
      :role="auth.notice.tone === 'error' ? 'alert' : 'status'"
      class="pointer-events-auto flex items-center gap-3 rounded-[6px] border bg-(--bg-paper-light) pl-4 pr-1 py-1 shadow-lg"
      :class="auth.notice.tone === 'error' ? 'border-(--text-error)' : 'border-(--border-shelf)'"
    >
      <span
        aria-hidden="true"
        class="text-[15px] leading-none"
        :class="auth.notice.tone === 'error' ? 'text-(--text-error)' : 'text-(--accent-brass)'"
        >{{ auth.notice.tone === 'error' ? '!' : '✓' }}</span
      >
      <span
        class="flex-1 text-[14px]"
        :class="auth.notice.tone === 'error' ? 'text-(--text-error)' : 'text-(--text-ink-main)'"
      >
        {{ auth.notice.text }}
      </span>
      <button
        type="button"
        aria-label="關閉提示"
        class="inline-flex items-center justify-center w-11 h-11 rounded-[6px] text-(--text-ink-muted) hover:text-(--text-ink-main) focus-visible:outline-2 focus-visible:outline-(--text-accent)"
        @click="auth.setNotice(null)"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" class="w-4 h-4" fill="none">
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
