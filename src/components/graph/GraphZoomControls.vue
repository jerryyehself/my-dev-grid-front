<script setup lang="ts">
// 圖譜畫布右下角的鏡頭按鈕（D-87）：放大、縮小、全部置中、操作說明。
// 慣例參考 MapLibre／React Flow 的控制列：縱向一欄、貼在右下角、不顯示縮放百分比。
// 每顆至少 44×44（WCAG 2.5.5），有 aria-label 與 aria-keyshortcuts；滑過或用鍵盤移到按鈕上時，
// 左邊浮出名稱跟快捷鍵（觸控裝置沒有 hover，名稱靠 aria-label 與「?」說明面板）。
defineProps<{
  disabled?: boolean
  helpOpen: boolean
}>()
defineEmits<{ zoomIn: []; zoomOut: []; fit: []; help: [] }>()
</script>

<template>
  <div
    class="flex flex-col rounded-lg border border-(--border-shelf) bg-(--bg-paper-light) shadow-[0_4px_14px_color-mix(in_srgb,var(--bg-nav-footer)_12%,transparent)] divide-y divide-(--border-shelf)"
  >
    <button
      v-for="btn in [
        { key: 'zoomIn', label: '放大', kbd: '+', shortcut: '+' },
        { key: 'zoomOut', label: '縮小', kbd: '−', shortcut: '-' },
        { key: 'fit', label: '全部置中', kbd: '0', shortcut: '0' },
        { key: 'help', label: '操作說明', kbd: '?', shortcut: '?' },
      ] as const"
      :key="btn.key"
      type="button"
      class="group relative w-11 h-11 flex items-center justify-center text-(--text-ink-main) cursor-pointer first:rounded-t-lg last:rounded-b-lg hover:bg-(--bg-folder) disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--text-accent)"
      :disabled="disabled && btn.key !== 'help'"
      :aria-label="btn.label"
      :aria-keyshortcuts="btn.shortcut"
      :aria-expanded="btn.key === 'help' ? helpOpen : undefined"
      @click="
        btn.key === 'zoomIn'
          ? $emit('zoomIn')
          : btn.key === 'zoomOut'
            ? $emit('zoomOut')
            : btn.key === 'fit'
              ? $emit('fit')
              : $emit('help')
      "
    >
      <svg v-if="btn.key === 'zoomIn'" aria-hidden="true" viewBox="0 0 20 20" class="w-5 h-5">
        <path
          d="M10 4v12M4 10h12"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
      <svg v-else-if="btn.key === 'zoomOut'" aria-hidden="true" viewBox="0 0 20 20" class="w-5 h-5">
        <path d="M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <!-- 全部置中：四個角的框線，地圖類工具常見的「符合畫面」圖示 -->
      <svg
        v-else-if="btn.key === 'fit'"
        aria-hidden="true"
        viewBox="0 0 20 20"
        class="w-5 h-5"
        fill="none"
      >
        <path
          d="M4 8V4h4M12 4h4v4M16 12v4h-4M8 16H4v-4"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span v-else aria-hidden="true" class="text-[17px] font-bold leading-none">?</span>

      <span
        aria-hidden="true"
        class="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:flex group-focus-visible:flex items-center gap-1.5 whitespace-nowrap rounded-md bg-(--text-ink-main) px-2 py-1 text-[13px] text-(--bg-paper-light)"
      >
        {{ btn.label }}
        <kbd class="font-mono text-[12px] rounded border border-current/40 px-1 leading-tight">{{
          btn.kbd
        }}</kbd>
      </span>
    </button>
  </div>
</template>
