<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const BREAKPOINT = 1024

const splitRatio = ref(0.5)
const isDragging = ref(false)
const isVertical = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const leftPaneRef = ref<HTMLElement | null>(null)
const rightPaneRef = ref<HTMLElement | null>(null)

// Responsive: detect narrow screen
function checkWidth() {
  isVertical.value = window.innerWidth < BREAKPOINT
}

onMounted(() => {
  checkWidth()
  window.addEventListener('resize', checkWidth)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkWidth)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})

// Drag handling — works in both orientations
function onMouseDown(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = isVertical.value ? 'row-resize' : 'col-resize'
  document.body.style.userSelect = 'none'
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  let ratio: number
  if (isVertical.value) {
    ratio = (e.clientY - rect.top) / rect.height
  } else {
    ratio = (e.clientX - rect.left) / rect.width
  }
  ratio = Math.max(0.25, Math.min(0.75, ratio))
  splitRatio.value = ratio
}

function onMouseUp() {
  isDragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Computed styles for orientation-aware layout
const containerClass = computed(() =>
  isVertical.value
    ? 'flex flex-col h-full min-h-0 overflow-hidden'
    : 'flex h-full min-h-0 overflow-hidden'
)

const topPaneStyle = computed(() =>
  isVertical.value
    ? { flexBasis: `${splitRatio.value * 100}%`, flexShrink: 0, flexGrow: 0 }
    : { flexBasis: `${splitRatio.value * 100}%`, flexShrink: 0, flexGrow: 0 }
)

defineExpose({
  leftPaneRef,
  rightPaneRef,
})
</script>

<template>
  <div
    ref="containerRef"
    :class="containerClass"
  >
    <!-- Top / Left pane -->
    <div
      ref="leftPaneRef"
      class="overflow-y-auto overflow-x-hidden min-w-0 min-h-0"
      :style="topPaneStyle"
    >
      <slot name="left" />
    </div>

    <!-- Divider -->
    <div
      class="divider-handle"
      :class="{
        'divider-handle--vertical': isVertical,
        'divider-handle--dragging': isDragging,
      }"
      @mousedown="onMouseDown"
    >
      <div class="divider-line" :class="{ 'divider-line--active': isDragging }" />
      <!-- Drag indicator dots -->
      <div class="divider-grip" :class="{ 'divider-grip--vertical': isVertical }">
        <span /><span /><span />
      </div>
    </div>

    <!-- Bottom / Right pane -->
    <div
      ref="rightPaneRef"
      class="overflow-y-auto overflow-x-hidden min-w-0 min-h-0 flex-1"
    >
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.divider-handle {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  transition: background var(--duration-fast) ease;
  z-index: 10;
}

.divider-handle:hover {
  background: var(--color-highlight);
}

.divider-handle--vertical {
  width: 100%;
  height: 8px;
  cursor: row-resize;
}

.divider-handle--dragging {
  background: var(--color-highlight);
}

.divider-line {
  position: absolute;
  background: var(--color-border);
  transition: background var(--duration-fast) ease;
}

.divider-handle:not(.divider-handle--vertical) .divider-line {
  width: 1px;
  height: 100%;
}

.divider-handle--vertical .divider-line {
  width: 100%;
  height: 1px;
}

.divider-line--active {
  background: var(--color-accent);
}

/* Grip dots */
.divider-grip {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  opacity: 0;
  transition: opacity var(--duration-normal) ease;
}

.divider-handle:hover .divider-grip,
.divider-handle--dragging .divider-grip {
  opacity: 1;
}

.divider-grip--vertical {
  flex-direction: row;
}

.divider-grip span {
  display: block;
  width: 3px;
  height: 3px;
  border-radius: var(--radius-full);
  background: var(--color-text-tertiary);
}
</style>
