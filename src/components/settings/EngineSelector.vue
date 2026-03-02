<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import type { TranslationEngine } from '@/types/translation'

const settingsStore = useSettingsStore()

interface EngineOption {
  value: TranslationEngine
  label: string
  subtitle: string
  recommended?: boolean
}

const engines: EngineOption[] = [
  {
    value: 'gemini-flash',
    label: 'Gemini 2.5 Flash',
    subtitle: '高质量翻译，100次/天',
    recommended: true,
  },
  {
    value: 'gemini-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    subtitle: '快速翻译，1000次/天',
  },
  {
    value: 'google-translate',
    label: 'Google Translate',
    subtitle: '备用方案，无需 API Key',
  },
]

function selectEngine(engine: TranslationEngine) {
  settingsStore.setEngine(engine)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <button
      v-for="option in engines"
      :key="option.value"
      class="flex items-start gap-3 p-3 rounded-lg text-left transition-all cursor-pointer"
      :style="{
        border: '1px solid ' + (settingsStore.engine === option.value ? 'var(--color-accent)' : 'var(--color-border)'),
        background: settingsStore.engine === option.value ? 'var(--color-accent-light)' : 'transparent',
      }"
      @click="selectEngine(option.value)"
    >
      <!-- Radio indicator -->
      <span
        class="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
        :style="{
          borderColor: settingsStore.engine === option.value ? 'var(--color-accent)' : 'var(--color-border)',
        }"
      >
        <span
          v-if="settingsStore.engine === option.value"
          class="w-2 h-2 rounded-full"
          style="background: var(--color-accent)"
        />
      </span>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span
            class="text-sm font-medium"
            style="color: var(--color-text-primary)"
          >
            {{ option.label }}
          </span>
          <span
            v-if="option.recommended"
            class="text-xs px-1.5 py-0.5 rounded font-medium"
            style="background: var(--color-accent-light); color: var(--color-accent)"
          >
            推荐
          </span>
        </div>
        <p class="text-xs mt-0.5" style="color: var(--color-text-tertiary)">
          {{ option.subtitle }}
        </p>
      </div>
    </button>
  </div>
</template>
