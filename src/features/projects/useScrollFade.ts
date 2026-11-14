import { onBeforeUnmount, onMounted, ref, watch, nextTick, type Ref, type WatchSource } from 'vue'

/**
 * 捲動容器上下緣的淡出提示：上面還有內容（atTop 為 false）、下面還有內容（atBottom 為 false）。
 * 淡出本身是 CSS mask，這裡只負責判斷「現在要不要淡出」，所以沒有可捲動內容的時候兩邊都不淡。
 *
 * 容器跟掛載當下的直接子元素大小變了會自動重新量；子元素是之後才動態長出來的（列表依資料
 * 重畫），要靠呼叫端用 deps 指定哪些資料變了就重新量一次。
 */
export function useScrollFade(el: Ref<HTMLElement | undefined>, deps: WatchSource[] = []) {
  const atTop = ref(true)
  const atBottom = ref(true)

  function update() {
    const node = el.value
    if (!node) return
    atTop.value = node.scrollTop <= 0
    atBottom.value = node.scrollTop + node.clientHeight >= node.scrollHeight - 1
  }

  let observer: ResizeObserver | undefined
  onMounted(() => {
    const node = el.value
    if (!node) return
    node.addEventListener('scroll', update, { passive: true })
    // jsdom 沒有 ResizeObserver
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update)
      // 容器已經到 max-height 時，內容變多變少只有子元素的大小會變，容器本身不會
      observer.observe(node)
      for (const child of node.children) observer.observe(child)
    }
    update()
  })
  onBeforeUnmount(() => {
    el.value?.removeEventListener('scroll', update)
    observer?.disconnect()
  })

  watch(deps, () => nextTick(update), { flush: 'post' })

  return { atTop, atBottom, update }
}
