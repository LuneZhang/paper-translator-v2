<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

const engineLabels: Record<string, string> = {
  'gemini-flash': 'Gemini Flash',
  'gemini-flash-lite': 'Gemini Flash-Lite',
  'google-translate': 'Google Translate',
}
</script>

<template>
  <footer
    class="flex items-center justify-between shrink-0 select-none"
    :style="{
      height: 'var(--footer-height)',
      padding: '0 20px',
      background: 'var(--color-bg-secondary)',
      borderTop: '1px solid var(--color-border)',
    }"
  >
    <!-- Left: Powered by -->
    <span
      class="text-[11px] tracking-wide"
      :style="{ color: 'var(--color-text-tertiary)' }"
    >
      Powered by Gemini AI
    </span>

    <!-- Right: Engine info -->
    <div class="flex items-center gap-2">
      <span
        class="text-[11px] tabular-nums"
        :style="{
          color: 'var(--color-accent)',
          background: 'var(--color-accent-light)',
          padding: '1px 8px',
          borderRadius: 'var(--radius-full)',
        }"
      >
        {{ engineLabels[settingsStore.engine] || settingsStore.engine }}
      </span>
    </div>
  </footer>
</template>
