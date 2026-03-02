<script setup lang="ts">
import { formatRelativeTime, truncateFileName } from '@/utils/format'

defineProps<{
  recentItems?: Array<{ fileName: string; translatedAt: number }>
}>()

const emit = defineEmits<{
  'select-file': []
  'open-history-item': [index: number]
}>()
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-10">
    <!-- Drop zone -->
    <div
      class="w-full max-w-lg flex flex-col items-center justify-center px-10 py-20 transition-all duration-200"
      :style="{
        background: 'var(--color-bg-secondary)',
        border: '2px dashed var(--color-border)',
        borderRadius: 'var(--radius-xl)',
      }"
    >
      <!-- Upload icon -->
      <div
        class="mb-5 flex items-center justify-center"
        :style="{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-accent-light)',
        }"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          :style="{ color: 'var(--color-accent)' }"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <polyline points="9 15 12 12 15 15" />
        </svg>
      </div>

      <p
        class="text-lg font-semibold"
        :style="{ color: 'var(--color-text-primary)' }"
      >
        拖拽 PDF 论文到此处
      </p>

      <p class="mt-2 text-sm">
        <span :style="{ color: 'var(--color-text-tertiary)' }">或 </span>
        <button
          class="cursor-pointer font-medium btn-press"
          :style="{
            color: 'var(--color-accent)',
            background: 'none',
            border: 'none',
            textDecoration: 'none',
            padding: 0,
          }"
          @click="emit('select-file')"
          @mouseenter="($event.target as HTMLElement).style.textDecoration = 'underline'"
          @mouseleave="($event.target as HTMLElement).style.textDecoration = 'none'"
        >
          点击选择文件
        </button>
      </p>

      <p
        class="mt-3 text-xs"
        :style="{ color: 'var(--color-text-tertiary)' }"
      >
        支持 .pdf 格式，最大 100MB
      </p>
    </div>

    <!-- Recent translations -->
    <div
      v-if="recentItems && recentItems.length > 0"
      class="w-full max-w-lg mt-10"
    >
      <h3
        class="text-xs font-semibold uppercase tracking-wider mb-3"
        :style="{ color: 'var(--color-text-tertiary)' }"
      >
        最近翻译
      </h3>

      <div
        class="overflow-hidden"
        :style="{
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-lg)',
        }"
      >
        <button
          v-for="(item, index) in recentItems.slice(0, 5)"
          :key="index"
          class="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors duration-150 cursor-pointer"
          :style="{
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: (index as number) < Math.min(recentItems!.length, 5) - 1 ? '1px solid var(--color-border-light)' : 'none',
          }"
          @click="emit('open-history-item', index)"
          @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--color-highlight)'"
          @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        >
          <!-- PDF icon -->
          <div
            class="shrink-0 flex items-center justify-center"
            :style="{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-tertiary)',
            }"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              :style="{ color: 'var(--color-text-tertiary)' }"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>

          <!-- File name -->
          <span
            class="flex-1 text-sm truncate font-medium"
            :style="{ color: 'var(--color-text-primary)' }"
          >
            {{ truncateFileName(item.fileName) }}
          </span>

          <!-- Relative time -->
          <span
            class="text-xs shrink-0"
            :style="{ color: 'var(--color-text-tertiary)' }"
          >
            {{ formatRelativeTime(item.translatedAt) }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
