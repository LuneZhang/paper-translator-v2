<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getQuota } from '@/services/api'
import type { QuotaInfo } from '@/types/translation'

const quota = ref<QuotaInfo | null>(null)
const loading = ref(true)
const error = ref('')

let refreshTimer: ReturnType<typeof setInterval> | null = null

async function fetchQuota() {
  try {
    error.value = ''
    quota.value = await getQuota()
  } catch (e: any) {
    error.value = e.message || '获取配额失败'
  } finally {
    loading.value = false
  }
}

function getBarColor(used: number, limit: number): string {
  if (limit === 0) return 'var(--color-error)'
  const ratio = used / limit
  if (ratio >= 1) return 'var(--color-error)'
  if (ratio >= 0.9) return 'var(--color-warning)'
  return 'var(--color-accent)'
}

function getPercentage(used: number, limit: number): number {
  if (limit === 0) return 100
  return Math.min(100, (used / limit) * 100)
}

onMounted(() => {
  fetchQuota()
  refreshTimer = setInterval(fetchQuota, 60000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 2" :key="i">
        <div class="flex justify-between mb-1.5">
          <div
            class="h-3 w-24 rounded animate-pulse"
            style="background: var(--color-bg-tertiary)"
          />
          <div
            class="h-3 w-16 rounded animate-pulse"
            style="background: var(--color-bg-tertiary)"
          />
        </div>
        <div
          class="h-2 w-full rounded-full animate-pulse"
          style="background: var(--color-bg-tertiary)"
        />
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="text-sm py-2"
      style="color: var(--color-error)"
    >
      {{ error }}
      <button
        class="ml-2 underline cursor-pointer"
        style="color: var(--color-accent)"
        @click="loading = true; fetchQuota()"
      >
        重试
      </button>
    </div>

    <!-- Quota display -->
    <div v-else-if="quota" class="space-y-4">
      <!-- Flash quota -->
      <div>
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-sm font-medium" style="color: var(--color-text-primary)">
            Gemini Flash
          </span>
          <span class="text-xs tabular-nums" style="color: var(--color-text-tertiary)">
            {{ quota.flash.used }} / {{ quota.flash.limit }}
          </span>
        </div>
        <div class="h-2 w-full rounded-full" style="background: var(--color-bg-tertiary)">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{
              width: getPercentage(quota.flash.used, quota.flash.limit) + '%',
              background: getBarColor(quota.flash.used, quota.flash.limit),
            }"
          />
        </div>
      </div>

      <!-- Flash Lite quota -->
      <div>
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-sm font-medium" style="color: var(--color-text-primary)">
            Gemini Flash Lite
          </span>
          <span class="text-xs tabular-nums" style="color: var(--color-text-tertiary)">
            {{ quota.flashLite.used }} / {{ quota.flashLite.limit }}
          </span>
        </div>
        <div class="h-2 w-full rounded-full" style="background: var(--color-bg-tertiary)">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{
              width: getPercentage(quota.flashLite.used, quota.flashLite.limit) + '%',
              background: getBarColor(quota.flashLite.used, quota.flashLite.limit),
            }"
          />
        </div>
      </div>

      <!-- Reset hint -->
      <p class="text-xs" style="color: var(--color-text-tertiary)">
        每日零点重置
      </p>
    </div>
  </div>
</template>
