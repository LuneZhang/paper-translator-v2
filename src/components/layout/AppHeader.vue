<script setup lang="ts">
import { useTranslationStore } from '@/stores/translation'
import { useDocumentStore } from '@/stores/document'
import IconButton from '@/components/common/IconButton.vue'

const translationStore = useTranslationStore()
const documentStore = useDocumentStore()

const emit = defineEmits<{
  'toggle-theme': []
  'open-settings': []
  'open-history': []
  'stop-translation': []
}>()
</script>

<template>
  <header
    class="flex items-center shrink-0 select-none"
    :style="{
      height: 'var(--header-height)',
      background: 'var(--color-bg-secondary)',
      borderBottom: '1px solid var(--color-border)',
      padding: '0 20px',
    }"
  >
    <!-- Left: Logo -->
    <div class="flex items-center gap-2.5">
      <div
        class="flex items-center justify-center"
        :style="{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-light)',
        }"
      >
        <svg
          width="18"
          height="18"
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
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      </div>
      <span
        class="font-semibold text-[15px] tracking-tight"
        :style="{ color: 'var(--color-text-primary)' }"
      >
        Paper Translator
      </span>

      <!-- File name badge (when document loaded) -->
      <span
        v-if="documentStore.hasDocument && documentStore.fileName"
        class="text-xs truncate max-w-[180px]"
        :style="{
          color: 'var(--color-text-tertiary)',
          background: 'var(--color-bg-tertiary)',
          padding: '2px 10px',
          borderRadius: 'var(--radius-full)',
        }"
      >
        {{ documentStore.fileName }}
      </span>
    </div>

    <!-- Center: Progress bar -->
    <div class="flex-1 flex items-center justify-center px-10">
      <div
        v-if="translationStore.isTranslating || translationStore.isPaused"
        class="flex items-center gap-3 w-full max-w-sm"
      >
        <div
          class="flex-1 h-[5px] rounded-full overflow-hidden"
          :style="{ background: 'var(--color-bg-tertiary)' }"
        >
          <div
            class="h-full rounded-full transition-all duration-500 ease-out progress-bar-active"
            :style="{
              width: `${translationStore.progressPercent}%`,
              background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))',
            }"
          />
        </div>
        <span
          class="text-xs font-medium tabular-nums shrink-0"
          :style="{ color: 'var(--color-text-secondary)' }"
        >
          {{ translationStore.progressPercent }}%
        </span>

        <!-- Stop translation button -->
        <IconButton
          title="停止翻译"
          size="sm"
          @click="emit('stop-translation')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </IconButton>
      </div>
    </div>

    <!-- Right: Action buttons -->
    <div class="flex items-center gap-0.5">
      <!-- Theme toggle -->
      <IconButton title="切换主题" @click="emit('toggle-theme')">
        <!-- Sun icon (light mode visible) -->
        <svg
          class="block dark:hidden"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <!-- Moon icon (dark mode visible) -->
        <svg
          class="hidden dark:block"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </IconButton>

      <!-- Settings -->
      <IconButton title="设置" @click="emit('open-settings')">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </IconButton>

      <!-- History -->
      <IconButton title="翻译历史" @click="emit('open-history')">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </IconButton>
    </div>
  </header>
</template>
