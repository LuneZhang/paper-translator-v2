<script setup lang="ts">
/**
 * PdfPageNav — Compact floating page navigation bar.
 *
 * Displays previous/next buttons and an editable current-page input.
 * Positioned absolute at bottom-center of its parent container.
 */
import { ref, watch } from 'vue'

const props = defineProps<{
  currentPage: number
  totalPages: number
}>()

const emit = defineEmits<{
  navigate: [page: number]
}>()

// Local editable value (1-based display)
const inputValue = ref(String(props.currentPage + 1))

// Sync when prop changes externally
watch(
  () => props.currentPage,
  (page) => {
    inputValue.value = String(page + 1)
  },
)

const isFirstPage = () => props.currentPage <= 0
const isLastPage = () => props.currentPage >= props.totalPages - 1

function goToPrevious() {
  if (!isFirstPage()) {
    emit('navigate', props.currentPage - 1)
  }
}

function goToNext() {
  if (!isLastPage()) {
    emit('navigate', props.currentPage + 1)
  }
}

function onInputConfirm() {
  const parsed = parseInt(inputValue.value, 10)
  if (isNaN(parsed) || parsed < 1 || parsed > props.totalPages) {
    // Reset to current page
    inputValue.value = String(props.currentPage + 1)
    return
  }
  // Convert 1-based input to 0-based page index
  emit('navigate', parsed - 1)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    ;(e.target as HTMLInputElement).blur()
  }
}
</script>

<template>
  <div
    class="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 select-none"
    :style="{
      background: 'var(--color-bg-secondary)',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-full)',
      padding: '4px 14px',
    }"
  >
    <!-- Previous page -->
    <button
      :disabled="isFirstPage()"
      class="nav-btn"
      :class="{ 'nav-btn--disabled': isFirstPage() }"
      title="上一页"
      @click="goToPrevious"
    >
      <svg
        class="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
    </button>

    <!-- Page input / total -->
    <div
      class="flex items-center gap-1 text-sm"
      :style="{ color: 'var(--color-text-secondary)' }"
    >
      <input
        v-model="inputValue"
        type="text"
        class="nav-input"
        :style="{
          color: 'var(--color-text-primary)',
          background: 'var(--color-bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
        }"
        @blur="onInputConfirm"
        @keydown="onKeydown"
      />
      <span :style="{ color: 'var(--color-text-tertiary)' }">/</span>
      <span class="tabular-nums" :style="{ color: 'var(--color-text-tertiary)' }">
        {{ totalPages }}
      </span>
    </div>

    <!-- Next page -->
    <button
      :disabled="isLastPage()"
      class="nav-btn"
      :class="{ 'nav-btn--disabled': isLastPage() }"
      title="下一页"
      @click="goToNext"
    >
      <svg
        class="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) ease;
}

.nav-btn:hover:not(.nav-btn--disabled) {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.nav-btn:active:not(.nav-btn--disabled) {
  transform: scale(0.9);
}

.nav-btn--disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.nav-input {
  width: 44px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  outline: none;
  border: none;
  padding: 2px 4px;
  font-variant-numeric: tabular-nums;
  transition: box-shadow var(--duration-fast) ease;
}

.nav-input:focus {
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}
</style>
