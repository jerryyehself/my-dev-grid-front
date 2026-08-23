<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseTag from '@/components/BaseTag.vue'
import { projects } from '@/data/projects'

const selectedId = ref(projects[0]!.id)
const selected = computed(() => projects.find((p) => p.id === selectedId.value) ?? projects[0]!)
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] border border-(--border-shelf) rounded-xl overflow-hidden bg-(--bg-paper-light)">
    <div class="border-b md:border-b-0 md:border-r border-(--border-shelf)">
      <button
        v-for="proj in projects"
        :key="proj.id"
        type="button"
        class="w-full text-left px-4.5 py-4 border-b border-(--border-shelf) last:border-b-0 transition-colors cursor-pointer"
        :class="
          selectedId === proj.id
            ? 'bg-(--bg-folder) border-l-[3px] border-l-(--text-accent)'
            : 'border-l-[3px] border-l-transparent hover:bg-(--bg-folder)/60'
        "
        @click="selectedId = proj.id"
      >
        <div class="flex items-center justify-between mb-1.5 font-mono text-[10px] text-(--text-ink-muted)">
          <span>{{ proj.id }}</span>
          <BaseTag :tone="proj.statusType === 'active' ? 'accent' : 'muted'">
            {{ proj.status }}
          </BaseTag>
        </div>
        <div class="text-sm font-bold text-(--text-ink-main) leading-snug">
          {{ proj.title }}
        </div>
      </button>
    </div>

    <div class="p-6 sm:p-8">
      <div class="flex items-center justify-between mb-5 font-mono text-[10px] tracking-wider text-(--text-ink-muted)">
        <span>{{ selected.id }}</span>
        <BaseTag :tone="selected.statusType === 'active' ? 'accent' : 'muted'">
          {{ selected.status }}
        </BaseTag>
      </div>

      <h2 class="text-xl sm:text-2xl font-extrabold text-(--text-ink-main) mb-3.5">
        {{ selected.title }}
      </h2>

      <p v-if="selected.desc" class="text-sm sm:text-[15px] text-(--text-ink-body) leading-relaxed text-justify max-w-2xl mb-6">
        {{ selected.desc }}
      </p>

      <div class="flex flex-wrap gap-2 font-mono text-[11px] mb-6">
        <BaseTag v-for="tag in selected.tags" :key="tag">{{ tag }}</BaseTag>
      </div>

      <div class="pt-5 border-t border-(--border-shelf) grid grid-cols-3 gap-4">
        <div>
          <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Started</div>
          <div class="text-[13px] text-(--text-ink-main)">{{ selected.started }}</div>
        </div>
        <div>
          <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Role</div>
          <div class="text-[13px] text-(--text-ink-main)">{{ selected.role || '—' }}</div>
        </div>
        <div>
          <div class="font-mono text-[9px] tracking-[0.15em] uppercase text-(--text-ink-muted) mb-1">Repo</div>
          <a
            :href="`https://github.com/jerryyehself/${selected.repo}`"
            target="_blank"
            class="text-[13px] text-(--text-ink-main) hover:text-(--text-accent) hover:underline"
          >
            {{ selected.repo }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
