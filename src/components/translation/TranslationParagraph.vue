<script setup lang="ts">
import { computed } from 'vue'
import type { TranslatedParagraph } from '@/types/translation'
import { useParagraphHighlight } from '@/composables/useParagraphHighlight'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'

const props = defineProps<{
  paragraph: TranslatedParagraph
}>()

const emit = defineEmits<{
  highlight: [id: string | null]
  retranslate: [id: string]
}>()

const { isHighlighted } = useParagraphHighlight()
const highlighted = isHighlighted(props.paragraph.id)

/**
 * Parse translatedText: split by <formula_N> placeholders and return an
 * array of { type: 'text' | 'formula', content: string } segments.
 */
interface Segment {
  type: 'text' | 'formula'
  content: string
}

const segments = computed<Segment[]>(() => {
  const text = props.paragraph.translatedText
  if (!text) return []

  const formulaMap = new Map(
    props.paragraph.formulas.map((f) => [f.placeholder, f.original]),
  )

  // Split by <formula_N> placeholders, keeping the delimiters
  const parts = text.split(/(<formula_\d+>)/g)
  const result: Segment[] = []

  for (const part of parts) {
    if (!part) continue
    const original = formulaMap.get(part)
    if (original !== undefined) {
      result.push({ type: 'formula', content: original })
    } else {
      result.push({ type: 'text', content: part })
    }
  }
  return result
})

function onMouseEnter() {
  emit('highlight', props.paragraph.id)
}

function onMouseLeave() {
  emit('highlight', null)
}

function onRetranslate() {
  emit('retranslate', props.paragraph.id)
}
</script>

<template>
  <div
    class="group relative py-3 px-4 select-text transition-colors duration-150"
    :style="{
      borderBottom: '1px solid var(--color-border-light)',
      background: highlighted ? 'var(--color-highlight)' : undefined,
    }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- Translating state -->
    <div v-if="paragraph.status === 'translating'" class="py-1">
      <SkeletonLoader :lines="2" compact />
    </div>

    <!-- Pending state -->
    <div
      v-else-if="paragraph.status === 'pending'"
      class="py-1"
    >
      <SkeletonLoader :lines="2" compact />
    </div>

    <!-- Error state -->
    <div
      v-else-if="paragraph.status === 'error'"
      class="flex items-center gap-2 text-sm"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        :style="{ color: 'var(--color-error)', flexShrink: 0 }"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span :style="{ color: 'var(--color-error)' }">翻译失败</span>
      <button
        class="ml-auto text-xs px-2 py-0.5 rounded cursor-pointer transition-colors"
        :style="{
          color: 'var(--color-accent)',
          background: 'var(--color-accent-light)',
        }"
        @click="onRetranslate"
      >
        重试
      </button>
    </div>

    <!-- Completed state -->
    <div v-else class="leading-relaxed">
      <template v-for="(seg, i) in segments" :key="i">
        <span v-if="seg.type === 'text'">{{ seg.content }}</span>
        <span v-else class="formula-inline">{{ seg.content }}</span>
      </template>
    </div>

    <!-- Retry icon — top-right, visible on hover only -->
    <button
      v-if="paragraph.status === 'completed'"
      class="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
      :style="{
        color: 'var(--color-text-tertiary)',
        background: 'var(--color-bg-tertiary)',
      }"
      title="重新翻译"
      @click.stop="onRetranslate"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </button>
  </div>
</template>
