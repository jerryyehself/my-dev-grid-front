<template>
  <div
    class="library-index-card w-full p-8 border border-(--border-shelf) rounded-2xl bg-(--bg-paper-light)/30 shadow-xs relative overflow-hidden group"
  >
    <div
      class="absolute inset-0 bg-[linear-gradient(to_bottom,var(--border-shelf)_1px,transparent_1px)] bg-[size:100%_2rem] opacity-[0.15] pointer-events-none"
    ></div>

    <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div
        class="lg:col-span-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-(--border-shelf) pb-6 lg:pb-0 lg:pr-8"
      >
        <div>
          <div class="flex items-center gap-1.5 mb-2">
            <span class="w-1.5 h-1.5 bg-(--text-accent) rounded-xs"></span>
            <span class="text-[10px] font-mono tracking-widest text-(--text-accent) uppercase"
              >Classification / 分類編目</span
            >
          </div>
          <h2 class="text-xl font-black text-(--text-ink-main) font-serif mb-1">
            SYSTEMATIC ONTOLOGY
          </h2>
        </div>

        <div class="mt-8 opacity-60 group-hover:opacity-100 transition-all duration-300">
          <div
            class="h-8 w-full bg-(--text-ink-main) relative"
            style="
              mask-image: repeating-linear-gradient(
                to right,
                black,
                black 2px,
                transparent 2px,
                transparent 6px
              );
              -webkit-mask-image: repeating-linear-gradient(
                to right,
                black,
                black 2px,
                transparent 2px,
                transparent 6px
              );
            "
          ></div>
          <div
            class="text-[9px] font-mono text-center mt-1 tracking-widest text-(--text-ink-muted)"
          >
            {{ sysRef }}
          </div>
        </div>
      </div>

      <div class="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
        <div
          v-for="(item, index) in metadata"
          :key="index"
          class="border-b border-dashed border-(--border-shelf) pb-2"
        >
          <dt
            class="text-[9px] font-mono tracking-wider text-(--text-ink-muted) opacity-70 uppercase mb-1"
          >
            {{ item.label }}
          </dt>
          <dd class="text-sm font-mono text-(--text-ink-main) font-bold flex items-center gap-2">
            {{ item.value }}
            <span
              v-if="item.subValue"
              class="text-[10px] text-(--text-accent) font-normal opacity-80"
              >{{ item.subValue }}</span
            >
          </dd>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  sysRef: string
  metadata: Array<{ label: string; value: string; subValue?: string }>
}>()
</script>
