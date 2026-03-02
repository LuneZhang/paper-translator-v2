<script setup lang="ts">
const props = withDefaults(defineProps<{
  lines?: number
  compact?: boolean
}>(), {
  lines: 3,
  compact: false,
})

const widthPattern = ['100%', '85%', '70%', '90%', '60%']

function getWidth(index: number): string {
  return widthPattern[index % widthPattern.length]!
}
</script>

<template>
  <div :class="props.compact ? 'space-y-2' : 'space-y-3'">
    <div
      v-for="i in props.lines"
      :key="i"
      class="skeleton rounded"
      :class="props.compact ? 'h-3' : 'h-4'"
      :style="{ width: getWidth(i - 1) }"
    />
  </div>
</template>
