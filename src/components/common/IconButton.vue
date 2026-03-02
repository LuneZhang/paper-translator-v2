<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  active?: boolean
  size?: 'sm' | 'md'
  disabled?: boolean
}>(), {
  title: undefined,
  active: false,
  size: 'md',
  disabled: false,
})

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

function onClick(e: MouseEvent) {
  if (!props.disabled) {
    emit('click', e)
  }
}
</script>

<template>
  <button
    :title="props.title"
    :disabled="props.disabled"
    class="btn-icon"
    :class="[
      props.size === 'sm' ? 'btn-icon--sm' : 'btn-icon--md',
      {
        'btn-icon--disabled': props.disabled,
        'btn-icon--active': props.active,
      },
    ]"
    @click="onClick"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-text-secondary);
  background: transparent;
  transition: all var(--duration-fast) ease;
  position: relative;
  outline: none;
}

.btn-icon:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.btn-icon:active {
  transform: scale(0.92);
  background: var(--color-border-light);
}

.btn-icon:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent-subtle);
}

.btn-icon--sm {
  padding: 6px;
}

.btn-icon--md {
  padding: 8px;
}

.btn-icon--disabled {
  opacity: 0.35;
  pointer-events: none;
  cursor: not-allowed;
}

.btn-icon--active {
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.btn-icon--active:hover {
  background: var(--color-accent-subtle);
}
</style>
