import { onMounted, ref } from 'vue'

/**
 * 網頁字型載完後加一，讓用到標籤寬度的 computed 重算一次。
 * 字型還沒載到時量到的是後備字型的寬度，載完不重排，底線長度會跟字對不上。
 */
export function useMindmapFonts() {
  const fontsVersion = ref(0)
  onMounted(() => {
    void document.fonts?.ready.then(() => {
      fontsVersion.value++
    })
  })
  return fontsVersion
}
