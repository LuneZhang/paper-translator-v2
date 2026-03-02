<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

const MIN_SIZE = 14
const MAX_SIZE = 24

const isMin = computed(() => settingsStore.fontSize <= MIN_SIZE)
const isMax = computed(() => settingsStore.fontSize >= MAX_SIZE)

function decrease() {
  if (!isMin.value) {
    settingsStore.setFontSize(settingsStore.fontSize - 1)
  }
}

function increase() {
  if (!isMax.value) {
    settingsStore.setFontSize(settingsStore.fontSize + 1)
  }
}
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-sm" style="color: var(--color-text-secondary)">字号</span>

    <div class="flex items-center gap-2">
      <!-- Decrease button -->
      <button
        class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        :style="{
          border: '1px solid var(--color-border)',
          color: isMin ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
          background: 'var(--color-bg-secondary)',
          cursor: isMin ? 'not-allowed' : 'pointer',
          opacity: isMin ? '0.5' : '1',
        }"
        :disabled="isMin"
        @click="decrease"
      >
        <span class="text-xs font-bold">A-</span>
      </button>

      <!-- Current size display -->
      <span
        class="text-sm font-medium tabular-nums w-10 text-center"
        style="color: var(--color-text-primary)"
      >
        {{ settingsStore.fontSize }}px
      </span>

      <!-- Increase button -->
      <button
        class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        :style="{
          border: '1px solid var(--color-border)',
          color: isMax ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
          background: 'var(--color-bg-secondary)',
          cursor: isMax ? 'not-allowed' : 'pointer',
          opacity: isMax ? '0.5' : '1',
        }"
        :disabled="isMax"
        @click="increase"
      >
        <span class="text-sm font-bold">A+</span>
      </button>
    </div>
  </div>
</template>
