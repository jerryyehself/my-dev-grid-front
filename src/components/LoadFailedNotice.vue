<script setup lang="ts">
// 載入失敗、改用內建示範資料時的一行錯誤訊息（2026-10-02 站主決定：出錯照樣用示範資料頂替，
// 但要顯示錯誤）。訊息由 api/client.ts 的 describeLoadError() 產生，是給站主看的技術性說法
// （哪個請求、什麼狀態碼），所以 copy-language 的訪客用語規則不適用。字級 14px 是 D-68 的
// 句子下限；顏色用錯誤色，跟站上其他錯誤訊息一致。邊距由呼叫端用 class 加。
defineProps<{ message: string }>()
</script>

<template>
  <p role="alert" class="text-[14px] text-(--text-error)">{{ message }}</p>
</template>
