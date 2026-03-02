<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

const typeConfig: Record<string, { color: string; icon: string }> = {
  success: {
    color: '#10B981',
    icon: 'M9 12.75 11.25 15 15 9.75',
  },
  error: {
    color: '#EF4444',
    icon: 'M6 18 18 6M6 6l12 12',
  },
  info: {
    color: '#6366F1',
    icon: 'M12 9v3m0 3h.01',
  },
  warning: {
    color: '#F59E0B',
    icon: 'M12 9v3m0 3h.01',
  },
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2.5">
      <TransitionGroup
        name="toast"
        tag="div"
        class="flex flex-col-reverse gap-2.5"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :style="{
            '--toast-accent': typeConfig[toast.type]?.color ?? '#6366F1',
          }"
        >
          <!-- Icon -->
          <div class="toast-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <template v-if="toast.type === 'success'">
                <circle cx="12" cy="12" r="10" />
                <path :d="typeConfig['success']!.icon" />
              </template>
              <template v-else-if="toast.type === 'error'">
                <circle cx="12" cy="12" r="10" />
                <path :d="typeConfig['error']!.icon" />
              </template>
              <template v-else-if="toast.type === 'warning'">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <path :d="typeConfig['warning']!.icon" />
              </template>
              <template v-else>
                <circle cx="12" cy="12" r="10" />
                <path :d="typeConfig['info']!.icon" />
              </template>
            </svg>
          </div>

          <!-- Message -->
          <span class="toast-message">
            {{ toast.message }}
          </span>

          <!-- Close button -->
          <button
            class="toast-close"
            @click="remove(toast.id)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 340px;
  max-width: 500px;
  padding: 12px 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border-left: 3px solid var(--toast-accent);
}

.toast-icon {
  flex-shrink: 0;
  color: var(--toast-accent);
  display: flex;
  align-items: center;
}

.toast-message {
  flex: 1;
  font-size: 13px;
  line-height: 1.4;
  color: var(--color-text-primary);
}

.toast-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--duration-fast) ease;
}

.toast-close:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.toast-close:active {
  transform: scale(0.9);
}

.toast-enter-active {
  transition: all 0.3s var(--ease-out-expo);
}

.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from {
  transform: translateY(16px);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(60px);
  opacity: 0;
}

.toast-move {
  transition: transform 0.25s ease;
}
</style>
