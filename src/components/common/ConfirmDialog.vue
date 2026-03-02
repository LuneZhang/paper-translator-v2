<script setup lang="ts">
const props = withDefaults(defineProps<{
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>(), {
  confirmText: '确认',
  cancelText: '取消',
  danger: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('cancel')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="props.show"
        class="fixed inset-0 z-50 flex items-center justify-center"
        :style="{ background: 'var(--color-overlay)', backdropFilter: 'blur(4px)' }"
        @click="onOverlayClick"
      >
        <Transition name="dialog-card" appear>
          <div
            v-if="props.show"
            class="w-full max-w-md mx-4 rounded-xl overflow-hidden"
            :style="{
              background: 'var(--color-bg-secondary)',
              boxShadow: 'var(--shadow-xl)',
            }"
          >
            <div class="px-6 pt-6 pb-2">
              <h3
                class="text-lg font-semibold"
                :style="{ color: 'var(--color-text-primary)' }"
              >
                {{ props.title }}
              </h3>
              <p
                class="mt-2 text-sm leading-relaxed"
                :style="{ color: 'var(--color-text-secondary)' }"
              >
                {{ props.message }}
              </p>
            </div>

            <div class="flex items-center justify-end gap-3 px-6 py-4">
              <button
                class="px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                :style="{
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                }"
                @mouseenter="($event.target as HTMLElement).style.background = 'var(--color-bg-tertiary)'"
                @mouseleave="($event.target as HTMLElement).style.background = 'transparent'"
                @click="emit('cancel')"
              >
                {{ props.cancelText }}
              </button>
              <button
                class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer"
                :style="{
                  background: props.danger ? 'var(--color-error)' : 'var(--color-accent)',
                }"
                @mouseenter="($event.target as HTMLElement).style.opacity = '0.85'"
                @mouseleave="($event.target as HTMLElement).style.opacity = '1'"
                @click="emit('confirm')"
              >
                {{ props.confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-card-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.dialog-card-leave-active {
  transition: all 0.15s ease;
}

.dialog-card-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.dialog-card-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
