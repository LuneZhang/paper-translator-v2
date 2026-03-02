/**
 * Paragraph highlight composable.
 *
 * Thin wrapper around the translationStore's highlighted paragraph state,
 * providing a convenient per-paragraph `isHighlighted` check.
 */

import { computed } from 'vue'
import { useTranslationStore } from '@/stores/translation'

export function useParagraphHighlight() {
  const translationStore = useTranslationStore()

  const highlightedId = computed(() => translationStore.highlightedParagraphId)

  function highlightParagraph(id: string | null) {
    translationStore.setHighlightedParagraph(id)
  }

  function isHighlighted(id: string) {
    return computed(() => translationStore.highlightedParagraphId === id)
  }

  return {
    highlightedId,
    highlightParagraph,
    isHighlighted,
  }
}
