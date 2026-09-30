<script setup lang="ts">
// 寫入入口（管理／編輯／新增）只給登入的人看。站上只有作者一個人能寫，訪客永遠
// 登入不了——「看到按鈕、點進去才要求登入」是給訪客自己也能註冊的網站用的，放在
// 這裡對訪客只是一定碰壁的假入口，看起來像網站沒做完（2026-09-30 使用者決定）。
// 規則集中在這一個元件，各頁包起來就好，不要各自寫 v-if。這只是介面整理，真正擋
// 寫入的是後端 auth:sanctum 跟前端路由的 requiresAuth，兩者都不受影響。
import { useAuthStore } from '@/stores/useAuthStore'

const auth = useAuthStore()
</script>

<template>
  <slot v-if="auth.isAuthenticated" />
</template>
