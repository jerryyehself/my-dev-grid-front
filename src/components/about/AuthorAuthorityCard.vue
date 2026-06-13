<template>
  <div
    class="author-authority-card w-full p-6 border border-(--border-shelf)/80 rounded-md bg-(--bg-paper-light)/30 relative overflow-hidden font-sans text-xs tracking-wide text-(--text-ink-body) transition-shadow duration-300 hover:shadow-xs"
  >
    <div
      class="absolute inset-0 font-mono select-none pointer-events-none opacity-[0.03] dark:opacity-[0.015] z-0 overflow-hidden"
    >
      <span class="absolute right-8 top-2 text-7xl font-black">100</span>
      <span class="absolute left-1/3 top-24 text-8xl font-black">372</span>
      <span class="absolute right-12 bottom-16 text-8xl font-black">530</span>
    </div>

    <div
      class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-(--border-shelf)/40 pb-3 mb-6 text-[10px] font-mono text-(--text-ink-muted) select-none relative z-10"
    >
      <div class="flex items-center gap-1.5">
        <div class="w-1.5 h-1.5 bg-(--text-accent) rounded-xs"></div>
        <span class="tracking-widest font-bold uppercase text-(--text-accent)"
          >SYS_REGISTRY // IDENTITY_MATRIX</span
        >
      </div>
      <div class="font-mono opacity-80">
        REC_NO: <span class="text-(--text-ink-main) font-bold">AUTH_Y.903</span>
      </div>
    </div>

    <div class="relative z-10 flex flex-col sm:flex-row gap-6">
      <div
        class="flex flex-row sm:flex-col items-center sm:items-start shrink-0 w-full sm:w-28 gap-3 border-b sm:border-b-0 pb-4 sm:pb-0 border-(--border-shelf)/30"
      >
        <div
          class="flex flex-col font-mono text-[9px] text-(--text-ink-muted) leading-tight tracking-wider select-none"
        >
          <span class="font-bold text-(--text-accent)">[LOC_REF]</span>
          <span>QA_005.13</span>
          <span>Y34_2026</span>
        </div>

        <div
          class="w-16 h-22 sm:w-24 sm:h-32 border border-(--border-shelf)/60 bg-(--bg-folder)/20 rounded-xs p-0.5 ml-auto sm:ml-0 shadow-inner"
        >
          <div
            class="w-full h-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt="Author Portrait"
              class="w-full h-full object-cover grayscale contrast-115 brightness-95 opacity-90"
            />
            <div v-else class="text-[8px] font-mono text-(--text-ink-muted)/40">[ 375_IMG ]</div>
          </div>
        </div>
      </div>

      <div class="flex-1 space-y-6 w-full">
        <div class="relative pt-1">
          <span
            class="absolute -top-3.5 left-0 text-[8px] font-mono text-(--text-accent)/40 select-none font-bold"
            >#IDX_100</span
          >
          <div>
            <span
              class="text-xl sm:text-2xl font-black text-(--text-ink-main) tracking-tight block font-sans"
            >
              {{ name }}
            </span>
            <span class="text-xs font-mono text-(--text-ink-muted) ml-2">({{ birthYear }}-)</span>
            <div class="text-xs text-(--text-ink-muted) mt-1 font-medium tracking-wide">
              Full-Stack Web Developer
              <span class="text-(--border-shelf) font-light mx-1">/</span> System Archivist
            </div>
          </div>
        </div>

        <div class="relative border-t border-(--border-shelf)/30 pt-3">
          <span
            class="absolute -top-2 left-0 bg-(--bg-paper-light) pr-2 text-[8px] font-mono text-(--text-accent)/40 select-none font-bold"
            >#SYS_372</span
          >
          <div
            class="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-(--text-ink-main) font-bold tracking-wide"
          >
            <span>後端系統架構</span>
            <span>響應式前端流</span>
            <span>自動化數據管線</span>
          </div>
        </div>

        <div class="relative border-t border-(--border-shelf)/30 pt-3">
          <span
            class="absolute -top-2 left-0 bg-(--bg-paper-light) pr-2 text-[8px] font-mono text-(--text-accent)/40 select-none font-bold"
            >#SYS_373</span
          >
          <div class="text-xs text-(--text-ink-body) leading-relaxed tracking-wide">
            <span class="text-(--text-ink-main) font-bold">Laravel Framework</span>
            <span class="text-[11px] font-mono text-(--text-ink-muted) ml-1"
              >(v8/v9, Task Scheduling)</span
            >
            <span class="text-(--border-shelf) mx-2">/</span>
            <span class="text-(--text-ink-main) font-bold">Vue 3 & Nuxt Engine</span>
          </div>
        </div>

        <div class="relative border-t border-(--border-shelf)/30 pt-3">
          <span
            class="absolute -top-2 left-0 bg-(--bg-paper-light) pr-2 text-[8px] font-mono text-(--text-accent)/40 select-none font-bold"
            >#X_REF_530</span
          >
          <div class="flex flex-col gap-2 text-xs">
            <div
              @click="handleRegistryLookup('SYS_01')"
              class="cursor-pointer group/link flex items-center text-(--text-ink-body) hover:text-(--text-accent) transition-colors"
            >
              <span
                class="font-mono text-[9px] text-(--text-accent)/50 border border-(--text-accent)/20 px-1 py-0.5 rounded-xs mr-2 select-none group-hover/link:border-(--text-accent)/50"
                >sys_01</span
              >
              <span
                class="group-hover/link:underline font-bold tracking-wide text-(--text-ink-main) transition-colors group-hover/link:text-(--text-accent)"
                >工程履約管理系統
                <span class="text-[11px] text-(--text-ink-muted) font-normal"
                  >(多表非同步清理排程)</span
                ></span
              >
            </div>

            <div
              @click="handleRegistryLookup('APP_02')"
              class="cursor-pointer group/link flex items-center text-(--text-ink-body) hover:text-(--text-accent) transition-colors"
            >
              <span
                class="font-mono text-[9px] text-(--text-accent)/50 border border-(--text-accent)/20 px-1 py-0.5 rounded-xs mr-2 select-none group-hover/link:border-(--text-accent)/50"
                >app_02</span
              >
              <span
                class="group-hover/link:underline font-bold tracking-wide text-(--text-ink-main) transition-colors group-hover/link:text-(--text-accent)"
                >isbn-scanner
                <span class="text-[11px] text-(--text-ink-muted) font-normal"
                  >(Nuxt + GAS Serverless 編目)</span
                ></span
              >
            </div>

            <div
              @click="handleRegistryLookup('SANDBOX_03')"
              class="cursor-pointer group/link flex items-center text-(--text-ink-body) hover:text-(--text-accent) transition-colors"
            >
              <span
                class="font-mono text-[9px] text-(--text-accent)/50 border border-(--text-accent)/20 px-1 py-0.5 rounded-xs mr-2 select-none group-hover/link:border-(--text-accent)/50"
                >sdb_03</span
              >
              <span
                class="group-hover/link:underline font-bold tracking-wide text-(--text-ink-main) transition-colors group-hover/link:text-(--text-accent)"
                >黃金存摺數據觀測沙盒
                <span class="text-[11px] text-(--text-ink-muted) font-normal"
                  >(自動化牌價清洗)</span
                ></span
              >
            </div>
          </div>
        </div>

        <div class="relative border-t border-(--border-shelf)/30 pt-3">
          <span
            class="absolute -top-2 left-0 bg-(--bg-paper-light) pr-2 text-[8px] font-mono text-(--text-accent)/40 select-none font-bold"
            >#HIST_678</span
          >
          <div class="flex flex-col gap-1.5 w-full text-xs tracking-wide">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5">
              <span class="font-bold text-(--text-ink-main)">全端網頁工程師 / 系統重構主導</span>
              <span class="text-[10px] text-(--text-ink-muted) font-mono shrink-0 opacity-80"
                >2026.01 - PRESENT</span
              >
            </div>
            <div
              class="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5 text-(--text-ink-body)"
            >
              <span class="font-medium">資訊工程學系 (Computer Science & Engineering)</span>
              <span class="text-[10px] text-(--text-ink-muted) font-mono shrink-0 opacity-80"
                >B.S. DEGREE</span
              >
            </div>
          </div>
        </div>

        <div class="relative border-t border-(--border-shelf)/30 pt-3">
          <span
            class="absolute -top-2 left-0 bg-(--bg-paper-light) pr-2 text-[8px] font-mono text-(--text-accent)/40 select-none font-bold"
            >#NOTE_670</span
          >
          <div
            class="font-serif italic text-sm sm:text-[13px] text-(--text-ink-main) opacity-95 leading-relaxed text-justify pr-2 sm:pr-4"
          >
            “凡是具有邏輯規則的重複性工作，皆應被程式化自動清理；凡是存在波動的外部數據，皆能編目為觀測沙盒。”
          </div>
        </div>
      </div>
    </div>

    <div
      class="absolute bottom-3 right-4 w-2 h-2 rounded-full bg-(--border-shelf)/30 opacity-30"
    ></div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  name: string
  birthYear: string
  avatarUrl?: string
}>()

const emit = defineEmits<{
  (e: 'lookup', indexRef: string): void
}>()

const handleRegistryLookup = (indexRef: string) => {
  emit('lookup', indexRef)
  const targetElement = document.getElementById(indexRef)
  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    targetElement.classList.add('animate-pulse', 'border-(--text-accent)')
    setTimeout(() => {
      targetElement.classList.remove('animate-pulse', 'border-(--text-accent)')
    }, 2000)
  }
}
</script>
